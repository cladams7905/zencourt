ALTER TABLE "listings" ADD COLUMN "property_details" jsonb;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "property_details_source" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "property_details_fetched_at" timestamp;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "property_details_revision" text;