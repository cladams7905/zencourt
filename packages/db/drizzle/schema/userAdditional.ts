import { authenticatedRole, authUid, crudPolicy } from "drizzle-orm/neon";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";

import {
  accountTypeEnum,
  paymentPlanEnum,
  referralSourceEnum,
  targetAudienceEnum
} from "./enums";

export const userAdditional = pgTable(
  "user_additional",
  {
    userId: text("user_id").primaryKey(),
    accountType: accountTypeEnum("account_type").notNull().default("basic"),
    location: text("location"),
    referralSource: referralSourceEnum("referral_source"),
    referralSourceOther: text("referral_source_other"),
    targetAudiences: targetAudienceEnum("target_audiences").array(),
    audienceDescription: text("audience_description"),
    weeklyPostingFrequency: integer("weekly_posting_frequency"),
    paymentPlan: paymentPlanEnum("payment_plan").notNull().default("free"),
    weeklyGenerationLimit: integer("weekly_generation_limit"),
    headshotUrl: text("headshot_image_url"),
    personalLogoUrl: text("personal_logo_image_url"),
    surveyCompletedAt: timestamp("survey_completed_at"),
    agentName: text("agent_name").notNull().default(""),
    brokerageName: text("brokerage_name").notNull().default(""),
    agentTitle: text("agent_title"),
    agentBio: text("agent_bio"),
    county: text("county"),
    serviceAreas: text("service_areas").array(),
    writingToneLevel: integer("writing_tone_level").notNull().default(3),
    writingStyleCustom: text("writing_style_custom"),
    profileCompletedAt: timestamp("profile_completed_at"),
    writingStyleCompletedAt: timestamp("writing_style_completed_at"),
    mediaUploadedAt: timestamp("media_uploaded_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    index("user_additional_user_id_idx").on(table.userId),
    crudPolicy({
      role: authenticatedRole,
      read: authUid(table.userId),
      modify: authUid(table.userId)
    })
  ]
);
