CREATE TYPE "public"."account_type" AS ENUM('basic', 'admin');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'scheduled', 'archived');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('video', 'image');--> statement-breakpoint
CREATE TYPE "public"."payment_plan" AS ENUM('free', 'starter', 'growth', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."social_platform" AS ENUM('instagram', 'facebook', 'tiktok', 'youtube', 'linkedin', 'twitter');--> statement-breakpoint
ALTER TYPE "public"."asset_generation_stage" RENAME TO "campaign_stage";--> statement-breakpoint
ALTER TYPE "public"."asset_generation_type" RENAME TO "content_type";--> statement-breakpoint
ALTER TYPE "public"."content_type" ADD VALUE 'post';--> statement-breakpoint
ALTER TYPE "public"."content_type" ADD VALUE 'story';--> statement-breakpoint
CREATE TABLE "image_content" (
	"id" text PRIMARY KEY NOT NULL,
	"content_id" text NOT NULL,
	"image_url" text NOT NULL,
	"text_overlays" jsonb,
	"styles" jsonb,
	"image_order" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "image_content" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_additional" (
	"user_id" text PRIMARY KEY NOT NULL,
	"account_type" "account_type" DEFAULT 'basic' NOT NULL,
	"location" text,
	"payment_plan" "payment_plan" DEFAULT 'free' NOT NULL,
	"weekly_generation_limit" integer,
	"avatar_image_url" text,
	"broker_logo_image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_additional" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_media" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "media_type" NOT NULL,
	"url" text NOT NULL,
	"storage_key" text,
	"thumbnail_url" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_media" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "collections" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY "crud-authenticated-policy-select" ON "collections" CASCADE;--> statement-breakpoint
DROP POLICY "crud-authenticated-policy-insert" ON "collections" CASCADE;--> statement-breakpoint
DROP POLICY "crud-authenticated-policy-update" ON "collections" CASCADE;--> statement-breakpoint
DROP POLICY "crud-authenticated-policy-delete" ON "collections" CASCADE;--> statement-breakpoint
DROP TABLE "collections" CASCADE;--> statement-breakpoint
ALTER TABLE "projects" RENAME TO "campaigns";--> statement-breakpoint
ALTER TABLE "assets" RENAME TO "content";--> statement-breakpoint
ALTER TABLE "collection_images" RENAME TO "campaign_images";--> statement-breakpoint
ALTER TABLE "video_assets" RENAME TO "video_content";--> statement-breakpoint
ALTER TABLE "video_asset_jobs" RENAME TO "video_content_jobs";--> statement-breakpoint
ALTER TABLE "content" RENAME COLUMN "project_id" TO "campaign_id";--> statement-breakpoint
ALTER TABLE "content" RENAME COLUMN "generation_type" TO "content_type";--> statement-breakpoint
ALTER TABLE "video_content_jobs" RENAME COLUMN "video_asset_id" TO "video_content_id";--> statement-breakpoint
ALTER TABLE "video_content" RENAME COLUMN "asset_id" TO "content_id";--> statement-breakpoint
ALTER TABLE "content" DROP CONSTRAINT IF EXISTS "assets_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "campaign_images" DROP CONSTRAINT IF EXISTS "collection_images_collection_id_collections_id_fk";
--> statement-breakpoint
ALTER TABLE "video_content_jobs" DROP CONSTRAINT IF EXISTS "video_asset_jobs_video_asset_id_video_assets_id_fk";
--> statement-breakpoint
ALTER TABLE "video_content" DROP CONSTRAINT IF EXISTS "video_assets_asset_id_assets_id_fk";
--> statement-breakpoint
DROP INDEX "assets_project_id_idx";--> statement-breakpoint
DROP INDEX "assets_type_idx";--> statement-breakpoint
DROP INDEX "collection_images_collection_id_idx";--> statement-breakpoint
DROP INDEX "projects_user_id_idx";--> statement-breakpoint
DROP INDEX "video_asset_jobs_video_asset_id_idx";--> statement-breakpoint
DROP INDEX "video_asset_jobs_status_idx";--> statement-breakpoint
DROP INDEX "video_asset_jobs_video_asset_status_idx";--> statement-breakpoint
DROP INDEX "video_asset_jobs_status_created_idx";--> statement-breakpoint
DROP INDEX "video_asset_jobs_request_id_idx";--> statement-breakpoint
DROP INDEX "video_assets_asset_id_idx";--> statement-breakpoint
DROP INDEX "video_assets_status_idx";--> statement-breakpoint
DROP INDEX "video_assets_asset_status_idx";--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN IF NOT EXISTS "user_id" text;--> statement-breakpoint
UPDATE "content" c
SET "user_id" = camp."user_id"
FROM "campaigns" camp
WHERE c."campaign_id" = camp."id" AND c."user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "content" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "status" "content_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "scheduled_for" timestamp;--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "target_platforms" "social_platform"[];--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "platform_schedule" jsonb;--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "is_favorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- reuse existing collection_id data for campaign linkage
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'campaign_images'
      AND column_name = 'collection_id'
  ) THEN
    EXECUTE 'ALTER TABLE "campaign_images" RENAME COLUMN "collection_id" TO "campaign_id"';
  END IF;
END$$;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'campaign_images'
      AND column_name = 'campaign_id'
  ) THEN
    EXECUTE 'ALTER TABLE "campaign_images" ALTER COLUMN "campaign_id" SET NOT NULL';
  END IF;
