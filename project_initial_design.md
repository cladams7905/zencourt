## Project Initial Design

### Overview

My project for the semester is continuing to build my startup, which is an AI for real estate agents that assists with marketing by creating home walkthrough videos from real estate photos. Currently, I have a working prototype with a minimal feature set, but I want to expand my feature set to include video editing, logo overlays, and branding customization.

Below is the basic schema I am thinking about adding to my project. The fields still need to be flushed out, but this is the general idea I am going for:

```sql
CREATE TABLE `video`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `collection_id` BIGINT NOT NULL,
    `created_at` DATETIME NOT NULL,
    `blobUrl` TEXT NOT NULL,
    `description` TEXT NOT NULL,
    `length` BIGINT NOT NULL
);
CREATE TABLE `collection`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` BIGINT NOT NULL,
    `created_at` DATETIME NOT NULL
);
CREATE TABLE `image`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `collection_id` BIGINT NOT NULL,
    `imageUrl` TEXT NOT NULL,
    `created_at` DATETIME NOT NULL
);
ALTER TABLE
    `image` ADD CONSTRAINT `image_imageurl_foreign` FOREIGN KEY(`imageUrl`) REFERENCES `collection`(`id`);
ALTER TABLE
    `video` ADD CONSTRAINT `video_collection_id_foreign` FOREIGN KEY(`collection_id`) REFERENCES `collection`(`id`);
```

### Goals

Here is my tentative plan for the project until the end of class:

- **Week 1:** finish logo and branding overlays
- **Week 2:** add video segment regeneration and hallucination detection
- **Week 3:** build rough framework for video editor
- **Week 4:** finish video editor v1.0
- **Week 5:** add social media integrationss

### Tech stack

#### Frontend

- Nextjs
- Tailwind css for stying
- Typescript

#### Backend

- Neon.sh for hosting postrgres db
- Drizzle ORM
- Neon Data API to handle authentication
