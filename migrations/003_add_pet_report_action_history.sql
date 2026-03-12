-- Migration 003: Add action_taken, pet_name_snapshot columns & fix FK to preserve report history
-- Run after 002_create_pet_reports.sql

-- Step 1: Drop old CASCADE FK (named fk_pet_reports_pet in migration 002)
ALTER TABLE pet_reports DROP FOREIGN KEY fk_pet_reports_pet;

-- Step 2: Allow pet_id to be NULL so ON DELETE SET NULL works
ALTER TABLE pet_reports MODIFY COLUMN pet_id INT UNSIGNED DEFAULT NULL;

-- Step 3: Re-add FK with SET NULL so deleting a pet keeps its reports
ALTER TABLE pet_reports
  ADD CONSTRAINT fk_pet_reports_pet
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL;

-- Step 4: action_taken  tracks which admin action resolved these reports
ALTER TABLE pet_reports
  ADD COLUMN action_taken ENUM('delete','keep_pending','dismiss') DEFAULT NULL
  AFTER resolved_at;

-- Step 5: pet_name_snapshot preserves pet name after deletion
ALTER TABLE pet_reports
  ADD COLUMN pet_name_snapshot VARCHAR(150) DEFAULT NULL
  AFTER action_taken;

-- Step 6: Index for faster history queries
ALTER TABLE pet_reports
  ADD INDEX idx_action_taken (action_taken);
