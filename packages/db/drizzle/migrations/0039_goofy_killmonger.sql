ALTER TABLE "clip_versions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY "crud-authenticated-policy-select" ON "clip_versions" CASCADE;--> statement-breakpoint
DROP POLICY "crud-authenticated-policy-insert" ON "clip_versions" CASCADE;--> statement-breakpoint
DROP POLICY "crud-authenticated-policy-update" ON "clip_versions" CASCADE;--> statement-breakpoint
DROP POLICY "crud-authenticated-policy-delete" ON "clip_versions" CASCADE;--> statement-breakpoint
DROP TABLE "clip_versions";--> statement-breakpoint
