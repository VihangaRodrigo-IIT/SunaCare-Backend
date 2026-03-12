-- Sunacare comment image/report migration
-- Run this in phpMyAdmin (XAMPP) against database: sunacare

USE sunacare;

ALTER TABLE post_comments
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT NULL AFTER body,
  ADD COLUMN IF NOT EXISTS is_flagged TINYINT(1) NOT NULL DEFAULT 0 AFTER image_url,
  ADD COLUMN IF NOT EXISTS flag_count INT NOT NULL DEFAULT 0 AFTER is_flagged,
  ADD COLUMN IF NOT EXISTS hidden TINYINT(1) NOT NULL DEFAULT 0 AFTER flag_count;

ALTER TABLE post_comments
  MODIFY COLUMN body TEXT NULL;

CREATE TABLE IF NOT EXISTS post_comment_reports (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  comment_id  INT UNSIGNED NOT NULL,
  reporter_id INT UNSIGNED NOT NULL,
  reason      VARCHAR(120) NOT NULL DEFAULT 'other',
  details     VARCHAR(500) DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_comment_reporter (comment_id, reporter_id),
  INDEX idx_comment_reports_comment (comment_id),
  INDEX idx_comment_reports_reporter (reporter_id),
  CONSTRAINT fk_comment_reports_comment FOREIGN KEY (comment_id) REFERENCES post_comments(id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);
