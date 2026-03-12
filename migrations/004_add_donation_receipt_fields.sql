-- Migration 004: Add bank-transfer and receipt proof fields to donations

ALTER TABLE donations
  ADD COLUMN payment_method ENUM('bank_transfer') NOT NULL DEFAULT 'bank_transfer' AFTER is_anonymous,
  ADD COLUMN donor_name VARCHAR(100) DEFAULT NULL AFTER payment_method,
  ADD COLUMN bank_reference VARCHAR(120) DEFAULT NULL AFTER donor_name,
  ADD COLUMN receipt_url MEDIUMTEXT DEFAULT NULL AFTER bank_reference,
  ADD COLUMN receipt_name VARCHAR(255) DEFAULT NULL AFTER receipt_url;

ALTER TABLE donations
  ADD INDEX idx_payment_method (payment_method),
  ADD INDEX idx_bank_reference (bank_reference);