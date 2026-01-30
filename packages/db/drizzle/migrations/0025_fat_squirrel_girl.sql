ALTER TABLE "listing_images" ADD COLUMN "is_primary" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "listing_images" DROP COLUMN "sort_order";