ALTER TYPE "public"."campaign_stage" RENAME TO "listing_stage";--> statement-breakpoint
ALTER TABLE "campaigns" RENAME TO "listings";--> statement-breakpoint
ALTER TABLE "campaign_images" RENAME TO "listing_images";--> statement-breakpoint
ALTER TABLE "listings" RENAME COLUMN "campaign_stage" TO "listing_stage";--> statement-breakpoint
ALTER TABLE "content" RENAME COLUMN "campaign_id" TO "listing_id";--> statement-breakpoint
ALTER TABLE "listing_images" RENAME COLUMN "campaign_id" TO "listing_id";--> statement-breakpoint
ALTER TABLE "content" DROP CONSTRAINT "content_campaign_id_campaigns_id_fk";
--> statement-breakpoint
ALTER TABLE "listing_images" DROP CONSTRAINT "campaign_images_campaign_id_campaigns_id_fk";
--> statement-breakpoint
DROP INDEX "campaigns_user_id_idx";--> statement-breakpoint
DROP INDEX "content_campaign_id_idx";--> statement-breakpoint
DROP INDEX "campaign_images_campaign_id_idx";--> statement-breakpoint
ALTER TABLE "content" ADD CONSTRAINT "content_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listings_user_id_idx" ON "listings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "content_listing_id_idx" ON "content" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_images_listing_id_idx" ON "listing_images" USING btree ("listing_id");--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-select" ON "listings" TO authenticated USING ((select auth.user_id() = "listings"."user_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-insert" ON "listings" TO authenticated WITH CHECK ((select auth.user_id() = "listings"."user_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "listings" TO authenticated USING ((select auth.user_id() = "listings"."user_id")) WITH CHECK ((select auth.user_id() = "listings"."user_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "listings" TO authenticated USING ((select auth.user_id() = "listings"."user_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-select" ON "listing_images" TO authenticated USING ((select "listings"."user_id" = auth.user_id()
        from "listings"
        where "listings"."id" = "listing_images"."listing_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-insert" ON "listing_images" TO authenticated WITH CHECK ((select "listings"."user_id" = auth.user_id()
        from "listings"
        where "listings"."id" = "listing_images"."listing_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "listing_images" TO authenticated USING ((select "listings"."user_id" = auth.user_id()
        from "listings"
        where "listings"."id" = "listing_images"."listing_id")) WITH CHECK ((select "listings"."user_id" = auth.user_id()
        from "listings"
        where "listings"."id" = "listing_images"."listing_id"));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "listing_images" TO authenticated USING ((select "listings"."user_id" = auth.user_id()
        from "listings"
        where "listings"."id" = "listing_images"."listing_id"));