CREATE TABLE IF NOT EXISTS post_comment_likes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  comment_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_post_comment_user (comment_id, user_id),
  INDEX idx_post_comment_likes_comment (comment_id),
  INDEX idx_post_comment_likes_user (user_id),
  CONSTRAINT fk_post_comment_likes_comment FOREIGN KEY (comment_id) REFERENCES post_comments(id) ON DELETE CASCADE,
  CONSTRAINT fk_post_comment_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);