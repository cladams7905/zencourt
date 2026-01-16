ALTER TABLE "user_additional" ADD COLUMN "writing_tone_level" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_additional" DROP COLUMN "writing_style_preset";