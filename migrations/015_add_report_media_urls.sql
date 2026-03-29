-- Add support for storing multiple uploaded report images.
-- This migration is idempotent and can be re-run safely.
SET @has_media_urls := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'reports'
    AND COLUMN_NAME = 'media_urls'
);

SET @sql := IF(
  @has_media_urls = 0,
  'ALTER TABLE reports ADD COLUMN media_urls TEXT NULL AFTER media_url',
  'SELECT ''Column media_urls already exists; skipping migration.'' AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
