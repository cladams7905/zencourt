CREATE TABLE "video_clip_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"video_clip_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"status" "video_status" DEFAULT 'pending' NOT NULL,
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
CREATE TABLE "video_clips" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"room_id" text,
	"room_name" text NOT NULL,
	"category" text NOT NULL,
	"clip_index" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"current_video_clip_version_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "video_clip_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "video_clips" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "video_gen_jobs" ADD COLUMN "video_clip_id" text;--> statement-breakpoint
ALTER TABLE "video_gen_jobs" ADD COLUMN "video_clip_version_id" text;--> statement-breakpoint
ALTER TABLE "video_clip_versions" ADD CONSTRAINT "video_clip_versions_video_clip_id_video_clips_id_fk" FOREIGN KEY ("video_clip_id") REFERENCES "public"."video_clips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_clip_versions" ADD CONSTRAINT "video_clip_versions_source_video_gen_job_id_video_gen_jobs_id_fk" FOREIGN KEY ("source_video_gen_job_id") REFERENCES "public"."video_gen_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_clips" ADD CONSTRAINT "video_clips_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_clips" ADD CONSTRAINT "video_clips_current_video_clip_version_id_video_clip_versions_id_fk" FOREIGN KEY ("current_video_clip_version_id") REFERENCES "public"."video_clip_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_clip_versions_video_clip_id_idx" ON "video_clip_versions" USING btree ("video_clip_id");--> statement-breakpoint
CREATE INDEX "video_clip_versions_status_idx" ON "video_clip_versions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "video_clip_versions_source_video_gen_job_id_idx" ON "video_clip_versions" USING btree ("source_video_gen_job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "video_clip_versions_clip_version_number_uidx" ON "video_clip_versions" USING btree ("video_clip_id","version_number");--> statement-breakpoint
CREATE INDEX "video_clips_listing_id_idx" ON "video_clips" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "video_clips_listing_sort_order_idx" ON "video_clips" USING btree ("listing_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "video_clips_listing_room_clip_index_uidx" ON "video_clips" USING btree ("listing_id","room_id","room_name","clip_index");--> statement-breakpoint
ALTER TABLE "video_gen_jobs" ADD CONSTRAINT "video_gen_jobs_video_clip_id_video_clips_id_fk" FOREIGN KEY ("video_clip_id") REFERENCES "public"."video_clips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_gen_jobs" ADD CONSTRAINT "video_gen_jobs_video_clip_version_id_video_clip_versions_id_fk" FOREIGN KEY ("video_clip_version_id") REFERENCES "public"."video_clip_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_gen_jobs_video_clip_id_idx" ON "video_gen_jobs" USING btree ("video_clip_id");--> statement-breakpoint
CREATE INDEX "video_gen_jobs_video_clip_version_id_idx" ON "video_gen_jobs" USING btree ("video_clip_version_id");--> statement-breakpoint
CREATE TEMP TABLE "__video_clip_versions_backfill" AS
SELECT
	ranked."id",
	ranked."clip_id",
	ranked."listing_id",
	ranked."room_id",
	ranked."room_name",
	ranked."category",
	ranked."clip_index",
	ranked."sort_order",
	ranked."version_number",
	ranked."status",
	ranked."is_current",
	ranked."video_url",
	ranked."thumbnail_url",
	ranked."duration_seconds",
	ranked."metadata",
	ranked."error_message",
	ranked."orientation",
	ranked."generation_model",
	ranked."image_urls",
	ranked."prompt",
	ranked."ai_directions",
	ranked."source_video_gen_job_id",
	ranked."created_at",
	ranked."updated_at"
FROM (
	SELECT
		cv.*,
		ROW_NUMBER() OVER (
			PARTITION BY cv."clip_id", cv."version_number"
			ORDER BY
				cv."is_current" DESC,
				CASE
					WHEN cv."status" = 'completed' THEN 0
					WHEN cv."status" = 'processing' THEN 1
					WHEN cv."status" = 'pending' THEN 2
					WHEN cv."status" = 'failed' THEN 3
					ELSE 4
				END,
				cv."updated_at" DESC,
				cv."created_at" DESC,
				cv."id" DESC
		) AS "__row_rank"
	FROM "clip_versions" AS cv
) AS ranked
WHERE ranked."__row_rank" = 1;--> statement-breakpoint
INSERT INTO "video_clips" (
	"id",
	"listing_id",
	"room_id",
	"room_name",
	"category",
	"clip_index",
	"sort_order",
	"current_video_clip_version_id",
	"created_at",
	"updated_at"
)
SELECT
	seeded."clip_id",
	seeded."listing_id",
	seeded."room_id",
	seeded."room_name",
	seeded."category",
	seeded."clip_index",
	seeded."sort_order",
	null,
	seeded."created_at",
	seeded."updated_at"
FROM (
	SELECT DISTINCT ON ("clip_id")
		"clip_id",
		"listing_id",
		"room_id",
		"room_name",
		"category",
		"clip_index",
		"sort_order",
		"created_at",
		"updated_at"
	FROM "__video_clip_versions_backfill"
	ORDER BY "clip_id", "is_current" DESC, "version_number" DESC, "created_at" DESC
) AS seeded;--> statement-breakpoint
INSERT INTO "video_clip_versions" (
	"id",
	"video_clip_id",
	"version_number",
	"status",
	"video_url",
	"thumbnail_url",
	"duration_seconds",
	"metadata",
	"error_message",
	"orientation",
	"generation_model",
	"image_urls",
	"prompt",
	"ai_directions",
	"source_video_gen_job_id",
	"created_at",
	"updated_at"
)
SELECT
	"id",
	"clip_id",
	"version_number",
	"status",
	"video_url",
	"thumbnail_url",
	"duration_seconds",
	"metadata",
	"error_message",
	"orientation",
	"generation_model",
	"image_urls",
	"prompt",
	"ai_directions",
	"source_video_gen_job_id",
	"created_at",
	"updated_at"
FROM "__video_clip_versions_backfill";--> statement-breakpoint
UPDATE "video_clips" AS vc
SET
	"current_video_clip_version_id" = chosen."id",
	"updated_at" = GREATEST(vc."updated_at", chosen."updated_at")
FROM (
	SELECT DISTINCT ON ("clip_id")
		"id",
		"clip_id",
		"updated_at"
	FROM "__video_clip_versions_backfill"
	ORDER BY "clip_id", "is_current" DESC, "version_number" DESC, "created_at" DESC
) AS chosen
WHERE vc."id" = chosen."clip_id";--> statement-breakpoint
UPDATE "video_gen_jobs" AS jobs
SET
	"video_clip_id" = cv."clip_id",
	"video_clip_version_id" = cv."id"
FROM "__video_clip_versions_backfill" AS cv
WHERE jobs."id" = cv."source_video_gen_job_id"
	AND (jobs."video_clip_id" IS NULL OR jobs."video_clip_version_id" IS NULL);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "video_clip_versions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((
	select "listings"."user_id" = auth.user_id()
	from "listings"
	join "video_clips" on "video_clips"."listing_id" = "listings"."id"
	where "video_clips"."id" = "video_clip_versions"."video_clip_id"
));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "video_clip_versions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((
	select "listings"."user_id" = auth.user_id()
	from "listings"
	join "video_clips" on "video_clips"."listing_id" = "listings"."id"
	where "video_clips"."id" = "video_clip_versions"."video_clip_id"
));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "video_clip_versions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((
	select "listings"."user_id" = auth.user_id()
	from "listings"
	join "video_clips" on "video_clips"."listing_id" = "listings"."id"
	where "video_clips"."id" = "video_clip_versions"."video_clip_id"
)) WITH CHECK ((
	select "listings"."user_id" = auth.user_id()
	from "listings"
	join "video_clips" on "video_clips"."listing_id" = "listings"."id"
	where "video_clips"."id" = "video_clip_versions"."video_clip_id"
));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "video_clip_versions" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((
	select "listings"."user_id" = auth.user_id()
	from "listings"
	join "video_clips" on "video_clips"."listing_id" = "listings"."id"
	where "video_clips"."id" = "video_clip_versions"."video_clip_id"
));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "video_clips" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select "listings"."user_id" = auth.user_id() from "listings"
        where "listings"."id" = "video_clips"."listing_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "video_clips" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select "listings"."user_id" = auth.user_id() from "listings"
        where "listings"."id" = "video_clips"."listing_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "video_clips" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select "listings"."user_id" = auth.user_id() from "listings"
        where "listings"."id" = "video_clips"."listing_id")) WITH CHECK ((select "listings"."user_id" = auth.user_id() from "listings"
        where "listings"."id" = "video_clips"."listing_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "video_clips" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select "listings"."user_id" = auth.user_id() from "listings"
        where "listings"."id" = "video_clips"."listing_id"));
