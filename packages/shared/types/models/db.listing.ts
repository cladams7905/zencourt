import { listings, listingStageEnum } from "@db/client";
import type { DBContent } from "./db.content";

export type ListingStage =
  (typeof listingStageEnum.enumValues)[number];

export type DBListing = typeof listings.$inferSelect & {
  primaryContentId?: string | null;
  thumbnailUrl?: string | null;
  contents?: DBContent[];
};

export type InsertDBListing = typeof listings.$inferInsert;
