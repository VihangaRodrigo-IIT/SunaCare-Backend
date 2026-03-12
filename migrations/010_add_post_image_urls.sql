ALTER TABLE posts
  ADD COLUMN image_urls MEDIUMTEXT NULL COMMENT 'JSON array of image URLs' AFTER image_url;