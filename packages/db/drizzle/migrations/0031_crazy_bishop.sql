ALTER TABLE "image_content" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY "crud-authenticated-policy-select" ON "image_content" CASCADE;--> statement-breakpoint
DROP POLICY "crud-authenticated-policy-insert" ON "image_content" CASCADE;--> statement-breakpoint
DROP POLICY "crud-authenticated-policy-update" ON "image_content" CASCADE;--> statement-breakpoint
DROP POLICY "crud-authenticated-policy-delete" ON "image_content" CASCADE;--> statement-breakpoint
DROP TABLE "image_content" CASCADE;--> statement-breakpoint
ALTER TABLE "video_content" RENAME TO "video_gen_batch";--> statement-breakpoint
ALTER TABLE "video_content_jobs" RENAME TO "video_gen_jobs";--> statement-breakpoint
ALTER TABLE "video_gen_jobs" RENAME COLUMN "video_content_id" TO "video_gen_batch_id";--> statement-breakpoint
ALTER TABLE "video_render_jobs" RENAME COLUMN "video_content_id" TO "video_gen_batch_id";--> statement-breakpoint
ALTER TABLE "video_gen_batch" DROP CONSTRAINT "video_content_content_id_content_id_fk";
--> statement-breakpoint
ALTER TABLE "video_gen_jobs" DROP CONSTRAINT "video_content_jobs_video_content_id_video_content_id_fk";
--> statement-breakpoint
ALTER TABLE "video_render_jobs" DROP CONSTRAINT "video_render_jobs_video_content_id_video_content_id_fk";
--> statement-breakpoint
DROP INDEX "video_content_content_id_idx";--> statement-breakpoint
DROP INDEX "video_content_status_idx";--> statement-breakpoint
DROP INDEX "video_content_content_status_idx";--> statement-breakpoint
DROP INDEX "video_content_jobs_video_content_id_idx";--> statement-breakpoint
DROP INDEX "video_content_jobs_status_idx";--> statement-breakpoint
DROP INDEX "video_content_jobs_video_content_status_idx";--> statement-breakpoint
DROP INDEX "video_content_jobs_status_created_idx";--> statement-breakpoint
DROP INDEX "video_content_jobs_request_id_idx";--> statement-breakpoint
DROP INDEX "video_render_jobs_video_content_id_idx";--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "video_gen_batch" ADD CONSTRAINT "video_gen_batch_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_gen_jobs" ADD CONSTRAINT "video_gen_jobs_video_gen_batch_id_video_gen_batch_id_fk" FOREIGN KEY ("video_gen_batch_id") REFERENCES "public"."video_gen_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_render_jobs" ADD CONSTRAINT "video_render_jobs_video_gen_batch_id_video_gen_batch_id_fk" FOREIGN KEY ("video_gen_batch_id") REFERENCES "public"."video_gen_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_gen_batch_content_id_idx" ON "video_gen_batch" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "video_gen_batch_status_idx" ON "video_gen_batch" USING btree ("status");--> statement-breakpoint
CREATE INDEX "video_gen_batch_content_status_idx" ON "video_gen_batch" USING btree ("content_id","status");--> statement-breakpoint
CREATE INDEX "video_gen_jobs_video_gen_batch_id_idx" ON "video_gen_jobs" USING btree ("video_gen_batch_id");--> statement-breakpoint
CREATE INDEX "video_gen_jobs_status_idx" ON "video_gen_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "video_gen_jobs_video_gen_batch_status_idx" ON "video_gen_jobs" USING btree ("video_gen_batch_id","status");--> statement-breakpoint
CREATE INDEX "video_gen_jobs_status_created_idx" ON "video_gen_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "video_gen_jobs_request_id_idx" ON "video_gen_jobs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "video_render_jobs_video_gen_batch_id_idx" ON "video_render_jobs" USING btree ("video_gen_batch_id");--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-select" ON "video_gen_batch";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-insert" ON "video_gen_batch";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-update" ON "video_gen_batch";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-delete" ON "video_gen_batch";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-select" ON "video_gen_jobs";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-insert" ON "video_gen_jobs";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-update" ON "video_gen_jobs";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-delete" ON "video_gen_jobs";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-select" ON "video_render_jobs";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-insert" ON "video_render_jobs";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-update" ON "video_render_jobs";--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-delete" ON "video_render_jobs";--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "video_gen_batch" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select "content"."user_id" = auth.user_id()
        from "content"
        where "content"."id" = "video_gen_batch"."content_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "video_gen_batch" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select "content"."user_id" = auth.user_id()
        from "content"
        where "content"."id" = "video_gen_batch"."content_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "video_gen_batch" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select "content"."user_id" = auth.user_id()
        from "content"
        where "content"."id" = "video_gen_batch"."content_id")) WITH CHECK ((select "content"."user_id" = auth.user_id()
        from "content"
        where "content"."id" = "video_gen_batch"."content_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "video_gen_batch" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select "content"."user_id" = auth.user_id()
        from "content"
        where "content"."id" = "video_gen_batch"."content_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "video_gen_jobs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select "content"."user_id" = auth.user_id() from "content"
        join "video_gen_batch" on "video_gen_batch"."content_id" = "content"."id"
        where "video_gen_batch"."id" = "video_gen_jobs"."video_gen_batch_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "video_gen_jobs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select "content"."user_id" = auth.user_id() from "content"
        join "video_gen_batch" on "video_gen_batch"."content_id" = "content"."id"
        where "video_gen_batch"."id" = "video_gen_jobs"."video_gen_batch_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "video_gen_jobs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select "content"."user_id" = auth.user_id() from "content"
        join "video_gen_batch" on "video_gen_batch"."content_id" = "content"."id"
        where "video_gen_batch"."id" = "video_gen_jobs"."video_gen_batch_id")) WITH CHECK ((select "content"."user_id" = auth.user_id() from "content"
        join "video_gen_batch" on "video_gen_batch"."content_id" = "content"."id"
        where "video_gen_batch"."id" = "video_gen_jobs"."video_gen_batch_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "video_gen_jobs" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select "content"."user_id" = auth.user_id() from "content"
        join "video_gen_batch" on "video_gen_batch"."content_id" = "content"."id"
        where "video_gen_batch"."id" = "video_gen_jobs"."video_gen_batch_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "video_render_jobs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select "content"."user_id" = auth.user_id() from "content"
        join "video_gen_batch" on "video_gen_batch"."content_id" = "content"."id"
        where "video_gen_batch"."id" = "video_render_jobs"."video_gen_batch_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "video_render_jobs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select "content"."user_id" = auth.user_id() from "content"
        join "video_gen_batch" on "video_gen_batch"."content_id" = "content"."id"
        where "video_gen_batch"."id" = "video_render_jobs"."video_gen_batch_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "video_render_jobs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select "content"."user_id" = auth.user_id() from "content"
        join "video_gen_batch" on "video_gen_batch"."content_id" = "content"."id"
        where "video_gen_batch"."id" = "video_render_jobs"."video_gen_batch_id")) WITH CHECK ((select "content"."user_id" = auth.user_id() from "content"
        join "video_gen_batch" on "video_gen_batch"."content_id" = "content"."id"
        where "video_gen_batch"."id" = "video_render_jobs"."video_gen_batch_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "video_render_jobs" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select "content"."user_id" = auth.user_id() from "content"
        join "video_gen_batch" on "video_gen_batch"."content_id" = "content"."id"
        where "video_gen_batch"."id" = "video_render_jobs"."video_gen_batch_id"));
