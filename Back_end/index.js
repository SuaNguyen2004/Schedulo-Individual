const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_REGISTRATION_DAYS = 60;
const MAX_REGISTRATION_DAYS = 180;
const imageDirectory = path.join(__dirname, "image");
const cvDirectory = path.join(__dirname, "CV");
fs.mkdirSync(imageDirectory, { recursive: true });
fs.mkdirSync(cvDirectory, { recursive: true });
const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "schedule",
    waitForConnections: true,
    connectionLimit: 10,
    charset: "utf8mb4",
    // Return DATE/DATETIME as plain strings so no implicit UTC conversion can
    // shift a work_date by one day when the server runs in a non-UTC timezone.
    dateStrings: true,
});

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000" }));
app.use(express.json({ limit: "50mb" }));
app.use("/image", express.static(imageDirectory));
app.use("/CV", express.static(cvDirectory));

app.get("/", (_req, res) => {
    res.send("Schedulo API is running. Open the Frontend at http://localhost:3001.");
});

app.get("/api/health", async (_req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({ status: "ok", database: "connected" });
    } catch (error) {
        res.status(503).json({ status: "error", database: "disconnected", message: error.message });
    }
});

app.post("/api/auth/login", async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !password) {
        return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu." });
    }

    try {
        const [rows] = await pool.execute(
            `SELECT u.id, u.email, u.password_hash, u.role, u.status, p.full_name
             FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
             WHERE u.email = ? LIMIT 1`,
            [email],
        );
        const user = rows[0];
        const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false;
        const userStatus = user ? String(user.status).toLowerCase() : "";
        const userRole = user ? String(user.role).toLowerCase() : "";

        if (!user || !passwordMatches) {
            return res.status(401).json({ message: "Email hoặc mật khẩu không chính xác." });
        }
        if (userStatus === "disabled") {
            return res
                .status(403)
                .json({
                    message: "Tài khoản đã bị vô hiệu hoá. Vui lòng liên hệ Admin để được hỗ trợ.",
                    disabled: true,
                });
        }
        if (userStatus === "pending") {
            return res
                .status(403)
                .json({
                    message: "Tài khoản của bạn đang chờ xét duyệt. Vui lòng liên hệ Admin để được hỗ trợ.",
                    pending: true,
                });
        }
        if (userStatus !== "active") {
            return res.status(401).json({ message: "Email hoặc mật khẩu không chính xác." });
        }

        return res.json({
            id: String(user.id),
            name: user.full_name || "",
            email: user.email,
            role: userRole === "admin" ? "ADMIN" : "CTV",
            status: "ACTIVE",
        });
    } catch (error) {
        return res.status(500).json({ message: "Không thể xác thực tài khoản.", detail: error.message });
    }
});

