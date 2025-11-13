ALTER TABLE "videos" ALTER COLUMN "video_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ALTER COLUMN "duration" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "archive_batch_id" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "archive_label" text;