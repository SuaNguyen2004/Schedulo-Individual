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
});

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000" }));
app.use(express.json({ limit: "20mb" }));
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
            "SELECT id, full_name, email, password_hash, role, status FROM users WHERE email = ? LIMIT 1",
            [email],
        );
        const user = rows[0];
        const passwordMatches = user ? await require("bcryptjs").compare(password, user.password_hash) : false;

        if (!user || !passwordMatches || (user.status !== "ACTIVE" && user.status !== "PENDING")) {
            return res.status(401).json({ message: "Email hoặc mật khẩu không chính xác." });
        }

        return res.json({
            id: String(user.id),
            name: user.full_name,
            email: user.email,
            role: user.role,
            status: user.status,
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

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const passwordHash = await bcrypt.hash(password, 12);
        const [result] = await connection.execute(
            `INSERT INTO users
        (full_name, email, password_hash, phone_number, date_of_birth, role, status)
       VALUES (?, ?, ?, ?, ?, 'CTV', 'PENDING')`,
            [name.trim(), email.trim(), passwordHash, phone.trim(), parseDate(dob)],
        );

        for (const attachment of Array.isArray(attachments) ? attachments : []) {
            if (!attachment?.fileType || !attachment?.fileName) continue;
            const storedAttachment = await saveAttachment(attachment, name.trim());
            await connection.execute(
                `INSERT INTO attachments (user_id, file_type, file_name, file_path, file_size)
         VALUES (?, ?, ?, ?, ?)`,
                [
                    result.insertId,
                    attachment.fileType,
                    storedAttachment.fileName,
                    storedAttachment.filePath,
                    storedAttachment.fileSize,
                ],
            );
        }
        await connection.commit();
        return res.status(201).json({ id: String(result.insertId), status: "PENDING" });
    } catch (error) {
        await connection.rollback();
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Email hoặc số điện thoại đã được sử dụng." });
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

app.post("/api/shifts/register", async (req, res) => {
    try {
        const { userId, registrations } = req.body;

        if (!userId || !Array.isArray(registrations) || registrations.length === 0) {
            return res.status(400).json({
                message: "Dữ liệu không hợp lệ. Cần userId và mảng registrations.",
            });
        }

        // Delete existing registrations for this user to replace with new ones
        await pool.query("DELETE FROM work_schedules WHERE user_id = ?", [userId]);

        // Insert new registrations
        for (const reg of registrations) {
            const { dayOfWeek, shiftType } = reg;

            if (!Number.isInteger(dayOfWeek) || !shiftType) {
                continue;
            }

            // Frontend uses 0-4 for Monday-Friday; database stores 2-6.
            const dbDayOfWeek = dayOfWeek + 2;
            const dbShiftType = shiftType === "morning" ? "SANG" : "CHIEU";

            await pool.query(
                "INSERT INTO work_schedules (user_id, shift_type, day_of_week, status) VALUES (?, ?, ?, ?)",
                [userId, dbShiftType, dbDayOfWeek, "ACTIVE"],
            );
        }

        res.json({
            message: "Đã lưu lịch làm việc thành công.",
            registrationCount: registrations.length,
        });
    } catch (error) {
        res.status(500).json({
            message: "Không thể lưu lịch làm việc.",
            detail: error.message,
        });
    }
});

async function reviewRegistrationRequest(req, res, status, action) {
    const userId = Number(req.params.id);
    const adminId = Number(req.body?.adminId);
    if (!Number.isInteger(userId) || !Number.isInteger(adminId)) {
        return res.status(400).json({ message: "Thông tin duyệt hồ sơ không hợp lệ." });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.execute(
            "UPDATE users SET status = ?, updated_at = NOW() WHERE id = ? AND status = 'PENDING'",
            [status, userId],
        );
        if (result.affectedRows !== 1) {
            await connection.rollback();
            return res.status(404).json({ message: "Hồ sơ không tồn tại hoặc đã được xử lý." });
        }
        await connection.execute(
            "INSERT INTO admin_action_logs (user_id, admin_id, action, note) VALUES (?, ?, ?, ?)",
            [userId, adminId, action, req.body?.note || null],
        );
        await connection.commit();
        return res.json({ id: String(userId), status });
    } catch (error) {
        await connection.rollback();
        return res.status(500).json({ message: "Không thể cập nhật trạng thái hồ sơ.", detail: error.message });
    } finally {
        connection.release();
    }
}

app.get("/api/bootstrap", async (_req, res) => {
    try {
        const [users] = await pool.query(`
      SELECT id, full_name, email, phone_number, date_of_birth, role, status,
             admin_note, registered_at
      FROM users u
      ORDER BY u.id DESC
    `);
        const [attachments] = await pool.query(`
      SELECT user_id, file_type, file_name, file_path, file_size
      FROM attachments
      ORDER BY id
    `);
        const [schedules] = await pool.query(`
      SELECT ws.id, ws.user_id, ws.shift_type, ws.day_of_week,
             u.full_name, u.phone_number
      FROM work_schedules ws
      JOIN users u ON u.id = ws.user_id
      WHERE ws.status = 'ACTIVE' AND u.status = 'ACTIVE'
      ORDER BY ws.day_of_week, ws.shift_type, ws.id
    `);

        const attachmentsByUser = new Map();
        for (const attachment of attachments) {
            const userAttachments = attachmentsByUser.get(String(attachment.user_id)) || {};
            userAttachments[attachment.file_type] = attachment;
            attachmentsByUser.set(String(attachment.user_id), userAttachments);
        }

        const accounts = users
            .filter((user) => user.status !== "PENDING" && user.status !== "REJECTED")
            .map((user, index) => ({
                ...(attachmentsByUser.get(String(user.id))?.AVATAR && {
                    avatar: attachmentsByUser.get(String(user.id)).AVATAR.file_path,
                }),
                id: String(user.id),
                stt: index + 1,
                name: user.full_name,
                email: user.email,
                phone: user.phone_number,
                initials: user.full_name
                    .split(/\\s+/)
                    .map((part) => part[0])
                    .join("")
                    .slice(-2)
                    .toUpperCase(),
                role: user.role === "ADMIN" ? "Admin" : "Cộng tác viên",
                status: user.status === "ACTIVE" ? "Kích hoạt" : "Vô hiệu hóa",
                registerDate: formatDate(user.registered_at),
                dob: formatDate(user.date_of_birth),
                notes: user.admin_note || undefined,
            }));

        const requests = users
            .filter((user) => user.status === "PENDING")
            .map((user, index) => ({
                ...(attachmentsByUser.get(String(user.id))?.ID_CARD_FRONT && {
                    cccdFront: attachmentsByUser.get(String(user.id)).ID_CARD_FRONT.file_path,
                }),
                ...(attachmentsByUser.get(String(user.id))?.ID_CARD_BACK && {
                    cccdBack: attachmentsByUser.get(String(user.id)).ID_CARD_BACK.file_path,
                }),
                ...(attachmentsByUser.get(String(user.id))?.CV && {
                    cvFile: attachmentsByUser.get(String(user.id)).CV.file_path,
                    cvFileName: attachmentsByUser.get(String(user.id)).CV.file_name,
                    cvFileSize: attachmentsByUser.get(String(user.id)).CV.file_size
                        ? `${attachmentsByUser.get(String(user.id)).CV.file_size} bytes`
                        : undefined,
                }),
                id: String(user.id),
                stt: index + 1,
                name: user.full_name,
                email: user.email,
                phone: user.phone_number,
                submittedAt: formatDateTime(user.registered_at),
                status: "Chờ duyệt",
                initials: user.full_name
                    .split(/\\s+/)
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

async function saveAttachment(attachment, userName) {
    const isImage = attachment.fileType === "ID_CARD_FRONT" || attachment.fileType === "ID_CARD_BACK";
    const directory = isImage ? imageDirectory : cvDirectory;
    const extension = isImage ? ".jpg" : path.extname(attachment.fileName || "").toLowerCase() || ".pdf";
    const safeUserName = sanitizeFileName(userName);
    const safeOriginalName = sanitizeFileName(path.basename(attachment.fileName || "cv"));
    const prefix = attachment.fileType === "ID_CARD_FRONT" ? "id-card-front" : "id-card-back";
    const fileName = isImage ? `${prefix}-${safeUserName}${extension}` : safeOriginalName;
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

function groupSchedules(schedules) {
    const monday = new Date();
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

    const grouped = new Map();
    for (const schedule of schedules) {
        const key = `${schedule.day_of_week}-${schedule.shift_type}`;
        const workDate = new Date(monday);
        workDate.setDate(monday.getDate() + schedule.day_of_week - 2);
        const isoDate = workDate.toISOString().slice(0, 10);
        const isMorning = schedule.shift_type === "SANG";
        const shift = grouped.get(key) || {
            id: `schedule-${key}`,
            dayIndex: schedule.day_of_week - 2,
            dayName: schedule.day_of_week === 6 ? "Thứ 6" : `Thứ ${schedule.day_of_week}`,
            dateStr: `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}`,
            workDate: isoDate,
            shiftType: isMorning ? "morning" : "afternoon",
            shiftTimeLabel: isMorning ? "08:00 - 12:00" : "13:30 - 17:30",
            status: "Đã đăng ký",
            allowRegister: true,
            assignedCTVs: [],
        };
        shift.assignedCTVs.push({
            id: String(schedule.user_id),
            name: schedule.full_name,
            phone: schedule.phone_number,
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
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
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

app.listen(port, () => {
    console.log(`Schedulo API listening on http://localhost:${port}`);
});
