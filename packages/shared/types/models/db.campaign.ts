import { campaigns, campaignStageEnum } from "@db/client";
import type { DBContent } from "./db.content";

export type CampaignStage =
  (typeof campaignStageEnum.enumValues)[number];

export type DBCampaign = typeof campaigns.$inferSelect & {
  primaryContentId?: string | null;
  thumbnailUrl?: string | null;
  contents?: DBContent[];
};

export type InsertDBCampaign = typeof campaigns.$inferInsert;
