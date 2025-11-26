CREATE TYPE "public"."asset_generation_stage" AS ENUM('upload', 'categorize', 'plan', 'review', 'generate', 'complete');--> statement-breakpoint
CREATE TYPE "public"."video_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'canceled');--> statement-breakpoint
ALTER TYPE "public"."asset_type" RENAME TO "asset_generation_type";--> statement-breakpoint
ALTER TABLE "assets" RENAME COLUMN "type" TO "generation_type";--> statement-breakpoint
ALTER TABLE "assets" RENAME COLUMN "stage" TO "generation_stage";--> statement-breakpoint
DROP INDEX "assets_type_idx";--> statement-breakpoint
ALTER TABLE "video_asset_jobs" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."video_status";--> statement-breakpoint
ALTER TABLE "video_asset_jobs" ALTER COLUMN "status" SET DATA TYPE "public"."video_status" USING "status"::"public"."video_status";--> statement-breakpoint
ALTER TABLE "video_assets" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."video_status";--> statement-breakpoint
ALTER TABLE "video_assets" ALTER COLUMN "status" SET DATA TYPE "public"."video_status" USING "status"::"public"."video_status";--> statement-breakpoint
CREATE INDEX "assets_type_idx" ON "assets" USING btree ("generation_type");