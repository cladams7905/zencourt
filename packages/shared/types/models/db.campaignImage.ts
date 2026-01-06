import { campaignImages } from "@db/client";

export type DBCampaignImage = typeof campaignImages.$inferSelect;

export type InsertDBCampaignImage = typeof campaignImages.$inferInsert;

export type ImageMetadata = {
  width: number;
  height: number;
  format: string;
  size: number;
  lastModified: number;
};
