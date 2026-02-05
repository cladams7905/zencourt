import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { authenticatedRole, crudPolicy } from "drizzle-orm/neon";

import type { VideoMetadata } from "@shared/types/models";

import { listings } from "./listings";
import { videoStatusEnum } from "./enums";

export const videoGenBatch = pgTable(
  "video_gen_batch",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    status: videoStatusEnum("status").notNull().default("pending"),
    metadata: jsonb("metadata").$type<VideoMetadata>(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    index("video_gen_batch_listing_id_idx").on(table.listingId),
    index("video_gen_batch_status_idx").on(table.status),
    index("video_gen_batch_listing_status_idx").on(
      table.listingId,
      table.status
    ),
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