app.post("/api/auth/register", async (req, res) => {
    const { name, email, phone, dob, password, attachments = [] } = req.body || {};
    if (![name, email, phone, password].every((value) => typeof value === "string" && value.trim())) {
        return res.status(400).json({ message: "Vui lòng nhập đủ họ tên, email, số điện thoại và mật khẩu." });
    }
    if (!dob || typeof dob !== "string" || !dob.trim()) {
        return res.status(400).json({ message: "Vui lòng chọn ngày sinh." });
    }
    const hasIdFront = attachments.some((a) => a.fileType === "ID_CARD_FRONT" && a.filePath);
    const hasIdBack = attachments.some((a) => a.fileType === "ID_CARD_BACK" && a.filePath);
    const hasCv = attachments.some((a) => a.fileType === "CV" && a.filePath);
    if (!hasIdFront || !hasIdBack) {
        return res.status(400).json({ message: "Vui lòng tải ảnh CCCD mặt trước và mặt sau." });
    }
    if (!hasCv) {
        return res.status(400).json({ message: "Vui lòng tải file CV lên." });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const normalizedEmail = email.trim();
        const normalizedPhone = phone.trim();

        // users.email is UNIQUE, and a rejected application is the one case where that
        // row does not represent a usable account: the applicant never got past review,
        // so the email must be free again. Reuse the row instead of inserting a
        // duplicate — that is what previously raised ER_DUP_ENTRY and surfaced as
        // "Email hoặc số điện thoại đã được sử dụng". Reusing the same row also releases
        // the old phone number, since the profile is overwritten in place.
        const [existingUsers] = await connection.execute(
            "SELECT id, status FROM users WHERE email = ? FOR UPDATE",
            [normalizedEmail],
        );
        const existingUser = existingUsers[0];
        const rejectedUser = existingUser && existingUser.status === "rejected" ? existingUser : null;

        if (existingUser && !rejectedUser) {
            await connection.rollback();
            return res.status(409).json({ message: "Email này đã được sử dụng." });
        }

        const [existingPhones] = await connection.execute(
            `SELECT up.user_id, u.status 
             FROM user_profiles up
             JOIN users u ON u.id = up.user_id
             WHERE up.phone = ? FOR UPDATE`,
            [normalizedPhone],
        );
        const existingPhone = existingPhones[0];
        const isSameRejectedUser =
            rejectedUser && existingPhone && String(existingPhone.user_id) === String(rejectedUser.id);
        const phoneOwnerIsActiveOrPending = existingPhone && existingPhone.status !== "rejected";

        if (existingPhone && !isSameRejectedUser && phoneOwnerIsActiveOrPending) {
            await connection.rollback();
            return res.status(409).json({ message: "Số điện thoại này đã được sử dụng." });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        // Save attachments to disk (still returns /image and /CV public paths)
        let idCardFrontUrl = null;
        let idCardBackUrl = null;
        let cvUrl = null;
        for (const attachment of Array.isArray(attachments) ? attachments : []) {
            if (!attachment?.fileType || !attachment?.filePath) continue;
            const stored = await saveAttachment(attachment, name.trim());
            if (attachment.fileType === "ID_CARD_FRONT") idCardFrontUrl = stored.filePath;
            else if (attachment.fileType === "ID_CARD_BACK") idCardBackUrl = stored.filePath;
            else if (attachment.fileType === "CV") cvUrl = stored.filePath;
        }

        let userId;
        if (rejectedUser) {
            // Re-open the record as a brand new submission: drop the previous review
            // verdict and re-stamp created_at so the admin queue shows this application's
            // own date instead of the rejected one's.
            await connection.execute(
                `UPDATE users
                 SET password_hash = ?, role = 'collaborator', status = 'pending', admin_note = NULL,
                     approved_by = NULL, approved_at = NULL, created_at = NOW(), updated_at = NOW()
                 WHERE id = ?`,
                [passwordHash, rejectedUser.id],
            );
            userId = rejectedUser.id;
        } else {
            const [result] = await connection.execute(
                "INSERT INTO users (email, password_hash, role, status) VALUES (?, ?, 'collaborator', 'pending')",
                [normalizedEmail, passwordHash],
            );
            userId = result.insertId;
        }

        // user_profiles.user_id is UNIQUE, so one upsert covers both a first-time
        // applicant and a re-applicant whose profile row already exists. COALESCE keeps
        // a previously uploaded file when the new submission does not re-attach it.
        await connection.execute(
            `INSERT INTO user_profiles
                (user_id, full_name, phone, date_of_birth, id_card_front_url, id_card_back_url, cv_url)
             VALUES (?, ?, ?, ?, ?, ?, ?) AS incoming
             ON DUPLICATE KEY UPDATE
                full_name = incoming.full_name,
                phone = incoming.phone,
                date_of_birth = incoming.date_of_birth,
                id_card_front_url = COALESCE(incoming.id_card_front_url, user_profiles.id_card_front_url),
                id_card_back_url = COALESCE(incoming.id_card_back_url, user_profiles.id_card_back_url),
                cv_url = COALESCE(incoming.cv_url, user_profiles.cv_url)`,
            [userId, name.trim(), normalizedPhone, parseDate(dob), idCardFrontUrl, idCardBackUrl, cvUrl],
        );

        await connection.commit();
        return res.status(201).json({ id: String(userId), status: "PENDING" });
    } catch (error) {
        await connection.rollback();
        if (error.code === "ER_DUP_ENTRY") {
            // Only users.email is unique among the columns written here, so this is a
            // concurrent submission for the same email.
            return res.status(409).json({ message: "Email này đã được sử dụng." });
        }
        return res.status(500).json({ message: "Không thể lưu yêu cầu đăng ký.", detail: error.message });
    } finally {
        connection.release();
    }
});

app.patch("/api/registration-requests/:id/approve", async (req, res) => {
    return reviewRegistrationRequest(req, res, "ACTIVE", "APPROVE_REGISTRATION");
});

app.patch("/api/registration-requests/:id/reject", async (req, res) => {
    return reviewRegistrationRequest(req, res, "REJECTED", "REJECT_REGISTRATION");
});

app.patch("/api/auth/reset-password", async (req, res) => {
    const { userId, newPassword } = req.body || {};
    if (!userId || typeof newPassword !== "string") {
        return res.status(400).json({ message: "Thiếu thông tin cần thiết." });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự." });
    }
    try {
        const newHash = await bcrypt.hash(newPassword, 12);
        const [result] = await pool.execute("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?", [
            newHash,
            String(userId),
        ]);
        if (result.affectedRows !== 1) {
            return res.status(404).json({ message: "Tài khoản không tồn tại." });
        }
        return res.json({ message: "Đặt lại mật khẩu thành công." });
    } catch (error) {
        return res.status(500).json({ message: "Không thể đặt lại mật khẩu.", detail: error.message });
    }
});

app.patch("/api/auth/change-password", async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body || {};
    if (!userId || typeof oldPassword !== "string" || typeof newPassword !== "string") {
        return res.status(400).json({ message: "Thiếu thông tin cần thiết." });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự." });
    }
    try {
        const [rows] = await pool.execute("SELECT id, password_hash FROM users WHERE id = ? LIMIT 1", [String(userId)]);
        const user = rows[0];
        if (!user) {
            return res.status(404).json({ message: "Tài khoản không tồn tại." });
        }
        const match = await bcrypt.compare(oldPassword, user.password_hash);
        if (!match) {
            return res.status(401).json({ message: "Mật khẩu hiện tại không chính xác." });
        }
        const newHash = await bcrypt.hash(newPassword, 12);
        await pool.execute("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?", [
            newHash,
            String(userId),
        ]);
        return res.json({ message: "Đổi mật khẩu thành công." });
    } catch (error) {
        return res.status(500).json({ message: "Không thể đổi mật khẩu.", detail: error.message });
    }
});

