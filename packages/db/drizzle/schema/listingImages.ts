import { sql } from "drizzle-orm";
import {
  boolean,
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
    primaryScore: real("primary_score"),
    features: jsonb("features").$type<string[]>(),
    sceneDescription: text("scene_description"),
    isPrimary: boolean("is_primary").default(false),
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
