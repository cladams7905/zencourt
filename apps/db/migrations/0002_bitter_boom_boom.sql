CREATE TABLE "video_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0,
	"video_url" text,
	"thumbnail_url" text,
	"duration" integer,
	"resolution" jsonb,
	"error_message" text,
	"error_type" varchar(100),
	"error_retryable" jsonb,
	"composition_settings" jsonb,
	"estimated_duration" integer,
	"queue_position" integer,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "video_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_jobs_project_id_idx" ON "video_jobs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "video_jobs_user_id_idx" ON "video_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "video_jobs_status_idx" ON "video_jobs" USING btree ("status");--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "video_jobs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.user_id() = "video_jobs"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "video_jobs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "video_jobs"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "video_jobs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "video_jobs"."user_id")) WITH CHECK ((select auth.user_id() = "video_jobs"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "video_jobs" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "video_jobs"."user_id"));