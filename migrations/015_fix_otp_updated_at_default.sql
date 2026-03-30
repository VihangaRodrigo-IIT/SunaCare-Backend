-- 015_fix_otp_updated_at_default.sql
-- Fixes OTP insert failures where otp_verifications.updated_at exists but has no default.
-- Safe for existing rows: backfills NULL values before enforcing NOT NULL + default.

ALTER TABLE otp_verifications
  ADD COLUMN IF NOT EXISTS updated_at DATETIME NULL AFTER created_at;

UPDATE otp_verifications
SET updated_at = created_at
WHERE updated_at IS NULL;

ALTER TABLE otp_verifications
  MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
