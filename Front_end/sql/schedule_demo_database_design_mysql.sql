-- =====================================================================
-- THIẾT KẾ CƠ SỞ DỮ LIỆU - HỆ THỐNG QUẢN LÝ CỘNG TÁC VIÊN (Schedule_Demo)
-- Bản MySQL 8.0+ - tương thích MySQL Workbench (Reverse Engineer / EER Diagram)
-- Dựa trên: CHUC-NANG-WEBSITE.md
-- =====================================================================

CREATE DATABASE IF NOT EXISTS schedule_demo
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE schedule_demo;

-- ---------------------------------------------------------------------
-- 1. users - Tài khoản hệ thống (Admin + Cộng tác viên)
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name               VARCHAR(150)   NOT NULL,
    email                   VARCHAR(150)   NOT NULL,
    phone                   VARCHAR(20)    NOT NULL,
    password_hash           VARCHAR(255)   NOT NULL,
    date_of_birth           DATE           NULL,
    id_card_front_url       TEXT           NULL,   -- ảnh CCCD mặt trước
    id_card_back_url        TEXT           NULL,   -- ảnh CCCD mặt sau
    cv_url                  TEXT           NULL,   -- file CV
    role                    ENUM('admin','collaborator') NOT NULL DEFAULT 'collaborator',
    status                  ENUM('active','disabled')    NOT NULL DEFAULT 'active',
    note                    TEXT           NULL,   -- CHỈ Admin được xem/sửa (kiểm soát ở tầng ứng dụng)
    must_change_password    TINYINT(1)     NOT NULL DEFAULT 0,
    created_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                            ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_phone (phone),
    INDEX idx_users_role_status (role, status),
    FULLTEXT INDEX ftx_users_search (full_name, email, phone)  -- tìm kiếm CTV (mục 3.2)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. registration_requests - Yêu cầu đăng ký làm CTV (chờ duyệt)