app.patch("/api/profile", async (req, res) => {
    const { userId, name, email, phone, dob, avatar, cccdFront, cccdBack, cvFile, cvFileName } = req.body || {};
    if (!userId) {
        return res.status(400).json({ message: "Thiếu thông tin người dùng." });
    }
    try {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            let userName = name || "";
            if (!userName) {
                const [existing] = await connection.execute(
                    "SELECT full_name FROM user_profiles WHERE user_id = ?",
                    [String(userId)],
                );
                if (existing && existing[0] && existing[0].full_name) {
                    userName = existing[0].full_name;
                }
            }

            if (email && typeof email === "string" && email.trim()) {
                const [existingEmail] = await connection.execute(
                    "SELECT id FROM users WHERE email = ? AND id != ?",
                    [email.trim(), String(userId)],
                );
                if (existingEmail.length > 0) {
                    await connection.rollback();
                    return res.status(409).json({ message: "Email này đã được tài khoản khác sử dụng." });
                }
                await connection.execute("UPDATE users SET email = ?, updated_at = NOW() WHERE id = ?", [
                    email.trim(),
                    String(userId),
                ]);
            }

            if (phone !== undefined && typeof phone === "string" && phone.trim()) {
                const [existingPhone] = await connection.execute(
                    `SELECT up.user_id 
                     FROM user_profiles up 
                     JOIN users u ON u.id = up.user_id 
                     WHERE up.phone = ? AND up.user_id != ? AND u.status != 'rejected'`,
                    [phone.trim(), String(userId)],
                );
                if (existingPhone.length > 0) {
                    await connection.rollback();
                    return res.status(409).json({ message: "Số điện thoại này đã được đăng ký bởi tài khoản khác." });
                }
            }

            const fileUpdates = {};
            if (avatar !== undefined) {
                if (avatar) {
                    const result = await saveAttachment(
                        { fileType: "AVATAR", fileName: "avatar", filePath: avatar },
                        userName,
                        String(userId),
                    );
                    fileUpdates.avatar_url = result.filePath;
                } else {
                    fileUpdates.avatar_url = "";
                }
            }
            if (cccdFront !== undefined) {
                if (cccdFront) {
                    const result = await saveAttachment(
                        { fileType: "ID_CARD_FRONT", fileName: "cccd-front", filePath: cccdFront },
                        userName,
                        String(userId),
                    );
                    fileUpdates.id_card_front_url = result.filePath;
                } else {
                    fileUpdates.id_card_front_url = "";
                }
            }
            if (cccdBack !== undefined) {
                if (cccdBack) {
                    const result = await saveAttachment(
                        { fileType: "ID_CARD_BACK", fileName: "cccd-back", filePath: cccdBack },
                        userName,
                        String(userId),
                    );
                    fileUpdates.id_card_back_url = result.filePath;
                } else {
                    fileUpdates.id_card_back_url = "";
                }
            }
            if (cvFile !== undefined) {
                if (cvFile) {
                    const result = await saveAttachment(
                        { fileType: "CV", fileName: cvFileName || "cv", filePath: cvFile },
                        userName,
                        String(userId),
                    );
                    fileUpdates.cv_url = result.filePath;
                } else {
                    fileUpdates.cv_url = "";
                }
            }

            const setClauses = [];
            const onDupVals = [];

            if (name !== undefined) {
                setClauses.push("full_name = ?");
                onDupVals.push(name || "");
            }
            if (phone !== undefined) {
                setClauses.push("phone = ?");
                onDupVals.push(phone || "");
            }
            if (dob !== undefined) {
                setClauses.push("date_of_birth = ?");
                onDupVals.push(parseDate(dob) || null);
            }

            if (fileUpdates.avatar_url !== undefined) {
                setClauses.push("avatar_url = ?");
                onDupVals.push(fileUpdates.avatar_url);
            }
            if (fileUpdates.id_card_front_url !== undefined) {
                setClauses.push("id_card_front_url = ?");
                onDupVals.push(fileUpdates.id_card_front_url);
            }
            if (fileUpdates.id_card_back_url !== undefined) {
                setClauses.push("id_card_back_url = ?");
                onDupVals.push(fileUpdates.id_card_back_url);
            }
            if (fileUpdates.cv_url !== undefined) {
                setClauses.push("cv_url = ?");
                onDupVals.push(fileUpdates.cv_url);
            }

            if (setClauses.length > 0) {
                const hasTextFields = name !== undefined || phone !== undefined || dob !== undefined;
                if (hasTextFields) {
                    const insertCols = ["user_id", "full_name", "phone", "date_of_birth"];
                    const insertVals = [String(userId), name || "", phone || "", parseDate(dob) || null];
                    const fileInsertCols = [];
                    const fileInsertVals = [];
                    if (fileUpdates.avatar_url !== undefined) {
                        fileInsertCols.push("avatar_url");
                        fileInsertVals.push(fileUpdates.avatar_url);
                    }
                    if (fileUpdates.id_card_front_url !== undefined) {
                        fileInsertCols.push("id_card_front_url");
                        fileInsertVals.push(fileUpdates.id_card_front_url);
                    }
                    if (fileUpdates.id_card_back_url !== undefined) {
                        fileInsertCols.push("id_card_back_url");
                        fileInsertVals.push(fileUpdates.id_card_back_url);
                    }
                    if (fileUpdates.cv_url !== undefined) {
                        fileInsertCols.push("cv_url");
                        fileInsertVals.push(fileUpdates.cv_url);
                    }
                    const allCols = [...insertCols, ...fileInsertCols];
                    const allVals = [...insertVals, ...fileInsertVals];
                    const placeholders = allCols.map(() => "?").join(", ");
                    await connection.execute(
                        `INSERT INTO user_profiles (${allCols.join(", ")}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${setClauses.join(", ")}`,
                        [...allVals, ...onDupVals],
                    );
                } else {
                    await connection.execute(`UPDATE user_profiles SET ${setClauses.join(", ")} WHERE user_id = ?`, [
                        ...onDupVals,
                        String(userId),
                    ]);
                }
            }

            await connection.commit();

            const returnedFiles = {};
            if (fileUpdates.avatar_url !== undefined) returnedFiles.avatar = fileUpdates.avatar_url;
            if (fileUpdates.id_card_front_url !== undefined) returnedFiles.cccdFront = fileUpdates.id_card_front_url;
            if (fileUpdates.id_card_back_url !== undefined) returnedFiles.cccdBack = fileUpdates.id_card_back_url;
            if (fileUpdates.cv_url !== undefined) returnedFiles.cvFile = fileUpdates.cv_url;

            return res.json({ message: "Cập nhật hồ sơ thành công.", ...returnedFiles });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (error) {
        return res.status(500).json({ message: "Không thể cập nhật hồ sơ.", detail: error.message });
    }
});

app.patch("/api/admin/notes", async (req, res) => {
    const { userId, notes } = req.body || {};
    if (!userId) {
        return res.status(400).json({ message: "Thiếu userId." });
    }
    try {
        await pool.execute("UPDATE users SET admin_note = ?, updated_at = NOW() WHERE id = ?", [
            notes || null,
            String(userId),
        ]);
        return res.json({ message: "Đã lưu ghi chú." });
    } catch (error) {
        return res.status(500).json({ message: "Không thể lưu ghi chú.", detail: error.message });
    }
});

app.patch("/api/users/:id/status", async (req, res) => {
    const userId = Number(req.params.id);
    const { status } = req.body || {};
    if (!Number.isInteger(userId) || !["active", "disabled"].includes(status)) {
        return res.status(400).json({ message: "Dữ liệu không hợp lệ." });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [result] = await connection.execute(
            "UPDATE users SET status = ?, updated_at = NOW() WHERE id = ? AND role = 'collaborator'",
            [status, userId],
        );
        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Không tìm thấy tài khoản Collaborator." });
        }

        if (status === "disabled") {
            await promoteElapsedSchedulesToHistory(connection, userId);
            await connection.execute("DELETE FROM work_schedules WHERE user_id = ?", [
                userId,
            ]);
        }

        await connection.commit();
        return res.json({ id: String(userId), status });
    } catch (error) {
        try {
            await connection.rollback();
        } catch (_) {}
        return res.status(500).json({ message: "Không thể cập nhật trạng thái.", detail: error.message });
    } finally {
        connection.release();
    }
});

