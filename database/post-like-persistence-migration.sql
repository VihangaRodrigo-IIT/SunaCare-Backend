-- Ensure community likes are stored and recoverable from DB
USE sunacare;

-- 1) Ensure aggregate like counter exists on posts
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS likes INT NOT NULL DEFAULT 0;

-- 2) Ensure normalized like history table exists
CREATE TABLE IF NOT EXISTS post_likes (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id    INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_post_user (post_id, user_id),
  INDEX idx_post_likes_post (post_id),
  INDEX idx_post_likes_user (user_id),
  CONSTRAINT fk_post_likes_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_post_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3) Backfill aggregate likes from the normalized table for consistency
UPDATE posts p
LEFT JOIN (
  SELECT post_id, COUNT(*) AS like_count
  FROM post_likes
  GROUP BY post_id
) l ON l.post_id = p.id
SET p.likes = COALESCE(l.like_count, 0);
