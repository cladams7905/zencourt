import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  varchar
} from "drizzle-orm/pg-core";
import { authenticatedRole, crudPolicy } from "drizzle-orm/neon";

import type { ImageMetadata } from "@shared/types/models";

import { campaigns } from "./campaigns";

export const campaignImages = pgTable(
  "campaign_images",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    url: text("url").notNull(),
    category: varchar("category", { length: 50 }),
    confidence: real("confidence"),
    features: jsonb("features").$type<string[]>(),
    sceneDescription: text("scene_description"),
    sortOrder: integer("sort_order"),
    metadata: jsonb("metadata").$type<ImageMetadata>(),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull()
  },
  (table) => [
    index("campaign_images_campaign_id_idx").on(table.campaignId),
    crudPolicy({
      role: authenticatedRole,
      read: sql`(select ${campaigns.userId} = auth.user_id()
        from ${campaigns}
        where ${campaigns.id} = ${table.campaignId})`,
      modify: sql`(select ${campaigns.userId} = auth.user_id()
        from ${campaigns}
        where ${campaigns.id} = ${table.campaignId})`
    })
  ]
);
