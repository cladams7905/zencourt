ALTER TABLE "images" RENAME COLUMN "order" TO "sort_order";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP CONSTRAINT "video_jobs_project_id_projects_id_fk";
--> statement-breakpoint
DROP INDEX "video_jobs_project_id_idx";--> statement-breakpoint
DROP INDEX "video_jobs_user_id_idx";--> statement-breakpoint
DROP INDEX "video_jobs_fal_request_id_idx";--> statement-breakpoint
DROP INDEX "videos_room_id_idx";--> statement-breakpoint
DROP INDEX "videos_fal_request_id_idx";--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "videos" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "video_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "request_id" text;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "generation_model" text DEFAULT 'kling1.6' NOT NULL;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "generation_settings" jsonb;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "processing_submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "delivery_attempted_at" timestamp;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "delivery_attempt_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "delivery_last_error" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_jobs_video_id_idx" ON "video_jobs" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "video_jobs_video_status_idx" ON "video_jobs" USING btree ("video_id","status");--> statement-breakpoint
CREATE INDEX "video_jobs_status_created_idx" ON "video_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "video_jobs_request_id_idx" ON "video_jobs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "videos_project_status_idx" ON "videos" USING btree ("project_id","status");--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "format";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "platform";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "video_url";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "duration";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "subtitles";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "video_generation_status";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "final_video_url";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "final_video_duration";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "fal_request_id";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "progress";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "duration";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "resolution";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "composition_settings";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "fal_submitted_at";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "fal_completed_at";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "webhook_received_at";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "processing_started_at";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "fal_video_url";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "fal_file_size";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "fal_content_type";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "source_video_url";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "webhook_status";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "webhook_attempt_count";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "webhook_last_error";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "started_at";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP COLUMN "completed_at";--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN "room_id";--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN "room_name";--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN "duration";--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN "generation_settings";--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN "fal_request_id";--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN "archived_at";--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN "archive_batch_id";--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN "archive_label";--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-select" ON "video_jobs" TO authenticated USING ((select "projects"."user_id" = auth.user_id() from "projects" join "videos" on "videos"."project_id" = "projects"."id" where "videos"."id" = "video_jobs"."video_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-insert" ON "video_jobs" TO authenticated WITH CHECK ((select "projects"."user_id" = auth.user_id() from "projects" join "videos" on "videos"."project_id" = "projects"."id" where "videos"."id" = "video_jobs"."video_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "video_jobs" TO authenticated USING ((select "projects"."user_id" = auth.user_id() from "projects" join "videos" on "videos"."project_id" = "projects"."id" where "videos"."id" = "video_jobs"."video_id")) WITH CHECK ((select "projects"."user_id" = auth.user_id() from "projects" join "videos" on "videos"."project_id" = "projects"."id" where "videos"."id" = "video_jobs"."video_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "video_jobs" TO authenticated USING ((select "projects"."user_id" = auth.user_id() from "projects" join "videos" on "videos"."project_id" = "projects"."id" where "videos"."id" = "video_jobs"."video_id"));