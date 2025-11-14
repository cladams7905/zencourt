ALTER TABLE "video_jobs" ADD COLUMN "fal_request_id" text;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "fal_submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "fal_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "webhook_received_at" timestamp;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "processing_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "processing_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "fal_video_url" text;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "fal_file_size" integer;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "fal_content_type" text;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "source_video_url" text;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "webhook_status" varchar(50);--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "webhook_attempt_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "webhook_last_error" text;--> statement-breakpoint
CREATE INDEX "video_jobs_fal_request_id_idx" ON "video_jobs" USING btree ("fal_request_id");--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "estimated_duration";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "queue_position";