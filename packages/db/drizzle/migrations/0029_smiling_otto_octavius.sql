UPDATE "listings"
SET "listing_stage" = 'categorize'
WHERE "listing_stage" = 'upload';
ALTER TABLE "listings" ALTER COLUMN "listing_stage" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "listing_stage" SET DEFAULT 'categorize'::text;--> statement-breakpoint
DROP TYPE "public"."listing_stage";--> statement-breakpoint
CREATE TYPE "public"."listing_stage" AS ENUM('categorize', 'review', 'generate', 'create');--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "listing_stage" SET DEFAULT 'categorize'::"public"."listing_stage";--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "listing_stage" SET DATA TYPE "public"."listing_stage" USING "listing_stage"::"public"."listing_stage";--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "last_opened_at" timestamp;