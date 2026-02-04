CREATE TABLE "video_render_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"video_content_id" text NOT NULL,
	"status" "video_status" DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0,
	"video_url" text,
	"thumbnail_url" text,
	"error_message" text,
	"error_type" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "video_render_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "video_content_jobs" ALTER COLUMN "generation_model" SET DEFAULT 'runway-gen4-turbo';--> statement-breakpoint
ALTER TABLE "video_render_jobs" ADD CONSTRAINT "video_render_jobs_video_content_id_video_content_id_fk" FOREIGN KEY ("video_content_id") REFERENCES "public"."video_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_render_jobs_video_content_id_idx" ON "video_render_jobs" USING btree ("video_content_id");--> statement-breakpoint
CREATE INDEX "video_render_jobs_status_idx" ON "video_render_jobs" USING btree ("status");--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "video_render_jobs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select "content"."user_id" = auth.user_id() from "content"
        join "video_content" on "video_content"."content_id" = "content"."id"
        where "video_content"."id" = "video_render_jobs"."video_content_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "video_render_jobs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select "content"."user_id" = auth.user_id() from "content"
        join "video_content" on "video_content"."content_id" = "content"."id"
        where "video_content"."id" = "video_render_jobs"."video_content_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "video_render_jobs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select "content"."user_id" = auth.user_id() from "content"
        join "video_content" on "video_content"."content_id" = "content"."id"
        where "video_content"."id" = "video_render_jobs"."video_content_id")) WITH CHECK ((select "content"."user_id" = auth.user_id() from "content"
        join "video_content" on "video_content"."content_id" = "content"."id"
        where "video_content"."id" = "video_render_jobs"."video_content_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "video_render_jobs" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select "content"."user_id" = auth.user_id() from "content"
        join "video_content" on "video_content"."content_id" = "content"."id"
        where "video_content"."id" = "video_render_jobs"."video_content_id"));