END$$;--> statement-breakpoint
-- remove orphaned images before adding FK
DELETE FROM "campaign_images"
WHERE "campaign_id" IS NULL
  OR NOT EXISTS (SELECT 1 FROM "campaigns" c WHERE c."id" = "campaign_images"."campaign_id");--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "campaign_stage" "campaign_stage" DEFAULT 'upload' NOT NULL;--> statement-breakpoint
ALTER TABLE "image_content" ADD CONSTRAINT "image_content_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "image_content_content_id_idx" ON "image_content" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "user_additional_user_id_idx" ON "user_additional" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_media_user_id_idx" ON "user_media" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_media_type_idx" ON "user_media" USING btree ("type");--> statement-breakpoint
ALTER TABLE "content" ADD CONSTRAINT "content_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_images" ADD CONSTRAINT "campaign_images_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_content_jobs" ADD CONSTRAINT "video_content_jobs_video_content_id_video_content_id_fk" FOREIGN KEY ("video_content_id") REFERENCES "public"."video_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_content" ADD CONSTRAINT "video_content_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_user_id_idx" ON "content" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "content_campaign_id_idx" ON "content" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "content_type_idx" ON "content" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX "content_status_idx" ON "content" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaign_images_campaign_id_idx" ON "campaign_images" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaigns_user_id_idx" ON "campaigns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "video_content_jobs_video_content_id_idx" ON "video_content_jobs" USING btree ("video_content_id");--> statement-breakpoint
CREATE INDEX "video_content_jobs_status_idx" ON "video_content_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "video_content_jobs_video_content_status_idx" ON "video_content_jobs" USING btree ("video_content_id","status");--> statement-breakpoint
CREATE INDEX "video_content_jobs_status_created_idx" ON "video_content_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "video_content_jobs_request_id_idx" ON "video_content_jobs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "video_content_content_id_idx" ON "video_content" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "video_content_status_idx" ON "video_content" USING btree ("status");--> statement-breakpoint
CREATE INDEX "video_content_content_status_idx" ON "video_content" USING btree ("content_id","status");--> statement-breakpoint
ALTER TABLE "content" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "content" DROP COLUMN "generation_stage";--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "image_content" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select "content"."user_id" = auth.user_id()
        from "content"
        where "content"."id" = "image_content"."content_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "image_content" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select "content"."user_id" = auth.user_id()
        from "content"
        where "content"."id" = "image_content"."content_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "image_content" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select "content"."user_id" = auth.user_id()
        from "content"
        where "content"."id" = "image_content"."content_id")) WITH CHECK ((select "content"."user_id" = auth.user_id()
        from "content"
        where "content"."id" = "image_content"."content_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "image_content" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select "content"."user_id" = auth.user_id()
        from "content"
        where "content"."id" = "image_content"."content_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "user_additional" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.user_id() = "user_additional"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "user_additional" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "user_additional"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "user_additional" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "user_additional"."user_id")) WITH CHECK ((select auth.user_id() = "user_additional"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "user_additional" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "user_additional"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "user_media" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.user_id() = "user_media"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "user_media" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "user_media"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "user_media" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "user_media"."user_id")) WITH CHECK ((select auth.user_id() = "user_media"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "user_media" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "user_media"."user_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-select" ON "content" TO authenticated USING ("content"."user_id" = auth.user_id());--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-insert" ON "content" TO authenticated WITH CHECK ("content"."user_id" = auth.user_id());--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "content" TO authenticated USING ("content"."user_id" = auth.user_id()) WITH CHECK ("content"."user_id" = auth.user_id());--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "content" TO authenticated USING ("content"."user_id" = auth.user_id());--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-select" ON "campaign_images";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-insert" ON "campaign_images";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-update" ON "campaign_images";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-delete" ON "campaign_images";--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "campaign_images" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select "campaigns"."user_id" = auth.user_id()
        from "campaigns"
        where "campaigns"."id" = "campaign_images"."campaign_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "campaign_images" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select "campaigns"."user_id" = auth.user_id()
        from "campaigns"
        where "campaigns"."id" = "campaign_images"."campaign_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "campaign_images" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select "campaigns"."user_id" = auth.user_id()
        from "campaigns"
        where "campaigns"."id" = "campaign_images"."campaign_id")) WITH CHECK ((select "campaigns"."user_id" = auth.user_id()
        from "campaigns"
        where "campaigns"."id" = "campaign_images"."campaign_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "campaign_images" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select "campaigns"."user_id" = auth.user_id()
        from "campaigns"
        where "campaigns"."id" = "campaign_images"."campaign_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-select" ON "campaigns" TO authenticated USING ((select auth.user_id() = "campaigns"."user_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-insert" ON "campaigns" TO authenticated WITH CHECK ((select auth.user_id() = "campaigns"."user_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "campaigns" TO authenticated USING ((select auth.user_id() = "campaigns"."user_id")) WITH CHECK ((select auth.user_id() = "campaigns"."user_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "campaigns" TO authenticated USING ((select auth.user_id() = "campaigns"."user_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-select" ON "video_content_jobs" TO authenticated USING ((select "content"."user_id" = auth.user_id() from "content"
        join "video_content" on "video_content"."content_id" = "content"."id"
        where "video_content"."id" = "video_content_jobs"."video_content_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-insert" ON "video_content_jobs" TO authenticated WITH CHECK ((select "content"."user_id" = auth.user_id() from "content"
        join "video_content" on "video_content"."content_id" = "content"."id"
        where "video_content"."id" = "video_content_jobs"."video_content_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "video_content_jobs" TO authenticated USING ((select "content"."user_id" = auth.user_id() from "content"
        join "video_content" on "video_content"."content_id" = "content"."id"
        where "video_content"."id" = "video_content_jobs"."video_content_id")) WITH CHECK ((select "content"."user_id" = auth.user_id() from "content"
        join "video_content" on "video_content"."content_id" = "content"."id"
        where "video_content"."id" = "video_content_jobs"."video_content_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "video_content_jobs" TO authenticated USING ((select "content"."user_id" = auth.user_id() from "content"
        join "video_content" on "video_content"."content_id" = "content"."id"
        where "video_content"."id" = "video_content_jobs"."video_content_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-select" ON "video_content" TO authenticated USING ((select "content"."user_id" = auth.user_id()
        from "content"
        where "content"."id" = "video_content"."content_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-insert" ON "video_content" TO authenticated WITH CHECK ((select "content"."user_id" = auth.user_id()
        from "content"
        where "content"."id" = "video_content"."content_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "video_content" TO authenticated USING ((select "content"."user_id" = auth.user_id()
        from "content"
        where "content"."id" = "video_content"."content_id")) WITH CHECK ((select "content"."user_id" = auth.user_id()
        from "content"
        where "content"."id" = "video_content"."content_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "video_content" TO authenticated USING ((select "content"."user_id" = auth.user_id()
        from "content"
        where "content"."id" = "video_content"."content_id"));
