-- Add website link field for NGO/Vet map profiles
ALTER TABLE ngo_applications
  ADD COLUMN website VARCHAR(255) DEFAULT NULL
  AFTER org_description;
