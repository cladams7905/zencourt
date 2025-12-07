import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";
import { authenticatedRole, crudPolicy } from "drizzle-orm/neon";

import type { VideoMetadata } from "@shared/types/models";

import { assets } from "./assets";
import { projects } from "./projects";
import { videoStatusEnum } from "./enums";

export const videoAssets = pgTable(
  "video_assets",
  {
    id: text("id").primaryKey(),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    videoUrl: text("video_url"),
    thumbnailUrl: text("thumbnail_url"),
    status: videoStatusEnum("status").notNull().default("pending"),
    metadata: jsonb("metadata").$type<VideoMetadata>(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    index("video_assets_asset_id_idx").on(table.assetId),
    index("video_assets_status_idx").on(table.status),
    index("video_assets_asset_status_idx").on(table.assetId, table.status),
    crudPolicy({
      role: authenticatedRole,
      read: sql`(select ${projects.userId} = auth.user_id() from ${projects} join ${assets} on ${assets.projectId} = ${projects.id} where ${assets.id} = ${table.assetId})`,
      modify: sql`(select ${projects.userId} = auth.user_id() from ${projects} join ${assets} on ${assets.projectId} = ${projects.id} where ${assets.id} = ${table.assetId})`
    })
  ]
);
