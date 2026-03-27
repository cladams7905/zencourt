# Database ERD

This diagram is a human-facing snapshot of the current DB relationships in `@zencourt/db`.
The source of truth remains the Drizzle schema in `packages/db/drizzle/schema/*`.

## Mermaid ERD

```mermaid
erDiagram
  listings {
    text id PK
    text user_id
    text title
    text address
    timestamp last_opened_at
    jsonb property_details
    text property_details_source
    timestamp property_details_fetched_at
    text property_details_revision
    listing_stage listing_stage
    timestamp created_at
    timestamp updated_at
  }

  content {
    text id PK
    text listing_id FK
    text user_id
    content_type content_type
    content_status status
    text content_url
    text thumbnail_url
    jsonb metadata
    boolean is_favorite
    timestamp created_at
    timestamp updated_at
  }

  listing_images {
    text id PK
    text listing_id FK
    text filename
    text url
    varchar category
    real confidence
    real primary_score
    boolean is_primary
    jsonb metadata
    timestamp uploaded_at
  }

  video_gen_batch {
    text id PK
    text listing_id FK
    video_status status
    text error_message
    timestamp created_at
    timestamp updated_at
  }

  video_clips {
    text id PK
    text listing_id FK
    text room_id
    text room_name
    text category
    integer clip_index
    integer sort_order
    text current_video_clip_version_id FK
    timestamp created_at
    timestamp updated_at
  }

  video_clip_versions {
    text id PK
    text video_clip_id FK
    integer version_number
    video_status status
    text video_url
    text thumbnail_url
    integer duration_seconds
    jsonb metadata
    text error_message
    text orientation
    text generation_model
    jsonb image_urls
    text prompt
    text source_video_gen_job_id FK
    timestamp created_at
    timestamp updated_at
  }

  video_gen_jobs {
    text id PK
    text video_gen_batch_id FK
    text video_clip_version_id FK
    text request_id
    video_status status
    text video_url
    text thumbnail_url
    jsonb generation_settings
    jsonb metadata
    timestamp created_at
    timestamp updated_at
    text error_message
  }

  user_additional {
    text user_id PK
    account_type account_type
    text location
    referral_source referral_source
    text referral_source_other
    target_audience[] target_audiences
    text audience_description
    integer weekly_posting_frequency
    payment_plan payment_plan
    integer weekly_generation_limit
    text headshot_image_url
    text personal_logo_image_url
    timestamp survey_completed_at
    text agent_name
    text brokerage_name
    text agent_title
    text agent_bio
    text county
    text[] service_areas
    integer writing_tone_level
    text writing_style_custom
    timestamp profile_completed_at
    timestamp writing_style_completed_at
    timestamp media_uploaded_at
    timestamp created_at
    timestamp updated_at
  }

  user_media {
    text id PK
    text user_id
    media_type type
    text url
    text thumbnail_url
    integer duration_seconds
    integer usage_count
    timestamp uploaded_at
  }

  listings ||--o{ content : "listing_id"
  listings ||--o{ listing_images : "listing_id"
  listings ||--o{ video_gen_batch : "listing_id"
  listings ||--o{ video_clips : "listing_id"

  video_clips ||--o{ video_clip_versions : "video_clip_id"
  video_clips ||--o| video_clip_versions : "id + current_video_clip_version_id"

  video_gen_batch ||--o{ video_gen_jobs : "video_gen_batch_id"
  video_clip_versions o|--o{ video_gen_jobs : "video_clip_version_id"
  video_gen_jobs o|--o{ video_clip_versions : "source_video_gen_job_id"
```

## Notes

- `user_additional.user_id` and `user_media.user_id` are user-owned identifiers, but there is no DB-level foreign key to an `auth.users` table inside this package.
- `video_clips.current_video_clip_version_id` is enforced together with `video_clips.id`, so the selected version must belong to that same clip.
- `video_gen_jobs.video_clip_version_id` points to the version a job is associated with.
- `video_clip_versions.source_video_gen_job_id` points back to the job that created that version.
