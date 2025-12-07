import {
  assets,
  assetGenerationStageEnum,
  assetGenerationTypeEnum
} from "@db/client";

export type DBAsset = typeof assets.$inferSelect;

export type InsertDBAsset = typeof assets.$inferInsert;

export type AssetGenerationStage =
  (typeof assetGenerationStageEnum.enumValues)[number];

export type AssetGenerationType =
  (typeof assetGenerationTypeEnum.enumValues)[number];