app.delete("/api/users/:id", async (req, res) => {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) {
        return res.status(400).json({ message: "Dữ liệu không hợp lệ." });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Only allow deleting collaborator accounts, never the admin.
        const [target] = await connection.execute(
            "SELECT id, role FROM users WHERE id = ? LIMIT 1",
            [userId],
        );
        if (target.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Không tìm thấy tài khoản." });
        }
        if (target[0].role !== "collaborator") {
            await connection.rollback();
            return res.status(400).json({ message: "Không thể xóa tài khoản Admin." });
        }

        // Foreign keys on user_profiles, work_schedules and work_history all use
        // ON DELETE CASCADE, so removing the users row deletes the profile, the
        // weekly schedule and the work history together.
        await connection.execute("DELETE FROM users WHERE id = ?", [userId]);

        await connection.commit();
        return res.json({ id: String(userId), deleted: true });
    } catch (error) {
        try {
            await connection.rollback();
        } catch (_) {}
        return res.status(500).json({ message: "Không thể xóa tài khoản.", detail: error.message });
    } finally {
        connection.release();
    }
});

app.post("/api/shifts/register", async (req, res) => {
    const { userId, registrations } = req.body;

    if (!userId || !Array.isArray(registrations)) {
        return res.status(400).json({
            message: "Dữ liệu không hợp lệ. Cần userId và mảng registrations.",
        });
    }

    // Deduplicate weekly pattern entries sent by the frontend.
    const uniquePattern = [];
    const seen = new Set();
    for (const reg of registrations) {
        const dayOfWeek = Number(reg?.dayOfWeek); // 0 = Monday .. 4 = Friday
        const shiftType = typeof reg?.shiftType === "string" ? reg.shiftType : "";
        if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 4) continue;
        if (shiftType !== "morning" && shiftType !== "afternoon") continue;
        const key = `${dayOfWeek}:${shiftType}`;
        if (seen.has(key)) continue;
        seen.add(key);
        uniquePattern.push({ dayOfWeek, shiftType });
    }

    // The pattern is recurring, so it is materialised whole weeks at a time: the
    // window is snapped back to the Monday of the week containing startDate.
    const today = startOfLocalDay(new Date());
    const rangeStart = startOfIsoWeek(parseIsoDateInput(req.body?.startDate) || today);
    const horizonDays = Math.max(Number(req.body?.days) || DEFAULT_REGISTRATION_DAYS, 7);
    const rangeEnd = parseIsoDateInput(req.body?.endDate) || addLocalDays(today, horizonDays);

    if (rangeEnd < rangeStart) {
        return res.status(400).json({ message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu." });
    }

    if ((rangeEnd - rangeStart) / DAY_MS > MAX_REGISTRATION_DAYS) {
        return res.status(400).json({ message: `Mỗi lần đăng ký tối đa ${MAX_REGISTRATION_DAYS} ngày.` });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Freeze every shift that has already elapsed into work_history before the
        // registration window is rewritten.
        await promoteElapsedSchedulesToHistory(connection, userId);

        // Replace the whole registration window.
        await connection.execute("DELETE FROM work_schedules WHERE user_id = ? AND work_date >= ?", [
            userId,
            toIsoDate(rangeStart),
        ]);

        let inserted = 0;
        if (uniquePattern.length > 0) {
            // Resolve shift_type ids from the shift_types catalog.
            const [shiftTypeRows] = await connection.query(
                "SELECT id, code FROM shift_types WHERE code IN ('morning', 'afternoon') AND is_active = 1",
            );
            const shiftTypeIdByCode = new Map(shiftTypeRows.map((row) => [row.code, row.id]));

            for (let cursor = new Date(rangeStart); cursor <= rangeEnd; cursor.setDate(cursor.getDate() + 1)) {
                const jsDay = (cursor.getDay() + 6) % 7; // 0 = Monday
                if (jsDay > 4) continue; // Only Mon-Fri

                const weekStart = addLocalDays(cursor, -jsDay);

                for (const pattern of uniquePattern) {
                    if (pattern.dayOfWeek !== jsDay) continue;
                    const shiftTypeId = shiftTypeIdByCode.get(pattern.shiftType);
                    if (!shiftTypeId) continue;
                    await connection.execute(
                        `INSERT INTO work_schedules (user_id, shift_type_id, week_start_date, work_date, status)
                         VALUES (?, ?, ?, ?, 'registered')`,
                        [userId, shiftTypeId, toIsoDate(weekStart), toIsoDate(cursor)],
                    );
                    inserted += 1;
                }
            }
        }

        await connection.commit();
        return res.json({
            message: uniquePattern.length > 0 ? "Đã lưu lịch làm việc thành công." : "Đã hủy và xóa toàn bộ lịch đăng ký.",
            registeredCount: inserted,
        });
    } catch (error) {
        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error("Rollback failed:", rollbackError.message);
        }
        console.error("/api/shifts/register error:", error.message);
        return res.status(500).json({
            message: "Không thể lưu lịch làm việc.",
            detail: error.message,
        });
    } finally {
        connection.release();
    }
});

