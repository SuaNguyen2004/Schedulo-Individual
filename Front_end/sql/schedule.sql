CREATE DATABASE IF NOT EXISTS schedule
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE schedule;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(15) NOT NULL UNIQUE,
    date_of_birth DATE NULL,
    role ENUM('CTV', 'ADMIN') NOT NULL DEFAULT 'CTV',
    status ENUM('PENDING', 'ACTIVE', 'REJECTED', 'DISABLED') NOT NULL DEFAULT 'PENDING',
    admin_note TEXT NULL,
    registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL
) ENGINE=InnoDB;

CREATE TABLE attachments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    file_type ENUM('ID_CARD_FRONT', 'ID_CARD_BACK', 'CV', 'AVATAR') NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path MEDIUMTEXT NOT NULL,
    file_size INT NULL,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_file_type (user_id, file_type),
    CONSTRAINT fk_attachments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE work_schedules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    shift_type ENUM('SANG', 'CHIEU') NOT NULL,
    day_of_week TINYINT NOT NULL,
    status ENUM('ACTIVE', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    UNIQUE KEY uq_user_shift_day (user_id, shift_type, day_of_week),
    CONSTRAINT chk_schedule_day CHECK (day_of_week BETWEEN 2 AND 6),
    CONSTRAINT fk_schedules_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE admin_action_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    admin_id BIGINT NOT NULL,
    action ENUM('APPROVE_REGISTRATION', 'REJECT_REGISTRATION', 'ACTIVATE', 'DISABLE', 'RESET_PASSWORD', 'DELETE_ACCOUNT') NOT NULL,
    note TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_logs_admin FOREIGN KEY (admin_id) REFERENCES users(id)
) ENGINE=InnoDB;
