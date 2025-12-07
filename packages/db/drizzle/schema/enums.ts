import { pgEnum } from "drizzle-orm/pg-core";

export const assetGenerationTypeEnum = pgEnum("asset_generation_type", [
  "video"
]);

export const assetGenerationStageEnum = pgEnum("asset_generation_stage", [
  "upload",
  "categorize",
  "plan",
  "review",
  "generate",
  "complete"
]);

export const videoStatusEnum = pgEnum("video_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "canceled"
]);
