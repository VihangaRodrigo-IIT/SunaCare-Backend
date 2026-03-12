-- ─────────────────────────────────────────────────────────────────
--  Migration: Add user_settings table
--  Run once on an existing sunacare database.
--  Safe to run multiple times (uses IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────

USE sunacare;

CREATE TABLE IF NOT EXISTS user_settings (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id               INT UNSIGNED NOT NULL UNIQUE,
  notif_email_reports   TINYINT(1)   NOT NULL DEFAULT 1,
  notif_email_users     TINYINT(1)   NOT NULL DEFAULT 1,
  notif_email_campaigns TINYINT(1)   NOT NULL DEFAULT 0,
  notif_push_reports    TINYINT(1)   NOT NULL DEFAULT 1,
  notif_push_urgent     TINYINT(1)   NOT NULL DEFAULT 1,
  notif_push_system     TINYINT(1)   NOT NULL DEFAULT 1,
  coverage_radius_km    INT          NOT NULL DEFAULT 5,
  auto_assign           TINYINT(1)   NOT NULL DEFAULT 0,
  routing_priority      ENUM('distance','urgency','animal_type') NOT NULL DEFAULT 'distance',
  two_factor_enabled    TINYINT(1)   NOT NULL DEFAULT 0,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_settings_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
