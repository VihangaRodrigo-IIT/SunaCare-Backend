-- Migration 007: Add campaign purpose and NGO bank details for fundraiser payouts

ALTER TABLE campaigns
  ADD COLUMN campaign_for TEXT DEFAULT NULL AFTER description,
  ADD COLUMN bank_name VARCHAR(150) DEFAULT NULL AFTER image,
  ADD COLUMN bank_account_name VARCHAR(180) DEFAULT NULL AFTER bank_name,
  ADD COLUMN bank_account_number VARCHAR(80) DEFAULT NULL AFTER bank_account_name,
  ADD COLUMN bank_branch VARCHAR(150) DEFAULT NULL AFTER bank_account_number;
