ALTER TYPE "public"."listing_stage" ADD VALUE 'upload' BEFORE 'categorize';--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "listing_stage" SET DEFAULT 'upload';