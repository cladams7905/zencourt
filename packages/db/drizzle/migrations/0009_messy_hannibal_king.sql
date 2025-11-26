CREATE TYPE "public"."asset_type" AS ENUM('video');--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"type" "asset_type" DEFAULT 'video' NOT NULL,
	"stage" varchar(50) DEFAULT 'upload' NOT NULL,
	"thumbnail_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
INSERT INTO "assets" (
	"id",
	"project_id",
	"type",
	"stage",
	"thumbnail_url",
	"created_at",
	"updated_at"
)
SELECT
	"id",
	"id",
	'video'::asset_type,
	"stage",
	"thumbnail_url",
	"created_at",
	"updated_at"
FROM "projects";--> statement-breakpoint
CREATE TABLE "collections" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
INSERT INTO "collections" ("id", "project_id", "created_at", "updated_at")
SELECT "id", "id", "created_at", "updated_at" FROM "projects";--> statement-breakpoint
ALTER TABLE "images" RENAME TO "collection_images";--> statement-breakpoint
ALTER TABLE "video_jobs" RENAME TO "video_asset_jobs";--> statement-breakpoint
ALTER TABLE "videos" RENAME TO "video_assets";--> statement-breakpoint
ALTER TABLE "collection_images" RENAME COLUMN "project_id" TO "collection_id";--> statement-breakpoint
ALTER TABLE "video_asset_jobs" RENAME COLUMN "video_id" TO "video_asset_id";--> statement-breakpoint
ALTER TABLE "video_assets" RENAME COLUMN "project_id" TO "asset_id";--> statement-breakpoint
ALTER TABLE "collection_images" DROP CONSTRAINT "images_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "video_asset_jobs" DROP CONSTRAINT "video_jobs_video_id_videos_id_fk";
--> statement-breakpoint
ALTER TABLE "video_assets" DROP CONSTRAINT "videos_project_id_projects_id_fk";
--> statement-breakpoint
DROP INDEX "video_jobs_video_id_idx";--> statement-breakpoint
DROP INDEX "video_jobs_status_idx";--> statement-breakpoint
DROP INDEX "video_jobs_video_status_idx";--> statement-breakpoint
DROP INDEX "video_jobs_status_created_idx";--> statement-breakpoint
DROP INDEX "video_jobs_request_id_idx";--> statement-breakpoint
DROP INDEX "videos_project_id_idx";--> statement-breakpoint
DROP INDEX "videos_status_idx";--> statement-breakpoint
DROP INDEX "videos_project_status_idx";--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_project_id_idx" ON "assets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "assets_type_idx" ON "assets" USING btree ("type");--> statement-breakpoint
CREATE INDEX "collections_project_id_idx" ON "collections" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "collections_created_at_idx" ON "collections" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "collections_project_id_unique" ON "collections" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "collection_images" ADD CONSTRAINT "collection_images_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_asset_jobs" ADD CONSTRAINT "video_asset_jobs_video_asset_id_video_assets_id_fk" FOREIGN KEY ("video_asset_id") REFERENCES "public"."video_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_assets" ADD CONSTRAINT "video_assets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_images_collection_id_idx" ON "collection_images" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "video_asset_jobs_video_asset_id_idx" ON "video_asset_jobs" USING btree ("video_asset_id");--> statement-breakpoint
CREATE INDEX "video_asset_jobs_status_idx" ON "video_asset_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "video_asset_jobs_video_asset_status_idx" ON "video_asset_jobs" USING btree ("video_asset_id","status");--> statement-breakpoint
CREATE INDEX "video_asset_jobs_status_created_idx" ON "video_asset_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "video_asset_jobs_request_id_idx" ON "video_asset_jobs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "video_assets_asset_id_idx" ON "video_assets" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "video_assets_status_idx" ON "video_assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "video_assets_asset_status_idx" ON "video_assets" USING btree ("asset_id","status");--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "stage";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "thumbnail_url";--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "assets" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select "projects"."user_id" = auth.user_id() from "projects" where "projects"."id" = "assets"."project_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "assets" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select "projects"."user_id" = auth.user_id() from "projects" where "projects"."id" = "assets"."project_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "assets" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select "projects"."user_id" = auth.user_id() from "projects" where "projects"."id" = "assets"."project_id")) WITH CHECK ((select "projects"."user_id" = auth.user_id() from "projects" where "projects"."id" = "assets"."project_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "assets" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select "projects"."user_id" = auth.user_id() from "projects" where "projects"."id" = "assets"."project_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "collections" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select "projects"."user_id" = auth.user_id() from "projects" where "projects"."id" = "collections"."project_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "collections" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select "projects"."user_id" = auth.user_id() from "projects" where "projects"."id" = "collections"."project_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "collections" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select "projects"."user_id" = auth.user_id() from "projects" where "projects"."id" = "collections"."project_id")) WITH CHECK ((select "projects"."user_id" = auth.user_id() from "projects" where "projects"."id" = "collections"."project_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "collections" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select "projects"."user_id" = auth.user_id() from "projects" where "projects"."id" = "collections"."project_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-select" ON "collection_images" TO authenticated USING ((select "projects"."user_id" = auth.user_id()
        from "projects"
        join "collections" on "collections"."project_id" = "projects"."id"
        where "collections"."id" = "collection_images"."collection_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-insert" ON "collection_images" TO authenticated WITH CHECK ((select "projects"."user_id" = auth.user_id()
        from "projects"
        join "collections" on "collections"."project_id" = "projects"."id"
        where "collections"."id" = "collection_images"."collection_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "collection_images" TO authenticated USING ((select "projects"."user_id" = auth.user_id()
        from "projects"
        join "collections" on "collections"."project_id" = "projects"."id"
        where "collections"."id" = "collection_images"."collection_id")) WITH CHECK ((select "projects"."user_id" = auth.user_id()
        from "projects"
        join "collections" on "collections"."project_id" = "projects"."id"
        where "collections"."id" = "collection_images"."collection_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "collection_images" TO authenticated USING ((select "projects"."user_id" = auth.user_id()
        from "projects"
        join "collections" on "collections"."project_id" = "projects"."id"
        where "collections"."id" = "collection_images"."collection_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-select" ON "video_asset_jobs" TO authenticated USING ((select "projects"."user_id" = auth.user_id() from "projects"
        join "assets" on "assets"."project_id" = "projects"."id"
        join "video_assets" on "video_assets"."asset_id" = "assets"."id"
        where "video_assets"."id" = "video_asset_jobs"."video_asset_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-insert" ON "video_asset_jobs" TO authenticated WITH CHECK ((select "projects"."user_id" = auth.user_id() from "projects"
        join "assets" on "assets"."project_id" = "projects"."id"
        join "video_assets" on "video_assets"."asset_id" = "assets"."id"
        where "video_assets"."id" = "video_asset_jobs"."video_asset_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "video_asset_jobs" TO authenticated USING ((select "projects"."user_id" = auth.user_id() from "projects"
        join "assets" on "assets"."project_id" = "projects"."id"
        join "video_assets" on "video_assets"."asset_id" = "assets"."id"
        where "video_assets"."id" = "video_asset_jobs"."video_asset_id")) WITH CHECK ((select "projects"."user_id" = auth.user_id() from "projects"
        join "assets" on "assets"."project_id" = "projects"."id"
        join "video_assets" on "video_assets"."asset_id" = "assets"."id"
        where "video_assets"."id" = "video_asset_jobs"."video_asset_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "video_asset_jobs" TO authenticated USING ((select "projects"."user_id" = auth.user_id() from "projects"
        join "assets" on "assets"."project_id" = "projects"."id"
        join "video_assets" on "video_assets"."asset_id" = "assets"."id"
        where "video_assets"."id" = "video_asset_jobs"."video_asset_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-select" ON "video_assets" TO authenticated USING ((select "projects"."user_id" = auth.user_id() from "projects" join "assets" on "assets"."project_id" = "projects"."id" where "assets"."id" = "video_assets"."asset_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-insert" ON "video_assets" TO authenticated WITH CHECK ((select "projects"."user_id" = auth.user_id() from "projects" join "assets" on "assets"."project_id" = "projects"."id" where "assets"."id" = "video_assets"."asset_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "video_assets" TO authenticated USING ((select "projects"."user_id" = auth.user_id() from "projects" join "assets" on "assets"."project_id" = "projects"."id" where "assets"."id" = "video_assets"."asset_id")) WITH CHECK ((select "projects"."user_id" = auth.user_id() from "projects" join "assets" on "assets"."project_id" = "projects"."id" where "assets"."id" = "video_assets"."asset_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "video_assets" TO authenticated USING ((select "projects"."user_id" = auth.user_id() from "projects" join "assets" on "assets"."project_id" = "projects"."id" where "assets"."id" = "video_assets"."asset_id"));
