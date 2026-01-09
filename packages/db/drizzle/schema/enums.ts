import { pgEnum } from "drizzle-orm/pg-core";

export const contentTypeEnum = pgEnum("content_type", [
  "video",
  "post",
  "story"
]);

export const listingStageEnum = pgEnum("listing_stage", [
  "upload",
  "categorize",
  "plan",
  "review",
  "generate",
  "complete"
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