async function reviewRegistrationRequest(req, res, status, action) {
    const userId = Number(req.params.id);
    const adminId = Number(req.body?.adminId);
    if (!Number.isInteger(userId) || !Number.isInteger(adminId)) {
        return res.status(400).json({ message: "Thông tin duyệt hồ sơ không hợp lệ." });
    }

    // Map old uppercase statuses to new lowercase schema values
    const dbStatus = status === "ACTIVE" ? "active" : status === "REJECTED" ? "rejected" : String(status).toLowerCase();

    try {
        const [result] = await pool.execute(
            "UPDATE users SET status = ?, approved_by = ?, approved_at = NOW(), updated_at = NOW() WHERE id = ? AND status = 'pending'",
            [dbStatus, adminId, userId],
        );
        if (result.affectedRows !== 1) {
            return res.status(404).json({ message: "Hồ sơ không tồn tại hoặc đã được xử lý." });
        }
        // action is kept for backward compatibility but not stored separately
        // (audit trail is in users.approved_by / approved_at)
        void action;
        return res.json({ id: String(userId), status });
    } catch (error) {
        return res.status(500).json({ message: "Không thể cập nhật trạng thái hồ sơ.", detail: error.message });
    }
}

app.get("/api/bootstrap", async (_req, res) => {
    try {
        // Roll any shift that has elapsed since the last call into work_history so the
        // history view is complete without needing a scheduled job.
        await promoteElapsedSchedulesToHistory(pool);

        // Personal info lives in user_profiles (1-1 with users); users keeps auth/admin fields.
        const [users] = await pool.query(`
      SELECT u.id, u.email, u.role, u.status, u.admin_note, u.created_at,
             up.full_name, up.phone, up.date_of_birth, up.avatar_url,
             up.id_card_front_url, up.id_card_back_url, up.cv_url
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      ORDER BY u.id DESC
    `);

        // Load active schedules together with the shift type code and the user display info
        const [schedules] = await pool.query(`
      SELECT ws.id, ws.user_id, ws.work_date, ws.week_start_date,
             st.code AS shift_code, up.full_name, up.phone, up.avatar_url
      FROM work_schedules ws
      JOIN shift_types st ON st.id = ws.shift_type_id
      JOIN users u ON u.id = ws.user_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE ws.status = 'registered' AND u.status = 'active'
      ORDER BY ws.work_date, st.sort_order, ws.id
    `);

        // Elapsed shifts, frozen at the moment they passed. This is what the
        // "Lịch sử làm việc" view renders, so re-registering a pattern over a past day
        // can never rewrite it.
        const [history] = await pool.query(`
      SELECT wh.id, wh.user_id, wh.work_date, wh.day_of_week,
             st.code AS shift_code, up.full_name, up.phone, up.avatar_url
      FROM work_history wh
      JOIN shift_types st ON st.id = wh.shift_type_id
      JOIN users u ON u.id = wh.user_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE u.status = 'active'
      ORDER BY wh.work_date, st.sort_order, wh.id
    `);

        const accounts = users
            .filter((user) => {
                const s = String(user.status).toLowerCase();
                return s !== "pending" && s !== "rejected";
            })
            .map((user, index) => {
                const normalizedStatus = String(user.status).toLowerCase();
                const normalizedRole = String(user.role).toLowerCase();
                return {
                    ...(user.avatar_url && { avatar: user.avatar_url }),
                    ...(user.id_card_front_url && { cccdFront: user.id_card_front_url }),
                    ...(user.id_card_back_url && { cccdBack: user.id_card_back_url }),
                    ...(user.cv_url && {
                        cvFile: user.cv_url,
                        cvFileName: decodeURIComponent(user.cv_url.split("/").pop() || ""),
                    }),
                    id: String(user.id),
                    stt: index + 1,
                    name: user.full_name || "",
                    email: user.email,
                    phone: user.phone || "",
                    initials: (user.full_name || "")
                        .split(/\s+/)
                        .map((part) => part[0])
                        .join("")
                        .slice(-2)
                        .toUpperCase(),
                    role: normalizedRole === "admin" ? "Admin" : "Cộng tác viên",
                    status: normalizedStatus === "active" ? "Kích hoạt" : "Vô hiệu hóa",
                    registerDate: formatDate(user.created_at),
                    dob: formatDate(user.date_of_birth),
                    notes: user.admin_note || undefined,
                };
            });

        const requests = users
            .filter((user) => String(user.status).toLowerCase() === "pending")
            .map((user, index) => ({
                ...(user.id_card_front_url && { cccdFront: user.id_card_front_url }),
                ...(user.id_card_back_url && { cccdBack: user.id_card_back_url }),
                ...(user.cv_url && {
                    cvFile: user.cv_url,
                    cvFileName: user.cv_url ? user.cv_url.split("/").pop() : undefined,
                }),
                id: String(user.id),
                stt: index + 1,
                name: user.full_name || "",
                email: user.email,
                phone: user.phone || "",
                submittedAt: formatDateTime(user.created_at),
                status: "Chờ duyệt",
                initials: (user.full_name || "")
                    .split(/\s+/)
                    .map((part) => part[0])
                    .join("")
                    .slice(-2)
                    .toUpperCase(),
                dob: formatDate(user.date_of_birth),
                notes: user.admin_note || undefined,
            }));

        const shifts = groupSchedules(schedules);
        res.json({
            accounts,
            requests,
            shifts,
            history: groupSchedules(history, "history"),
            rooms: [],
            meetings: [],
        });
    } catch (error) {
        res.status(500).json({ message: "Không thể tải dữ liệu từ database.", detail: error.message });
    }
});

