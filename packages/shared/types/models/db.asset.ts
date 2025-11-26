import { assets } from "@db/client";

export type DBAsset = typeof assets.$inferSelect;

export type InsertDBAsset = typeof assets.$inferInsert;

export type AssetGenerationStage =
  | "upload"
  | "categorize"
  | "plan"
  | "review"
  | "generate"
  | "complete";

export type AssetGenerationType = "video"; // extend to additional asset types
