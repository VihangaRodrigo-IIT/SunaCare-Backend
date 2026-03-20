-- ─────────────────────────────────────────────────────────────────
--  Sunacare Database Schema  — 17 tables
--  Import via phpMyAdmin or run: mysql -u root sunacare < schema.sql
-- ─────────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS sunacare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sunacare;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS user_settings;
DROP TABLE IF EXISTS article_views;
DROP TABLE IF EXISTS articles;
DROP TABLE IF EXISTS post_comment_reports;
DROP TABLE IF EXISTS post_likes;
DROP TABLE IF EXISTS post_comments;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS donations;
DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS adoption_applications;
DROP TABLE IF EXISTS pet_reports;
DROP TABLE IF EXISTS pets;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS otp_verifications;
DROP TABLE IF EXISTS ngo_verifications;
DROP TABLE IF EXISTS ngo_applications;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ── 1. users ─────────────────────────────────────────────────────
CREATE TABLE users (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name                 VARCHAR(100) NOT NULL,
  email                VARCHAR(150) NOT NULL UNIQUE,
  password             VARCHAR(255) NOT NULL,
  role                 ENUM('user','responder','admin') NOT NULL DEFAULT 'user',
  phone                VARCHAR(30)  DEFAULT NULL,
  location             VARCHAR(255) DEFAULT NULL,
  bio                  TEXT         DEFAULT NULL,
  org_name             VARCHAR(200) DEFAULT NULL,
  avatar               VARCHAR(500) DEFAULT NULL,
  ngo_application_id   INT UNSIGNED DEFAULT NULL,
  is_active            TINYINT(1)   NOT NULL DEFAULT 1,
  email_verified       TINYINT(1)   NOT NULL DEFAULT 0,
  last_login           DATETIME     DEFAULT NULL,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role        (role),
  INDEX idx_is_active   (is_active),
  INDEX idx_ngo_app     (ngo_application_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 2. ngo_applications ──────────────────────────────────────────
CREATE TABLE ngo_applications (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contact_name         VARCHAR(100) NOT NULL,
  email                VARCHAR(150) NOT NULL,
  phone                VARCHAR(30)  DEFAULT NULL,
  org_name             VARCHAR(200) NOT NULL,
  org_type             ENUM('ngo','vet','shelter','rescue') NOT NULL DEFAULT 'ngo',
  org_address          TEXT         DEFAULT NULL,
  org_description      TEXT         DEFAULT NULL,
  registration_no      VARCHAR(100) DEFAULT NULL,
  document_url         VARCHAR(500) DEFAULT NULL,
  coverage_radius_km   INT          DEFAULT NULL,
  approval_status      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  review_note          TEXT         DEFAULT NULL,
  reviewed_by          INT UNSIGNED DEFAULT NULL,
  reviewed_at          DATETIME     DEFAULT NULL,
  latitude             DECIMAL(10,7) DEFAULT NULL,
  longitude            DECIMAL(10,7) DEFAULT NULL,
  map_pinned           TINYINT(1)   NOT NULL DEFAULT 0,
  show_on_user_map     TINYINT(1)   NOT NULL DEFAULT 1,
  pinned_by            INT          DEFAULT NULL,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status      (approval_status),
  INDEX idx_email       (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 3. ngo_verifications ─────────────────────────────────────────
CREATE TABLE ngo_verifications (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id   INT UNSIGNED NOT NULL UNIQUE,
  user_id          INT UNSIGNED NOT NULL UNIQUE,
  username         VARCHAR(100) NOT NULL UNIQUE,
  password_plain   VARCHAR(255) DEFAULT NULL  COMMENT 'Admin-generated plain password for display',
  email_sent       TINYINT(1)   NOT NULL DEFAULT 0,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES ngo_applications(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)        REFERENCES users(id)            ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 4. otp_verifications ─────────────────────────────────────────
CREATE TABLE otp_verifications (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  identifier   VARCHAR(150) NOT NULL  COMMENT 'Email or phone',
  otp_code     VARCHAR(6)   NOT NULL,
  type         ENUM('email_verification','password_reset','phone_verification') NOT NULL DEFAULT 'email_verification',
  expires_at   DATETIME     NOT NULL,
  is_used      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lookup (identifier, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 5. reports ───────────────────────────────────────────────────
CREATE TABLE reports (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_number    VARCHAR(20)   DEFAULT NULL UNIQUE,
  category         ENUM('cat','dog','other') NOT NULL,
  issue            VARCHAR(255)  NOT NULL,
  description      TEXT          DEFAULT NULL,
  animal_count     INT           NOT NULL DEFAULT 1,
  tags             TEXT          DEFAULT NULL  COMMENT 'JSON array',
  urgency          ENUM('low','medium','urgent') NOT NULL DEFAULT 'medium',
  status           ENUM('pending','in-treatment','rescued','closed') NOT NULL DEFAULT 'pending',
  lat              DECIMAL(10,7) DEFAULT NULL,
  lng              DECIMAL(10,7) DEFAULT NULL,
  address          VARCHAR(500)  DEFAULT NULL,
  landmark         VARCHAR(255)  DEFAULT NULL,
  media_url        VARCHAR(500)  DEFAULT NULL,
  contact_name     VARCHAR(100)  DEFAULT NULL,
  contact_phone    VARCHAR(30)   DEFAULT NULL,
  contact_method   ENUM('email','phone') DEFAULT NULL,
  contact_value    VARCHAR(150)  DEFAULT NULL,
  wants_follow_up  TINYINT(1)    NOT NULL DEFAULT 0,
  share_with_ngo   TINYINT(1)    NOT NULL DEFAULT 1,
  consent          TINYINT(1)    NOT NULL DEFAULT 0,
  is_flagged       TINYINT(1)    NOT NULL DEFAULT 0,
  flag_count       INT           NOT NULL DEFAULT 0,
  show_on_user_map TINYINT(1)    NOT NULL DEFAULT 0,
  map_published_by INT           DEFAULT NULL,
  map_published_at DATETIME      DEFAULT NULL,
  created_by       INT UNSIGNED  DEFAULT NULL  COMMENT 'NULL = guest reporter',
  assigned_to      INT UNSIGNED  DEFAULT NULL,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status      (status),
  INDEX idx_urgency     (urgency),
  INDEX idx_category    (category),
  INDEX idx_created_by  (created_by),
  INDEX idx_assigned_to (assigned_to),
  INDEX idx_is_flagged  (is_flagged),
  FOREIGN KEY (created_by)  REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 6. pets ──────────────────────────────────────────────────────
CREATE TABLE pets (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  species      ENUM('dog','cat','bird','rabbit','other') NOT NULL,
  breed        VARCHAR(100) DEFAULT NULL,
  age_years    INT          DEFAULT NULL,
  age_months   INT          DEFAULT NULL,
  gender       ENUM('male','female','unknown') NOT NULL DEFAULT 'unknown',
  size         ENUM('small','medium','large')  DEFAULT NULL,
  color        VARCHAR(100) DEFAULT NULL,
  description  TEXT         DEFAULT NULL,
  health_notes TEXT         DEFAULT NULL,
  ideal_home   TEXT         DEFAULT NULL,
  location     VARCHAR(255) DEFAULT NULL,
  status       ENUM('available','pending','adopted') NOT NULL DEFAULT 'available',
  urgent       TINYINT(1)   NOT NULL DEFAULT 0,
  vaccinated   TINYINT(1)   NOT NULL DEFAULT 0,
  neutered     TINYINT(1)   NOT NULL DEFAULT 0,
  microchipped TINYINT(1)   NOT NULL DEFAULT 0,
  dewormed     TINYINT(1)   NOT NULL DEFAULT 0,
  image_url    MEDIUMTEXT   DEFAULT NULL,
  contact_name  VARCHAR(100) DEFAULT NULL,
  contact_phone VARCHAR(50)  DEFAULT NULL,
  contact_email VARCHAR(255) DEFAULT NULL,
  posted_by    INT UNSIGNED DEFAULT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status    (status),
  INDEX idx_species   (species),
  INDEX idx_posted_by (posted_by),
  FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 7. pet_reports ───────────────────────────────────────────────
CREATE TABLE pet_reports (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pet_id          INT UNSIGNED DEFAULT NULL,
  reported_by     INT UNSIGNED DEFAULT NULL,
  reason          ENUM(
    'scam_payment',
    'inappropriate_images',
    'misleading_description',
    'fake_listing',
    'suspicious_contact',
    'other'
  ) NOT NULL,
  affected_fields TEXT         DEFAULT NULL COMMENT 'JSON array',
  details         TEXT         DEFAULT NULL,
  reporter_name   VARCHAR(100) DEFAULT NULL,
  reporter_email  VARCHAR(150) DEFAULT NULL,
  status          ENUM('pending','reviewed','dismissed') NOT NULL DEFAULT 'pending',
  admin_note      TEXT         DEFAULT NULL,
  resolved_at     DATETIME     DEFAULT NULL,
    action_taken    ENUM('delete','keep_pending','dismiss') DEFAULT NULL COMMENT 'Admin action that resolved these reports',
    pet_name_snapshot VARCHAR(150) DEFAULT NULL COMMENT 'Pet name preserved for history after deletion',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pet_id      (pet_id),
  INDEX idx_reported_by (reported_by),
  INDEX idx_status      (status),
  INDEX idx_action_taken (action_taken),
  FOREIGN KEY (pet_id)      REFERENCES pets(id)  ON DELETE SET NULL,
  FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 8. campaigns ─────────────────────────────────────────────────
CREATE TABLE campaigns (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(255)    NOT NULL,
  description  TEXT            DEFAULT NULL,
  campaign_for TEXT            DEFAULT NULL,
  category     VARCHAR(100)    DEFAULT NULL,
  image        MEDIUMTEXT      DEFAULT NULL,
  bank_name           VARCHAR(150)    DEFAULT NULL,
  bank_account_name   VARCHAR(180)    DEFAULT NULL,
  bank_account_number VARCHAR(80)     DEFAULT NULL,
  bank_branch         VARCHAR(150)    DEFAULT NULL,
  goal_amount  DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  raised       DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  status       ENUM('draft','active','closed') NOT NULL DEFAULT 'draft',
  approval_status ENUM('pending','approved','discarded') NOT NULL DEFAULT 'pending',
  review_note   TEXT            DEFAULT NULL,
  submitted_at  DATETIME        DEFAULT CURRENT_TIMESTAMP,
  reviewed_at   DATETIME        DEFAULT NULL,
  reviewed_by   INT UNSIGNED    DEFAULT NULL,
  end_date     DATE            DEFAULT NULL,
  created_by   INT UNSIGNED    DEFAULT NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status     (status),
  INDEX idx_approval_status (approval_status),
  INDEX idx_created_by (created_by),
  INDEX idx_reviewed_by (reviewed_by),
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 9. donations ─────────────────────────────────────────────────
CREATE TABLE donations (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id  INT UNSIGNED    NOT NULL,
  donor_id     INT UNSIGNED    DEFAULT NULL  COMMENT 'NULL = guest / anonymous',
  amount       DECIMAL(12,2)   NOT NULL,
  message      TEXT            DEFAULT NULL,
  is_anonymous TINYINT(1)      NOT NULL DEFAULT 0,
  payment_method ENUM('bank_transfer') NOT NULL DEFAULT 'bank_transfer',
  donor_name      VARCHAR(100)  DEFAULT NULL,
  bank_reference  VARCHAR(120)  DEFAULT NULL,
  receipt_url     MEDIUMTEXT    DEFAULT NULL,
  receipt_name    VARCHAR(255)  DEFAULT NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_campaign_id (campaign_id),
  INDEX idx_donor_id    (donor_id),
  INDEX idx_payment_method (payment_method),
  INDEX idx_bank_reference (bank_reference),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (donor_id)    REFERENCES users(id)     ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 10. posts ────────────────────────────────────────────────────
CREATE TABLE posts (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(255) DEFAULT NULL,
  body       TEXT         NOT NULL,
  image_url  VARCHAR(500) DEFAULT NULL,
  image_urls MEDIUMTEXT   DEFAULT NULL COMMENT 'JSON array of image URLs',
  post_type  VARCHAR(50)  DEFAULT NULL,
  author_id  INT UNSIGNED NOT NULL,
  is_flagged TINYINT(1)   NOT NULL DEFAULT 0,
  flag_count INT          NOT NULL DEFAULT 0,
  is_pinned  TINYINT(1)   NOT NULL DEFAULT 0,
  likes      INT          NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_author_id (author_id),
  INDEX idx_is_flagged (is_flagged),
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 11. post_comments ────────────────────────────────────────────
CREATE TABLE post_comments (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id   INT UNSIGNED NOT NULL,
  author_id INT UNSIGNED NOT NULL,
  body      TEXT         NOT NULL,
  image_url VARCHAR(500) DEFAULT NULL,
  is_flagged TINYINT(1)  NOT NULL DEFAULT 0,
  flag_count INT         NOT NULL DEFAULT 0,
  hidden    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_post_id (post_id),
  INDEX idx_comment_flagged (is_flagged),
  INDEX idx_comment_hidden (hidden),
  FOREIGN KEY (post_id)   REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 12. post_comment_reports ────────────────────────────────────
CREATE TABLE post_comment_reports (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  comment_id  INT UNSIGNED NOT NULL,
  reporter_id INT UNSIGNED NOT NULL,
  reason      VARCHAR(120) NOT NULL DEFAULT 'other',
  details     VARCHAR(500) DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_comment_reporter (comment_id, reporter_id),
  INDEX idx_comment_reports_comment (comment_id),
  INDEX idx_comment_reports_reporter (reporter_id),
  FOREIGN KEY (comment_id)  REFERENCES post_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 13. post_likes ───────────────────────────────────────────────
CREATE TABLE post_likes (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id    INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_post_user (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 14. post_comment_likes ───────────────────────────────────────
CREATE TABLE post_comment_likes (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  comment_id INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_post_comment_user (comment_id, user_id),
  FOREIGN KEY (comment_id) REFERENCES post_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 15. articles ─────────────────────────────────────────────────
CREATE TABLE articles (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  summary       TEXT         DEFAULT NULL,
  content       LONGTEXT     NOT NULL,
  category      VARCHAR(100) DEFAULT NULL,
  tags          TEXT         DEFAULT NULL  COMMENT 'JSON array',
  cover_url     VARCHAR(500) DEFAULT NULL,
  read_time_min INT          DEFAULT NULL,
  status        ENUM('draft','published') NOT NULL DEFAULT 'draft',
  author_id     INT UNSIGNED NOT NULL,
  display_author_name VARCHAR(255) DEFAULT NULL,
  view_count    INT          NOT NULL DEFAULT 0,
  published_at  DATETIME     DEFAULT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status     (status),
  INDEX idx_author_id  (author_id),
  INDEX idx_category   (category),
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 15. article_views ────────────────────────────────────────────
CREATE TABLE article_views (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  article_id  INT UNSIGNED  NOT NULL,
  user_id     INT UNSIGNED  DEFAULT NULL  COMMENT 'NULL = guest viewer',
  ip_address  VARCHAR(45)   DEFAULT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_article_id (article_id),
  INDEX idx_user_id    (user_id),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 16. adoption_applications ────────────────────────────────────
CREATE TABLE adoption_applications (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pet_id        INT UNSIGNED NOT NULL,
  applicant_id  INT UNSIGNED NOT NULL,
  message       TEXT         DEFAULT NULL,
  status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pet_id       (pet_id),
  INDEX idx_applicant_id (applicant_id),
  INDEX idx_status       (status),
  FOREIGN KEY (pet_id)       REFERENCES pets(id)  ON DELETE CASCADE,
  FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Foreign key back-fill ────────────────────────────────────────
ALTER TABLE users
  ADD CONSTRAINT fk_users_ngo_app
  FOREIGN KEY (ngo_application_id) REFERENCES ngo_applications(id) ON DELETE SET NULL;

ALTER TABLE ngo_applications
  ADD CONSTRAINT fk_ngo_app_reviewer
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- ── 17. user_settings ────────────────────────────────────────────
-- One row per user. Auto-created on first settings load.
-- Works for all roles: user, responder, admin.
CREATE TABLE user_settings (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id               INT UNSIGNED NOT NULL UNIQUE,
  -- Notification toggles (used by all roles)
  notif_email_reports   TINYINT(1)   NOT NULL DEFAULT 1,
  notif_email_users     TINYINT(1)   NOT NULL DEFAULT 1,
  notif_email_campaigns TINYINT(1)   NOT NULL DEFAULT 0,
  notif_push_reports    TINYINT(1)   NOT NULL DEFAULT 1,
  notif_push_urgent     TINYINT(1)   NOT NULL DEFAULT 1,
  notif_push_system     TINYINT(1)   NOT NULL DEFAULT 1,
  -- Responder-specific settings
  coverage_radius_km    INT          NOT NULL DEFAULT 5,
  auto_assign           TINYINT(1)   NOT NULL DEFAULT 0,
  routing_priority      ENUM('distance','urgency','animal_type') NOT NULL DEFAULT 'distance',
  two_factor_enabled    TINYINT(1)   NOT NULL DEFAULT 0,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
