-- Migration: Add user_weekly_patterns table for recurring weekly schedule patterns
-- Preserves all existing tables and data.
CREATE TABLE IF NOT EXISTS `user_weekly_patterns` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `pattern_json` text NOT NULL,
  `effective_week_start` date NOT NULL,
  `status` enum('active','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_effective_week` (`user_id`, `effective_week_start`),
  KEY `idx_patterns_user_status` (`user_id`, `status`),
  CONSTRAINT `fk_patterns_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

