CREATE TYPE "public"."listing_image_analysis_status" AS ENUM('pending', 'processing', 'complete', 'failed');--> statement-breakpoint
CREATE TYPE "public"."listing_image_shot_type" AS ENUM('room', 'detail', 'other');--> statement-breakpoint
ALTER TABLE "listing_images" ADD COLUMN "recommendation_score" real;--> statement-breakpoint
ALTER TABLE "listing_images" ADD COLUMN "shot_type" "listing_image_shot_type" DEFAULT 'room' NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_images" ADD COLUMN "analysis_status" "listing_image_analysis_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_images" ADD COLUMN "analysis_run_id" text;--> statement-breakpoint
ALTER TABLE "listing_images" ADD COLUMN "analysis_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "listing_images" ADD COLUMN "analysis_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "listing_images" DROP COLUMN "primary_score";--> statement-breakpoint
ALTER TABLE "listing_images" DROP COLUMN "is_primary";