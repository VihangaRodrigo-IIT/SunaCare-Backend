-- Migration 017: Add pet personality and enforce pending status option
-- Safe to run on existing databases.

ALTER TABLE pets
  MODIFY COLUMN status ENUM('available','pending','adopted') NOT NULL DEFAULT 'available';

ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS personality TEXT NULL AFTER health_notes;