-- ---------------------------------------------------------------------
CREATE TABLE registration_requests (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name               VARCHAR(150)   NOT NULL,
    email                   VARCHAR(150)   NOT NULL,
    phone                   VARCHAR(20)    NOT NULL,
    date_of_birth           DATE           NULL,
    id_card_front_url       TEXT           NULL,
    id_card_back_url        TEXT           NULL,
    cv_url                  TEXT           NULL,
    status                  ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    reviewed_by             BIGINT UNSIGNED NULL,   -- Admin đã duyệt/từ chối
    reviewed_at             TIMESTAMP       NULL,
    created_user_id         BIGINT UNSIGNED NULL,   -- tài khoản được tạo khi duyệt
    created_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                            ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_requests_status (status),
    FULLTEXT INDEX ftx_requests_search (full_name, email, phone), -- tìm kiếm yêu cầu (mục 4.2)
    CONSTRAINT fk_requests_reviewer FOREIGN KEY (reviewed_by)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_requests_created_user FOREIGN KEY (created_user_id)
        REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. rooms - Phòng làm việc
-- ---------------------------------------------------------------------
CREATE TABLE rooms (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name                    VARCHAR(100)   NOT NULL,
    location                VARCHAR(255)   NULL,
    note                    TEXT           NULL,
    status                  ENUM('active','maintenance') NOT NULL DEFAULT 'active',
    created_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                            ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. shift_slots - Danh mục khung ca cố định (VD: Ca sáng 07:00-11:00)
-- ---------------------------------------------------------------------
CREATE TABLE shift_slots (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name                    VARCHAR(100)   NOT NULL,   -- VD: "Ca sáng", "Ca chiều"
    start_time              TIME           NOT NULL,
    end_time                TIME           NOT NULL,
    created_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                            ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_shift_time CHECK (end_time > start_time)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. work_schedules - Ca làm việc CTV đã đăng ký, theo từng ngày/tuần
-- ---------------------------------------------------------------------
CREATE TABLE work_schedules (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id                 BIGINT UNSIGNED NOT NULL,
    shift_id                BIGINT UNSIGNED NOT NULL,
    room_id                 BIGINT UNSIGNED NULL,
    work_date               DATE            NOT NULL,   -- ngày làm việc cụ thể
    week_start_date         DATE            NOT NULL,   -- thứ Hai của tuần áp dụng
    status                  ENUM('registered','cancelled') NOT NULL DEFAULT 'registered',
    is_recurring            TINYINT(1)      NOT NULL DEFAULT 1, -- có tự sinh sang tuần kế tiếp không
    cancelled_at            TIMESTAMP       NULL,
    created_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                             ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_schedule_slot (user_id, shift_id, work_date), -- không đăng ký trùng ca/ngày
    INDEX idx_schedules_user_week (user_id, week_start_date),
    INDEX idx_schedules_date (work_date),
    INDEX idx_schedules_room (room_id),
    CONSTRAINT fk_schedules_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_schedules_shift FOREIGN KEY (shift_id)
        REFERENCES shift_slots(id) ON DELETE RESTRICT,
    CONSTRAINT fk_schedules_room FOREIGN KEY (room_id)
        REFERENCES rooms(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- is_recurring: khi CTV huỷ 1 ca -> set is_recurring=0 cho bản ghi đó (không xoá)
-- -> job sinh lịch tuần sau sẽ bỏ qua ca này, đúng nghiệp vụ
--    "huỷ ca thì áp dụng từ tuần tiếp theo"

-- ---------------------------------------------------------------------
-- 6. system_settings - Cài đặt hệ thống (VD: trạng thái cổng đăng ký ca)
-- ---------------------------------------------------------------------
CREATE TABLE system_settings (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key             VARCHAR(100)   NOT NULL,  -- 'key' là từ khoá dự phòng trong MySQL nên đổi tên cột
    setting_value           TEXT           NOT NULL,
    description             TEXT           NULL,
    updated_by              BIGINT UNSIGNED NULL,
    updated_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                            ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_settings_key (setting_key),
    CONSTRAINT fk_settings_updater FOREIGN KEY (updated_by)
        REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('registration_gate_open', 'true', 'Cho phép CTV đăng ký ca làm việc hay không');

-- =====================================================================
-- TRIGGER NGHIỆP VỤ: Khi khoá tài khoản (status -> 'disabled')
-- -> Tự động huỷ mọi ca đã đăng ký của CTV đó trong TUẦN HIỆN TẠI
--    (mục 3.5: "hủy các ca đăng ký liên quan của CTV trong tuần hiện tại")
-- =====================================================================
DELIMITER $$

CREATE TRIGGER trg_user_disable_cancel_schedules
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    IF NEW.status = 'disabled' AND OLD.status = 'active' THEN
        UPDATE work_schedules
        SET status = 'cancelled',
            is_recurring = 0,
            cancelled_at = NOW()
        WHERE user_id = NEW.id
          AND status = 'registered'
          -- Thứ Hai của tuần hiện tại: lùi CURDATE() về đúng số ngày trong tuần (0=Thứ Hai)
          AND week_start_date = DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY);
    END IF;
END$$

DELIMITER ;

-- =====================================================================
-- VÍ DỤ TRUY VẤN THAM KHẢO
-- =====================================================================

-- Lịch làm việc tuần hiện tại của 1 CTV (kèm tên ca, tên phòng)
-- SELECT ws.work_date, s.name AS shift_name, s.start_time, s.end_time,
--        r.name AS room_name, ws.status
-- FROM work_schedules ws
-- JOIN shift_slots s ON s.id = ws.shift_id
-- LEFT JOIN rooms r ON r.id = ws.room_id
-- WHERE ws.user_id = ?
--   AND ws.week_start_date = DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
-- ORDER BY ws.work_date, s.start_time;

-- Danh sách yêu cầu đăng ký đang chờ duyệt (có phân trang)
-- SELECT * FROM registration_requests
-- WHERE status = 'pending'
-- ORDER BY created_at DESC
-- LIMIT ? OFFSET ?;
