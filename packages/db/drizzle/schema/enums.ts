import { pgEnum } from "drizzle-orm/pg-core";

export const contentTypeEnum = pgEnum("content_type", [
  "video",
  "post",
  "story"
]);

export const listingStageEnum = pgEnum("listing_stage", [
  "categorize",
  "review",
  "generate",
  "create"
]);

export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "scheduled",
  "archived"
]);

export const accountTypeEnum = pgEnum("account_type", ["basic", "admin"]);

export const paymentPlanEnum = pgEnum("payment_plan", [
  "free",
  "starter",
  "growth",
  "enterprise"
]);

export const referralSourceEnum = pgEnum("referral_source", [
  "facebook",
  "google_search",
  "instagram",
  "linkedin",
  "word_of_mouth",
  "conference",
  "referral",
  "online_ad",
  "other"
]);

export const targetAudienceEnum = pgEnum("target_audience", [
  "luxury_homebuyers",
  "first_time_homebuyers",
  "military_veterans",
  "real_estate_investors",
  "downsizers_retirees",
  "growing_families",
  "job_transferees",
  "vacation_property_buyers"
]);

export type ReferralSource = (typeof referralSourceEnum.enumValues)[number];
export type TargetAudience = (typeof targetAudienceEnum.enumValues)[number];

export const socialPlatformEnum = pgEnum("social_platform", [
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "linkedin",
  "twitter"
]);

export const mediaTypeEnum = pgEnum("media_type", ["video", "image"]);

export const videoStatusEnum = pgEnum("video_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "canceled"
]);