function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("vi-VN");
}

function parseDate(value) {
    if (typeof value !== "string") return null;
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

async function saveAttachment(attachment, userName = "", userId = "") {
    const isImage =
        attachment.fileType === "ID_CARD_FRONT" ||
        attachment.fileType === "ID_CARD_BACK" ||
        attachment.fileType === "AVATAR";
    const directory = isImage ? imageDirectory : cvDirectory;
    const extension = isImage ? ".jpg" : path.extname(attachment.fileName || "").toLowerCase() || ".pdf";
    const safeUserName = sanitizeFileName(userName);
    const safeOriginalName = sanitizeFileName(path.basename(attachment.fileName || "cv"));
    const prefix =
        attachment.fileType === "ID_CARD_FRONT"
            ? "id-card-front"
            : attachment.fileType === "ID_CARD_BACK"
              ? "id-card-back"
              : attachment.fileType === "AVATAR"
                ? "avatar"
                : "";

    let userSuffix = "";
    if (userId) {
        userSuffix = safeUserName && safeUserName !== "file" ? `-${safeUserName}-${userId}` : `-${userId}`;
    } else {
        userSuffix = safeUserName && safeUserName !== "file" ? `-${safeUserName}` : `-${Date.now()}`;
    }

    const fileName = isImage
        ? `${prefix}${userSuffix}${extension}`
        : (userId ? `${safeOriginalName.replace(/\.[^/.]+$/, "")}-${userId}${extension}` : safeOriginalName);
    const filePath = path.join(directory, fileName);
    const data = decodeDataUrl(attachment.filePath);

    if (!data) {
        throw new Error(`File ${attachment.fileName} không có nội dung hợp lệ.`);
    }
    await fs.promises.writeFile(filePath, data.buffer);
    return {
        fileName,
        filePath: `/${isImage ? "image" : "CV"}/${encodeURIComponent(fileName)}`,
        fileSize: data.buffer.length,
    };
}

function decodeDataUrl(value) {
    if (typeof value !== "string") return null;
    const match = value.match(/^data:([^;,]+)?;base64,(.+)$/s);
    if (!match) return null;
    return { mimeType: match[1] || "application/octet-stream", buffer: Buffer.from(match[2], "base64") };
}

function sanitizeFileName(value) {
    return (
        value
            .normalize("NFC")
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 180) || "file"
    );
}

