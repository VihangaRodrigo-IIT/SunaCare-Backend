-- Migration 005: Campaign approval workflow fields

ALTER TABLE campaigns
  ADD COLUMN approval_status ENUM('pending','approved','discarded') NOT NULL DEFAULT 'pending' AFTER status,
  ADD COLUMN review_note TEXT DEFAULT NULL AFTER approval_status,
  ADD COLUMN submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP AFTER review_note,
  ADD COLUMN reviewed_at DATETIME DEFAULT NULL AFTER submitted_at,
  ADD COLUMN reviewed_by INT UNSIGNED DEFAULT NULL AFTER reviewed_at;

ALTER TABLE campaigns
  ADD INDEX idx_approval_status (approval_status),
  ADD INDEX idx_reviewed_by (reviewed_by);

ALTER TABLE campaigns
  ADD CONSTRAINT fk_campaigns_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;