ALTER TABLE "user_additional" ADD COLUMN "referral_source" text;--> statement-breakpoint
ALTER TABLE "user_additional" ADD COLUMN "referral_source_other" text;--> statement-breakpoint
ALTER TABLE "user_additional" ADD COLUMN "content_interests" text;--> statement-breakpoint
ALTER TABLE "user_additional" ADD COLUMN "weekly_posting_frequency" integer;--> statement-breakpoint
ALTER TABLE "user_additional" ADD COLUMN "survey_completed_at" timestamp;