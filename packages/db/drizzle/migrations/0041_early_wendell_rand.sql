ALTER TABLE "video_gen_jobs" DROP CONSTRAINT "video_gen_jobs_video_clip_id_video_clips_id_fk";
--> statement-breakpoint
DROP INDEX "video_gen_jobs_video_clip_id_idx";--> statement-breakpoint
ALTER TABLE "video_clips" DROP CONSTRAINT "video_clips_current_video_clip_version_id_video_clip_versions_id_fk";--> statement-breakpoint
CREATE UNIQUE INDEX "video_clip_versions_clip_id_id_uidx" ON "video_clip_versions" USING btree ("video_clip_id","id");--> statement-breakpoint
ALTER TABLE "video_clips" ADD CONSTRAINT "video_clips_current_video_clip_version_owner_fk" FOREIGN KEY ("id","current_video_clip_version_id") REFERENCES "public"."video_clip_versions"("video_clip_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_gen_jobs" DROP COLUMN "video_clip_id";
