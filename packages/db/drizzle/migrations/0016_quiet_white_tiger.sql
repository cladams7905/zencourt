ALTER TABLE "user_additional" ADD COLUMN "agent_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_additional" ADD COLUMN "brokerage_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_additional" ADD COLUMN "agent_title" text;--> statement-breakpoint
ALTER TABLE "user_additional" ADD COLUMN "writing_style_preset" text;--> statement-breakpoint
ALTER TABLE "user_additional" ADD COLUMN "writing_style_custom" text;--> statement-breakpoint
ALTER TABLE "user_additional" ADD COLUMN "writing_style_examples" text;--> statement-breakpoint
ALTER TABLE "user_additional" ADD COLUMN "profile_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_additional" ADD COLUMN "writing_style_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_additional" ADD COLUMN "media_uploaded_at" timestamp;