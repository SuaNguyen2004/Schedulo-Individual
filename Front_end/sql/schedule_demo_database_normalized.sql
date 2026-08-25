-- =====================================================================
-- THIẾT KẾ CƠ SỞ DỮ LIỆU CHUẨN HÓA - HỆ THỐNG QUẢN LÝ CỘNG TÁC VIÊN
-- MySQL 8.0+ - tương thích MySQL Workbench
-- Thiết kế theo 11 nguyên tắc: tránh trùng lặp, khóa chính, xử lý NULL,
-- toàn vẹn tham chiếu, tính nguyên tử, chuẩn hóa, kiểu dữ liệu phù hợp,
-- indexing, phân vùng schema, bảo mật, sao lưu & phục hồi.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS schedule_demo
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE schedule_demo;

-- =====================================================================
-- NHÓM 1: XÁC THỰC & HỒ SƠ (roles, users, user_profiles)
-- =====================================================================

-- ---------------------------------------------------------------------
-- roles - Danh mục vai trò (tách riêng để mở rộng mà không sửa schema)
-- Nguyên tắc 6 (chuẩn hóa): tránh lặp chuỗi 'Admin'/'Cộng tác viên'
-- ---------------------------------------------------------------------
CREATE TABLE roles (
    id      TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code    VARCHAR(30)  NOT NULL,
    name    VARCHAR(100) NOT NULL,
    UNIQUE KEY uq_roles_code (code)
) ENGINE=InnoDB;

INSERT INTO roles (code, name) VALUES
    ('admin', 'Admin'),
    ('collaborator', 'Cộng tác viên');

-- ---------------------------------------------------------------------
-- users - Thông tin lõi bắt buộc của tài khoản (ít NULL)
-- Nguyên tắc 3 (NULL): chỉ chứa cột hầu như luôn có giá trị
-- Nguyên tắc 10 (bảo mật): chỉ lưu password_hash, không lưu plaintext
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id                 TINYINT UNSIGNED NOT NULL,
    full_name               VARCHAR(150)  NOT NULL,
    email                   VARCHAR(255)  NOT NULL,
    phone                   VARCHAR(20)   NOT NULL,
    password_hash           VARCHAR(255)  NOT NULL COMMENT 'bcrypt/argon2 hash - KHÔNG lưu plaintext',
    status                  ENUM('active','disabled') NOT NULL DEFAULT 'active',
    must_change_password    TINYINT(1)    NOT NULL DEFAULT 0,
    created_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                           ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_phone (phone),
    INDEX idx_users_role_status (role_id, status),
    FULLTEXT INDEX ftx_users_search (full_name, email, phone),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id)
        REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- user_profiles - Hồ sơ mở rộng (1-1 với users), tách riêng vì phần lớn