function groupSchedules(schedules, idPrefix = "schedule") {
    // Schedules already carry concrete work_date + shift_code; just group by
    // the same (workDate, shiftType) tuple for the frontend grid. Used for both
    // work_schedules and work_history rows, hence the caller-supplied id prefix.
    const grouped = new Map();
    for (const schedule of schedules) {
        const workDateISO = toIsoDate(schedule.work_date);
        const key = `${workDateISO}-${schedule.shift_code}`;
        const dateObj = new Date(`${workDateISO}T00:00:00`);
        const dayIndex = (dateObj.getDay() + 6) % 7;
        const isMorning = schedule.shift_code === "morning";
        const shift = grouped.get(key) || {
            id: `${idPrefix}-${key}`,
            dayIndex,
            dayName: dayIndex === 6 ? "Chủ Nhật" : `Thứ ${dayIndex + 2}`,
            dateStr: `${workDateISO.slice(8, 10)}/${workDateISO.slice(5, 7)}`,
            workDate: workDateISO,
            shiftType: isMorning ? "morning" : "afternoon",
            shiftTimeLabel: isMorning ? "08:00 - 12:00" : "13:30 - 17:30",
            status: "Đã đăng ký",
            allowRegister: true,
            assignedCTVs: [],
        };
        shift.assignedCTVs.push({
            id: String(schedule.user_id),
            name: schedule.full_name,
            ...(schedule.avatar_url ? { avatar: schedule.avatar_url } : {}),
            phone: schedule.phone || "",
            status: "Đã duyệt",
        });
        grouped.set(key, shift);
    }
    return [...grouped.values()];
}

