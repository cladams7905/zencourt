ALTER TABLE "video_gen_batch" DROP CONSTRAINT "video_gen_batch_content_id_content_id_fk";
--> statement-breakpoint
DROP INDEX "video_gen_batch_content_id_idx";--> statement-breakpoint
DROP INDEX "video_gen_batch_content_status_idx";--> statement-breakpoint
ALTER TABLE "video_gen_batch" ADD COLUMN "listing_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "video_gen_batch" ADD CONSTRAINT "video_gen_batch_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_gen_batch_listing_id_idx" ON "video_gen_batch" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "video_gen_batch_listing_status_idx" ON "video_gen_batch" USING btree ("listing_id","status");--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-select" ON "video_gen_batch";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-insert" ON "video_gen_batch";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-update" ON "video_gen_batch";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-delete" ON "video_gen_batch";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-select" ON "video_gen_jobs";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-insert" ON "video_gen_jobs";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-update" ON "video_gen_jobs";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-delete" ON "video_gen_jobs";--> statement-breakpoint
ALTER TABLE "content" DROP COLUMN "scheduled_for";--> statement-breakpoint
ALTER TABLE "content" DROP COLUMN "target_platforms";--> statement-breakpoint
ALTER TABLE "content" DROP COLUMN "platform_schedule";--> statement-breakpoint
ALTER TABLE "video_gen_batch" DROP COLUMN "content_id";--> statement-breakpoint
ALTER TABLE "video_gen_jobs" DROP COLUMN "archived_at";--> statement-breakpoint
ALTER TABLE "video_gen_jobs" DROP COLUMN "error_type";--> statement-breakpoint
ALTER TABLE "video_gen_jobs" DROP COLUMN "error_retryable";--> statement-breakpoint
ALTER TABLE "video_gen_jobs" DROP COLUMN "processing_submitted_at";--> statement-breakpoint
ALTER TABLE "video_gen_jobs" DROP COLUMN "processing_completed_at";--> statement-breakpoint
ALTER TABLE "video_gen_jobs" DROP COLUMN "delivery_attempted_at";--> statement-breakpoint
ALTER TABLE "video_gen_jobs" DROP COLUMN "delivery_attempt_count";--> statement-breakpoint
ALTER TABLE "video_gen_jobs" DROP COLUMN "delivery_last_error";--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "video_gen_batch" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select "listings"."user_id" = auth.user_id()
        from "listings"
        where "listings"."id" = "video_gen_batch"."listing_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "video_gen_batch" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select "listings"."user_id" = auth.user_id()
        from "listings"
        where "listings"."id" = "video_gen_batch"."listing_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "video_gen_batch" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select "listings"."user_id" = auth.user_id()
        from "listings"
        where "listings"."id" = "video_gen_batch"."listing_id")) WITH CHECK ((select "listings"."user_id" = auth.user_id()
        from "listings"
        where "listings"."id" = "video_gen_batch"."listing_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "video_gen_batch" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select "listings"."user_id" = auth.user_id()
        from "listings"
        where "listings"."id" = "video_gen_batch"."listing_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "video_gen_jobs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select "listings"."user_id" = auth.user_id() from "listings"
        join "video_gen_batch" on "video_gen_batch"."listing_id" = "listings"."id"
        where "video_gen_batch"."id" = "video_gen_jobs"."video_gen_batch_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "video_gen_jobs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select "listings"."user_id" = auth.user_id() from "listings"
        join "video_gen_batch" on "video_gen_batch"."listing_id" = "listings"."id"
        where "video_gen_batch"."id" = "video_gen_jobs"."video_gen_batch_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "video_gen_jobs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select "listings"."user_id" = auth.user_id() from "listings"
        join "video_gen_batch" on "video_gen_batch"."listing_id" = "listings"."id"
        where "video_gen_batch"."id" = "video_gen_jobs"."video_gen_batch_id")) WITH CHECK ((select "listings"."user_id" = auth.user_id() from "listings"
        join "video_gen_batch" on "video_gen_batch"."listing_id" = "listings"."id"
        where "video_gen_batch"."id" = "video_gen_jobs"."video_gen_batch_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "video_gen_jobs" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select "listings"."user_id" = auth.user_id() from "listings"
        join "video_gen_batch" on "video_gen_batch"."listing_id" = "listings"."id"
        where "video_gen_batch"."id" = "video_gen_jobs"."video_gen_batch_id"));
