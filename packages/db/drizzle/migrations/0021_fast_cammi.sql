ALTER TABLE "user_media" RENAME COLUMN "created_at" TO "uploaded_at";--> statement-breakpoint
ALTER TABLE "user_media" ADD COLUMN "usage_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_media" DROP COLUMN "storage_key";--> statement-breakpoint
ALTER TABLE "user_media" DROP COLUMN "thumbnail_url";--> statement-breakpoint
ALTER TABLE "user_media" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "user_media" DROP COLUMN "updated_at";