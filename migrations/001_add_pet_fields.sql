-- Migration 001: Add new fields to pets table
-- Run this if DB_SYNC=true fails to apply the schema changes automatically.
-- Safe to run multiple times — ALTER IGNORE is used where possible.

-- Extend species ENUM to include bird and rabbit
ALTER TABLE pets
  MODIFY COLUMN species ENUM('dog','cat','bird','rabbit','other') NOT NULL;

-- Add new columns (each ADD IF NOT EXISTS is MySQL 8.0+; for older versions duplicate runs are safe due to IF NOT EXISTS)
ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS color          VARCHAR(100)  NULL AFTER size,
  ADD COLUMN IF NOT EXISTS health_notes   TEXT          NULL AFTER description,
  ADD COLUMN IF NOT EXISTS ideal_home     TEXT          NULL AFTER health_notes,
  ADD COLUMN IF NOT EXISTS location       VARCHAR(255)  NULL AFTER ideal_home,
  ADD COLUMN IF NOT EXISTS urgent         TINYINT(1)    NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN IF NOT EXISTS contact_name   VARCHAR(100)  NULL AFTER image_url,
  ADD COLUMN IF NOT EXISTS contact_phone  VARCHAR(50)   NULL AFTER contact_name,
  ADD COLUMN IF NOT EXISTS contact_email  VARCHAR(255)  NULL AFTER contact_phone;

-- Increase image_url capacity for compressed data URLs
ALTER TABLE pets
  MODIFY COLUMN image_url MEDIUMTEXT NULL;
