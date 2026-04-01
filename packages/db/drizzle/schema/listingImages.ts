import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  varchar
} from "drizzle-orm/pg-core";
import { authenticatedRole, crudPolicy } from "drizzle-orm/neon";

import type { ImageMetadata } from "@shared/types/models";

import { listings } from "./listings";
import {
  listingImageAnalysisStatusEnum,
  listingImageShotTypeEnum
} from "./enums";

export const listingImages = pgTable(
  "listing_images",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    url: text("url").notNull(),
    category: varchar("category", { length: 50 }),
    confidence: real("confidence"),
    recommendationScore: real("recommendation_score"),
    shotType: listingImageShotTypeEnum("shot_type").default("room").notNull(),
    analysisStatus: listingImageAnalysisStatusEnum("analysis_status")
      .default("pending")
      .notNull(),
    analysisRunId: text("analysis_run_id"),
    analysisStartedAt: timestamp("analysis_started_at"),
    analysisCompletedAt: timestamp("analysis_completed_at"),
    metadata: jsonb("metadata").$type<ImageMetadata>(),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull()
  },
  (table) => [
    index("listing_images_listing_id_idx").on(table.listingId),
    crudPolicy({
      role: authenticatedRole,
      read: sql`(select ${listings.userId} = auth.user_id()
        from ${listings}
        where ${listings.id} = ${table.listingId})`,
      modify: sql`(select ${listings.userId} = auth.user_id()
        from ${listings}
        where ${listings.id} = ${table.listingId})`
    })
  ]
);
