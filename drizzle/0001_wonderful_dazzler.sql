ALTER TABLE "images" ADD COLUMN "scene_description" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "fal_request_id" text;--> statement-breakpoint
CREATE INDEX "videos_fal_request_id_idx" ON "videos" USING btree ("fal_request_id");