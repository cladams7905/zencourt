CREATE TABLE "images" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"filename" text NOT NULL,
	"url" text NOT NULL,
	"category" varchar(50),
	"confidence" integer,
	"features" jsonb,
	"order" integer,
	"metadata" jsonb,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"status" varchar(50) DEFAULT 'uploading' NOT NULL,
	"format" varchar(20),
	"platform" varchar(50),
	"thumbnail_url" text,
	"video_url" text,
	"duration" integer,
	"subtitles" jsonb DEFAULT 'false'::jsonb,
	"metadata" jsonb,
	"video_generation_status" varchar(50),
	"final_video_url" text,
	"final_video_duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "videos" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"room_id" text,
	"room_name" text,
	"video_url" text NOT NULL,
	"thumbnail_url" text,
	"duration" integer NOT NULL,
	"status" varchar(50) NOT NULL,
	"generation_settings" jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "videos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "videos_project_id_idx" ON "videos" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "videos_room_id_idx" ON "videos" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "videos_status_idx" ON "videos" USING btree ("status");--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "images" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select "projects"."user_id" = auth.user_id() from "projects" where "projects"."id" = "images"."project_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "images" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select "projects"."user_id" = auth.user_id() from "projects" where "projects"."id" = "images"."project_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "images" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select "projects"."user_id" = auth.user_id() from "projects" where "projects"."id" = "images"."project_id")) WITH CHECK ((select "projects"."user_id" = auth.user_id() from "projects" where "projects"."id" = "images"."project_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "images" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select "projects"."user_id" = auth.user_id() from "projects" where "projects"."id" = "images"."project_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "projects" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.user_id() = "projects"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "projects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "projects"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "projects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "projects"."user_id")) WITH CHECK ((select auth.user_id() = "projects"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "projects" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "projects"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "videos" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select "projects"."user_id" = auth.user_id() from "projects" where "projects"."id" = "videos"."project_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "videos" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select "projects"."user_id" = auth.user_id() from "projects" where "projects"."id" = "videos"."project_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "videos" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select "projects"."user_id" = auth.user_id() from "projects" where "projects"."id" = "videos"."project_id")) WITH CHECK ((select "projects"."user_id" = auth.user_id() from "projects" where "projects"."id" = "videos"."project_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "videos" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select "projects"."user_id" = auth.user_id() from "projects" where "projects"."id" = "videos"."project_id"));