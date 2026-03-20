-- Add responder-controlled image visibility toggle for public live map cards
ALTER TABLE reports
  ADD COLUMN hide_media_from_public TINYINT(1) NOT NULL DEFAULT 0
  AFTER show_on_user_map;