function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("vi-VN");
}

function toIsoDate(value) {
    // Build the ISO date from local date parts. Using toISOString() here would
    // shift the day by one for timezones ahead of UTC (e.g. GMT+7).
    if (value instanceof Date) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, "0");
        const day = String(value.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }
    return String(value).slice(0, 10);
}

function startOfLocalDay(value) {
    const date = value instanceof Date ? new Date(value) : new Date(String(value));
    date.setHours(0, 0, 0, 0);
    return date;
}

function addLocalDays(value, amount) {
    const date = startOfLocalDay(value);
    date.setDate(date.getDate() + amount);
    return date;
}

function startOfIsoWeek(value) {
    const date = startOfLocalDay(value);
    return addLocalDays(date, -((date.getDay() + 6) % 7));
}

function parseIsoDateInput(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
}

// Copy elapsed registrations into work_history, which is the immutable record behind
// the "Lịch sử làm việc" view.
//
// `DATE(created_at) <= work_date` is what keeps the two views independent: a row the
// CTV registers *today* for a day that has already passed (registering Tuesday on
// Wednesday) was created after the day it applies to, so it shows up in "Lịch tuần"
// but is never promoted into history. Rows registered while the day was still ahead
// are promoted. INSERT IGNORE against uq_history_user_date_shift makes this idempotent,
// so an existing history entry is never rewritten.
//
// `runner` is a pool or a transaction connection; pass a userId to limit the sweep.
async function promoteElapsedSchedulesToHistory(runner, userId = null) {
    const scopedUserId = userId === null || userId === undefined ? null : userId;
    await runner.query(
        `INSERT IGNORE INTO work_history (user_id, schedule_id, shift_type_id, work_date, day_of_week)
         SELECT ws.user_id, ws.id, ws.shift_type_id, ws.work_date, WEEKDAY(ws.work_date)
         FROM work_schedules ws
         WHERE ws.status = 'registered'
           AND ws.work_date < CURDATE()
           AND DATE(ws.created_at) <= ws.work_date
           AND (? IS NULL OR ws.user_id = ?)`,
        [scopedUserId, scopedUserId],
    );
}

function dayIndex(value) {
    const date = new Date(`${value}T00:00:00`);
    return (date.getDay() + 6) % 7;
}

function dayName(value) {
    const index = dayIndex(value);
    return index === 6 ? "Chủ Nhật" : `Thứ ${index + 2}`;
}

function shiftType(startTime) {
    const hour = Number(String(startTime).slice(0, 2));
    return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}

app.use((err, _req, res, _next) => {
    if (err && err.type === "entity.too.large") {
        return res.status(413).json({
            message: "Dung lượng tệp đính kèm quá lớn.",
            detail: "Ảnh CCCD và file CV vượt quá giới hạn cho phép. Vui lòng giảm kích thước ảnh hoặc thử lại.",
        });
    }
    return res.status(500).json({ message: "Lỗi máy chủ.", detail: err && err.message ? err.message : String(err) });
});

app.listen(port, () => {
    console.log(`Schedulo API listening on http://localhost:${port}`);
});
