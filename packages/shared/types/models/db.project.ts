import { projects, assetGenerationStageEnum } from "@db/client";

export type ProjectStage =
  (typeof assetGenerationStageEnum.enumValues)[number];

export type DBProject = typeof projects.$inferSelect & {
  stage?: ProjectStage;
  thumbnailUrl?: string | null;
  assetId?: string | null;
  collectionId?: string | null;
};

export type InsertDBProject = typeof projects.$inferInsert;
