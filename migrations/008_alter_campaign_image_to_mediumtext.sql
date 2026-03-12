-- Migration 008: Expand campaign image column for cover-image uploads (data URLs)

ALTER TABLE campaigns
  MODIFY COLUMN image MEDIUMTEXT DEFAULT NULL;