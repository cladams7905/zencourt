ALTER TABLE "projects" ADD COLUMN "is_published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "stage" varchar(50) DEFAULT 'upload' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "status";