-- cột cho phép NULL (đặc biệt với tài khoản Admin không cần CCCD/CV)
-- Nguyên tắc 5 (nguyên tử): cv_file_size_kb là số, không phải chuỗi "2MB"
-- Nguyên tắc 10 (bảo mật): id_card_number nên mã hóa ở tầng ứng dụng (AES)
--   trước khi lưu; ảnh CCCD/CV nên dùng signed URL, không public tĩnh
-- ---------------------------------------------------------------------
CREATE TABLE user_profiles (
    user_id                 BIGINT UNSIGNED PRIMARY KEY,
    date_of_birth           DATE          NULL,
    id_card_number          VARCHAR(20)   NULL COMMENT 'Nên mã hóa ở tầng ứng dụng',
    id_card_front_url       VARCHAR(500)  NULL,
    id_card_back_url        VARCHAR(500)  NULL,
    cv_file_url              VARCHAR(500) NULL,
    cv_file_name             VARCHAR(255) NULL,
    cv_file_size_kb          INT UNSIGNED NULL,
    address                  VARCHAR(255) NULL,
    note                     TEXT         NULL COMMENT 'Chỉ Admin xem/sửa - enforce ở tầng API',
    updated_at               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                                           ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_profiles_idcard (id_card_number),
    CONSTRAINT fk_profiles_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- NHÓM 2: TUYỂN DỤNG (registration_requests)
-- =====================================================================
CREATE TABLE registration_requests (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name               VARCHAR(150)  NOT NULL,
    email                   VARCHAR(255)  NOT NULL,
    phone                   VARCHAR(20)   NOT NULL,
    date_of_birth           DATE          NULL,
    id_card_number          VARCHAR(20)   NULL,
    id_card_front_url       VARCHAR(500)  NULL,
    id_card_back_url        VARCHAR(500)  NULL,
    cv_file_url             VARCHAR(500)  NULL,
    cv_file_name            VARCHAR(255)  NULL,
    cv_file_size_kb         INT UNSIGNED  NULL,
    status                  ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    reviewed_by             BIGINT UNSIGNED NULL,
    reviewed_at             TIMESTAMP     NULL,
    created_user_id         BIGINT UNSIGNED NULL COMMENT 'Tài khoản được tạo khi duyệt - 1 request tối đa 1 user',
    created_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                           ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_requests_status (status),
    UNIQUE KEY uq_requests_created_user (created_user_id),
    FULLTEXT INDEX ftx_requests_search (full_name, email, phone),
    CONSTRAINT fk_requests_reviewer FOREIGN KEY (reviewed_by)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_requests_created_user FOREIGN KEY (created_user_id)
        REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================================
-- NHÓM 3: LỊCH LÀM VIỆC (rooms, shift_templates, shifts, shift_registrations)
-- =====================================================================

-- ---------------------------------------------------------------------
-- rooms - Phòng làm việc
-- ---------------------------------------------------------------------
CREATE TABLE rooms (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name                    VARCHAR(150)  NOT NULL,
    location                VARCHAR(255)  NULL,
    description             TEXT          NULL,
    status                  ENUM('active','maintenance') NOT NULL DEFAULT 'active',
    created_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                           ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_rooms_name (name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- shift_templates - Khung giờ ca chuẩn, TÁI SỬ DỤNG cho mọi ngày
-- Nguyên tắc 1 (tránh trùng lặp): giờ ca chỉ khai báo 1 lần ở đây,
-- không chép lại "07:00-11:00" vào từng dòng ca của từng ngày
-- ---------------------------------------------------------------------
CREATE TABLE shift_templates (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name                    VARCHAR(100)  NOT NULL COMMENT 'VD: Ca sáng, Ca chiều, Ca tối',
    start_time              TIME          NOT NULL,
    end_time                TIME          NOT NULL,
    created_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                           ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_templates_name (name),
    CONSTRAINT chk_template_time CHECK (end_time > start_time)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- shifts - Một ca CỤ THỂ của một ngày, chỉ tham chiếu template (3NF:
-- không lưu lại tên/giờ template ở đây - transitive dependency)
-- ---------------------------------------------------------------------
CREATE TABLE shifts (
    id                       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    template_id              BIGINT UNSIGNED NOT NULL,
    room_id                  BIGINT UNSIGNED NULL,
    work_date                DATE            NOT NULL,
    capacity                 SMALLINT UNSIGNED NULL COMMENT 'Số CTV tối đa; NULL = không giới hạn',
    registration_opens_at    DATETIME        NULL,
    registration_closes_at   DATETIME        NULL,
    work_content              TEXT           NULL,
    status                    ENUM('open','closed','cancelled') NOT NULL DEFAULT 'open',
    created_by                BIGINT UNSIGNED NULL,
    created_at                TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                              ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_shift_slot (template_id, room_id, work_date) COMMENT 'Tránh tạo trùng ca giống hệt cùng ngày/phòng',
    INDEX idx_shifts_date (work_date),
    INDEX idx_shifts_room (room_id),
    CONSTRAINT fk_shifts_template FOREIGN KEY (template_id)
        REFERENCES shift_templates(id) ON DELETE RESTRICT,
    CONSTRAINT fk_shifts_room FOREIGN KEY (room_id)
        REFERENCES rooms(id) ON DELETE SET NULL,
    CONSTRAINT fk_shifts_creator FOREIGN KEY (created_by)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_registration_window CHECK (
        registration_opens_at IS NULL OR registration_closes_at IS NULL
        OR registration_closes_at > registration_opens_at
    )
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- shift_registrations - Bảng trung gian N-N giữa users và shifts
-- Nguyên tắc 4 (toàn vẹn): UNIQUE(shift_id, user_id) chặn đăng ký trùng
-- ---------------------------------------------------------------------
CREATE TABLE shift_registrations (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    shift_id                BIGINT UNSIGNED NOT NULL,
    user_id                 BIGINT UNSIGNED NOT NULL,
    status                  ENUM('registered','cancelled') NOT NULL DEFAULT 'registered',
    is_recurring            TINYINT(1)      NOT NULL DEFAULT 1
        COMMENT 'Huỷ 1 ca -> set 0, job sinh ca tuần sau sẽ bỏ qua bản ghi này',
    registered_at            TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at             TIMESTAMP      NULL,
    UNIQUE KEY uq_registration (shift_id, user_id),
    INDEX idx_registrations_user (user_id, status),
    CONSTRAINT fk_registrations_shift FOREIGN KEY (shift_id)
        REFERENCES shifts(id) ON DELETE CASCADE,
    CONSTRAINT fk_registrations_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- NHÓM 4: VẬN HÀNH (system_settings, audit_logs)
-- =====================================================================

CREATE TABLE system_settings (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key             VARCHAR(100)  NOT NULL,
    setting_value           TEXT          NOT NULL,
    setting_type            ENUM('string','number','boolean','json') NOT NULL DEFAULT 'string',
    description             TEXT          NULL,
    updated_by              BIGINT UNSIGNED NULL,
    updated_at               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                                           ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_settings_key (setting_key),
    CONSTRAINT fk_settings_updater FOREIGN KEY (updated_by)
        REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO system_settings (setting_key, setting_value, setting_type, description)
VALUES ('registration_gate_open', 'true', 'boolean', 'Cho phép CTV đăng ký ca làm việc hay không');

-- ---------------------------------------------------------------------
-- audit_logs - Truy vết thao tác nhạy cảm (bảo mật, nguyên tắc 10)
-- ---------------------------------------------------------------------
CREATE TABLE audit_logs (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    actor_id                BIGINT UNSIGNED NULL COMMENT 'Người thực hiện, NULL nếu hệ thống tự động',
    action                  VARCHAR(100)  NOT NULL COMMENT 'VD: user.disable, request.approve, role.change',
    target_table             VARCHAR(50)  NOT NULL,
    target_id                BIGINT UNSIGNED NOT NULL,
    detail                    JSON        NULL,
    created_at                TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_target (target_table, target_id),
    INDEX idx_audit_actor (actor_id),
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id)
        REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================================
-- TRIGGER NGHIỆP VỤ
-- =====================================================================

-- Khi khoá tài khoản (status active -> disabled): huỷ mọi ca đã đăng ký
-- của CTV đó trong TUẦN HIỆN TẠI, và ghi log
DELIMITER $$

CREATE TRIGGER trg_user_disable_cancel_schedules
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    IF NEW.status = 'disabled' AND OLD.status = 'active' THEN
        UPDATE shift_registrations sr
        JOIN shifts s ON s.id = sr.shift_id
        SET sr.status = 'cancelled',
            sr.is_recurring = 0,
            sr.cancelled_at = NOW()
        WHERE sr.user_id = NEW.id
          AND sr.status = 'registered'
          AND s.work_date BETWEEN
              DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
              AND DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY);

        INSERT INTO audit_logs (actor_id, action, target_table, target_id, detail)
        VALUES (NULL, 'user.disable.cascade_cancel_schedules', 'users', NEW.id,
                JSON_OBJECT('week_start', DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)));
    END IF;
END$$

-- Chặn đăng ký ca khi đã đủ sức chứa (capacity) - toàn vẹn dữ liệu ngoài FK
CREATE TRIGGER trg_check_shift_capacity
BEFORE INSERT ON shift_registrations
FOR EACH ROW
BEGIN
    DECLARE current_count INT;
    DECLARE max_capacity INT;

    SELECT capacity INTO max_capacity FROM shifts WHERE id = NEW.shift_id;

    IF max_capacity IS NOT NULL THEN
        SELECT COUNT(*) INTO current_count
        FROM shift_registrations
        WHERE shift_id = NEW.shift_id AND status = 'registered';

        IF current_count >= max_capacity THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Ca làm việc đã đủ số lượng đăng ký';
        END IF;
    END IF;
END$$

DELIMITER ;

-- =====================================================================
-- GHI CHÚ VẬN HÀNH: SAO LƯU & PHỤC HỒI (nguyên tắc 11)
-- =====================================================================
-- 1. Sao lưu đầy đủ hàng ngày (ngoài giờ cao điểm):
--      mysqldump --single-transaction --routines --triggers \
--                 -u <user> -p schedule_demo > backup_$(date +%F).sql
-- 2. Bật binary log (bin-log) để hỗ trợ Point-in-Time Recovery giữa 2 lần
--    backup đầy đủ:
--      SET GLOBAL log_bin = ON;  -- cấu hình trong my.cnf, cần restart
-- 3. Lưu bản sao ở nơi tách biệt vật lý (khác server/khác vùng) + mã hoá
--    file backup khi lưu trữ lâu dài.
-- 4. Định kỳ (VD hàng tháng) khôi phục thử trên môi trường staging để
--    xác nhận file backup dùng được, không chỉ tin là "đã chạy xong".
-- 5. Đặt retention policy rõ ràng (VD: giữ backup hàng ngày 30 ngày,
--    backup cuối tháng giữ 12 tháng) để cân bằng chi phí lưu trữ.

-- =====================================================================
-- GHI CHÚ BẢO MẬT BỔ SUNG (nguyên tắc 10)
-- =====================================================================
-- - Tạo user DB riêng cho ứng dụng với quyền tối thiểu (không dùng root);
--   tạo thêm user chỉ SELECT cho mục đích báo cáo/BI nếu cần.
-- - Kết nối DB qua TLS (require_secure_transport = ON).
-- - id_card_number, id_card_front_url, id_card_back_url, cv_file_url nên
--   mã hoá hoặc dùng signed URL có thời hạn ở tầng ứng dụng, không trỏ
--   thẳng tới file public tĩnh.
-- - Trường user_profiles.note chỉ Admin đọc/ghi - enforce bằng middleware
--   phân quyền ở API, DB không tự giới hạn theo field được.
