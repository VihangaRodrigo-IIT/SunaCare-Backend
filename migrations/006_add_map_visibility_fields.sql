-- Add map visibility and pinning controls for NGO/Vet locations
ALTER TABLE ngo_applications
  ADD COLUMN latitude DECIMAL(10,7) DEFAULT NULL AFTER coverage_radius_km,
  ADD COLUMN longitude DECIMAL(10,7) DEFAULT NULL AFTER latitude,
  ADD COLUMN map_pinned TINYINT(1) NOT NULL DEFAULT 0 AFTER longitude,
  ADD COLUMN show_on_user_map TINYINT(1) NOT NULL DEFAULT 1 AFTER map_pinned,
  ADD COLUMN pinned_by INT DEFAULT NULL AFTER show_on_user_map;

-- Add map publishing controls for reports
ALTER TABLE reports
  ADD COLUMN show_on_user_map TINYINT(1) NOT NULL DEFAULT 0 AFTER share_with_ngo,
  ADD COLUMN map_published_by INT DEFAULT NULL AFTER show_on_user_map,
  ADD COLUMN map_published_at DATETIME DEFAULT NULL AFTER map_published_by;
