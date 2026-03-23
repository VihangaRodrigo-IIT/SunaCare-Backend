# Schema Merge Log

## Scope
Compared your schema file with your friend's attached schema and only added missing tables/columns from the friend file.

## Your schema before merge
Your original schema already had these major structures that were not in the friend's file:
- users
- ngo_applications
- ngo_verifications
- otp_verifications
- reports
- pets
- pet_reports
- campaigns
- donations
- posts
- post_comments
- post_likes
- articles
- article_views
- adoption_applications

## Added from friend's schema (missing only)

### Table added
- post_comment_reports

### Columns added
- post_comments.image_url
- post_comments.is_flagged
- post_comments.flag_count
- post_comments.hidden

### Indexes added (because they belong to added columns)
- post_comments.idx_comment_flagged
- post_comments.idx_comment_hidden

## Duplicates intentionally not added
The following were already present in your schema and were not duplicated:
- Existing tables (users, reports, pets, campaigns, donations, posts, post_likes, articles, article_views, adoption_applications, ngo_* tables, otp_verifications)
- Existing post_comments base columns (id, post_id, author_id, body, created_at, updated_at)

## Tables present in your schema but not in friend's schema
- pet_reports

## Tables present in friend's schema but not in your original schema
- post_comment_reports

## Notes
- The merge was column/table additive only.
- Existing definitions in your schema were kept as-is unless required for adding missing fields.
