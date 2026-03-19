CREATE TABLE "clip_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"clip_id" text NOT NULL,
	"listing_id" text NOT NULL,
	"room_id" text,
	"room_name" text NOT NULL,
	"category" text NOT NULL,
	"clip_index" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"version_number" integer NOT NULL,
	"status" "video_status" DEFAULT 'pending' NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"video_url" text,
	"thumbnail_url" text,
	"duration_seconds" integer,
	"metadata" jsonb,
	"error_message" text,
	"orientation" text NOT NULL,
	"generation_model" text NOT NULL,
	"image_urls" jsonb NOT NULL,
	"prompt" text NOT NULL,
	"ai_directions" text DEFAULT '' NOT NULL,
	"source_video_gen_job_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clip_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clip_versions" ADD CONSTRAINT "clip_versions_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_versions" ADD CONSTRAINT "clip_versions_source_video_gen_job_id_video_gen_jobs_id_fk" FOREIGN KEY ("source_video_gen_job_id") REFERENCES "public"."video_gen_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clip_versions_listing_id_idx" ON "clip_versions" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "clip_versions_listing_is_current_idx" ON "clip_versions" USING btree ("listing_id","is_current");--> statement-breakpoint
CREATE INDEX "clip_versions_clip_id_idx" ON "clip_versions" USING btree ("clip_id");--> statement-breakpoint
CREATE INDEX "clip_versions_listing_clip_id_idx" ON "clip_versions" USING btree ("listing_id","clip_id");--> statement-breakpoint
CREATE INDEX "clip_versions_source_video_gen_job_id_idx" ON "clip_versions" USING btree ("source_video_gen_job_id");--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "clip_versions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select "listings"."user_id" = auth.user_id() from "listings"
        where "listings"."id" = "clip_versions"."listing_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "clip_versions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select "listings"."user_id" = auth.user_id() from "listings"
        where "listings"."id" = "clip_versions"."listing_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "clip_versions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select "listings"."user_id" = auth.user_id() from "listings"
        where "listings"."id" = "clip_versions"."listing_id")) WITH CHECK ((select "listings"."user_id" = auth.user_id() from "listings"
        where "listings"."id" = "clip_versions"."listing_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "clip_versions" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select "listings"."user_id" = auth.user_id() from "listings"
        where "listings"."id" = "clip_versions"."listing_id"));