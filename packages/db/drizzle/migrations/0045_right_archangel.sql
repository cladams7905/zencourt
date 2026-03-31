ALTER TABLE "listings" ALTER COLUMN "listing_stage" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "listing_stage" SET DEFAULT 'upload'::text;--> statement-breakpoint
DROP TYPE "public"."listing_stage";--> statement-breakpoint
CREATE TYPE "public"."listing_stage" AS ENUM('upload', 'categorize', 'review', 'generate', 'complete');--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "listing_stage" SET DEFAULT 'upload'::"public"."listing_stage";--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "listing_stage" SET DATA TYPE "public"."listing_stage" USING "listing_stage"::"public"."listing_stage";