USE sunacare;

CREATE TABLE IF NOT EXISTS article_reports (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  article_id INT UNSIGNED NOT NULL,
  reported_by INT UNSIGNED NULL,
  reason VARCHAR(120) NOT NULL,
  details TEXT NULL,
  reporter_name VARCHAR(120) NULL,
  reporter_email VARCHAR(160) NULL,
  status ENUM('pending','reviewed','dismissed') NOT NULL DEFAULT 'pending',
  admin_note TEXT NULL,
  action_taken ENUM('none','remove_article','revoke_author','dismiss') NOT NULL DEFAULT 'none',
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_article_reports_article_id (article_id),
  INDEX idx_article_reports_status (status),
  INDEX idx_article_reports_reported_by (reported_by),
  INDEX idx_article_reports_reviewed_by (reviewed_by),
  CONSTRAINT fk_article_reports_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_article_reports_reported_by FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_article_reports_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);
