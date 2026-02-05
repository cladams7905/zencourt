DROP POLICY "crud-authenticated-policy-select" ON "video_render_jobs" CASCADE;--> statement-breakpoint
DROP POLICY "crud-authenticated-policy-insert" ON "video_render_jobs" CASCADE;--> statement-breakpoint
DROP POLICY "crud-authenticated-policy-update" ON "video_render_jobs" CASCADE;--> statement-breakpoint
DROP POLICY "crud-authenticated-policy-delete" ON "video_render_jobs" CASCADE;--> statement-breakpoint
DROP TABLE "video_render_jobs" CASCADE;--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "content_url" text;--> statement-breakpoint
ALTER TABLE "video_gen_batch" DROP COLUMN "video_url";--> statement-breakpoint
ALTER TABLE "video_gen_batch" DROP COLUMN "thumbnail_url";