-- Migration 002: Create pet_reports table
-- Run this if DB_SYNC is disabled and you need pet listing reports persisted.

CREATE TABLE IF NOT EXISTS pet_reports (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pet_id          INT UNSIGNED NOT NULL,
  reported_by     INT UNSIGNED DEFAULT NULL,
  reason          ENUM(
    'scam_payment',
    'inappropriate_images',
    'misleading_description',
    'fake_listing',
    'suspicious_contact',
    'other'
  ) NOT NULL,
  affected_fields TEXT DEFAULT NULL COMMENT 'JSON array of flagged pet listing fields',
  details         TEXT DEFAULT NULL,
  reporter_name   VARCHAR(100) DEFAULT NULL,
  reporter_email  VARCHAR(150) DEFAULT NULL,
  status          ENUM('pending','reviewed','dismissed') NOT NULL DEFAULT 'pending',
  admin_note      TEXT DEFAULT NULL,
  resolved_at     DATETIME DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pet_id      (pet_id),
  INDEX idx_reported_by (reported_by),
  INDEX idx_status      (status),
  CONSTRAINT fk_pet_reports_pet
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  CONSTRAINT fk_pet_reports_reporter
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;