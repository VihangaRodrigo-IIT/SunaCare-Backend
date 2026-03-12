-- Sunacare minimal seed for fresh testing
-- Run AFTER schema.sql
-- This file intentionally contains only essential login/bootstrap records.

USE sunacare;

SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM article_views;
DELETE FROM articles;
DELETE FROM post_comment_reports;
DELETE FROM post_likes;
DELETE FROM post_comments;
DELETE FROM posts;
DELETE FROM donations;
DELETE FROM campaigns;
DELETE FROM adoption_applications;
DELETE FROM pet_reports;
DELETE FROM pets;
DELETE FROM reports;
DELETE FROM otp_verifications;
DELETE FROM ngo_verifications;
DELETE FROM ngo_applications;
DELETE FROM users;

ALTER TABLE article_views AUTO_INCREMENT = 1;
ALTER TABLE articles AUTO_INCREMENT = 1;
ALTER TABLE post_comment_reports AUTO_INCREMENT = 1;
ALTER TABLE post_likes AUTO_INCREMENT = 1;
ALTER TABLE post_comments AUTO_INCREMENT = 1;
ALTER TABLE posts AUTO_INCREMENT = 1;
ALTER TABLE donations AUTO_INCREMENT = 1;
ALTER TABLE campaigns AUTO_INCREMENT = 1;
ALTER TABLE adoption_applications AUTO_INCREMENT = 1;
ALTER TABLE pet_reports AUTO_INCREMENT = 1;
ALTER TABLE pets AUTO_INCREMENT = 1;
ALTER TABLE reports AUTO_INCREMENT = 1;
ALTER TABLE otp_verifications AUTO_INCREMENT = 1;
ALTER TABLE ngo_verifications AUTO_INCREMENT = 1;
ALTER TABLE ngo_applications AUTO_INCREMENT = 1;
ALTER TABLE users AUTO_INCREMENT = 1;
SET FOREIGN_KEY_CHECKS = 1;

-- Passwords:
-- admin@sunacare.com / Admin1234!
-- responder@pawsrescue.com / Rescue123!
-- jane@sunacare.com / User1234!

INSERT INTO users
  (id, name, email, password, role, phone, location, bio, org_name, avatar, is_active, email_verified, created_at, updated_at)
VALUES
  (1, 'Platform Admin', 'admin@sunacare.com', '$2b$12$1a1F34FcsEfrSUqfsBn8aenLaWabD0PTpmbuhSCvmtkG9gqsIvIyO', 'admin', '+94 11 2345678', 'Colombo, Sri Lanka', 'Platform administrator for Sunacare.', NULL, NULL, 1, 1, NOW(), NOW()),
  (2, 'Amara Perera', 'responder@pawsrescue.com', '$2b$12$uRun/0wqjgZFwlU4Z4A2OOVMxGkFSSyiQZ48tzMJpQoq1bS4nErzO', 'responder', '+94 77 1234567', 'Colombo, Sri Lanka', 'Responder account for NGO-side testing.', 'PAWS Rescue Lanka', NULL, 1, 1, NOW(), NOW()),
  (3, 'Nimali Silva', 'jane@sunacare.com', '$2b$12$Kz1ONsbdPm7i5ISoBrebH.wF6518bSvMieE2yQvM/oHRcXzpUvwMK', 'user', '+94 77 9876543', 'Negombo, Sri Lanka', 'User-side testing account.', NULL, NULL, 1, 1, NOW(), NOW());

INSERT INTO ngo_applications
  (id, contact_name, email, phone, org_name, org_type, org_address, org_description, registration_no, document_url,
   coverage_radius_km, approval_status, review_note, reviewed_by, reviewed_at, latitude, longitude, map_pinned, show_on_user_map,
   pinned_by, created_at, updated_at)
VALUES
  (1, 'Amara Perera', 'responder@pawsrescue.com', '+94 77 1234567', 'PAWS Rescue Lanka', 'rescue',
   'Colombo, Sri Lanka', 'Approved responder organization for testing.', 'NGO-TEST-001', NULL,
   25, 'approved', 'Bootstrap responder organization', 1, NOW(), NULL, NULL, 0, 1,
   NULL, NOW(), NOW());

UPDATE users
SET ngo_application_id = 1
WHERE id = 2;

INSERT INTO ngo_verifications
  (application_id, user_id, username, password_plain, email_sent, created_at, updated_at)
VALUES
  (1, 2, 'pawsrescue', 'Rescue123!', 1, NOW(), NOW());
