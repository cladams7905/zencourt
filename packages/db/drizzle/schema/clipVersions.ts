import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";
import { authenticatedRole, crudPolicy } from "drizzle-orm/neon";

import type {
  ClipVersionMetadata,
  GENERATION_MODELS,
  VideoOrientation
} from "@shared/types/models";

import { listings } from "./listings";
import { videoGenJobs } from "./videoGenJobs";
import { videoStatusEnum } from "./enums";

type VideoStatus = (typeof videoStatusEnum.enumValues)[number];

export const clipVersions = pgTable(
  "clip_versions",
  {
    id: text("id").primaryKey(),
    clipId: text("clip_id").notNull(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    roomId: text("room_id"),
    roomName: text("room_name").notNull(),
    category: text("category").notNull(),
    clipIndex: integer("clip_index").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    versionNumber: integer("version_number").notNull(),
    status: videoStatusEnum("status")
      .notNull()
      .$type<VideoStatus>()
      .default("pending"),
    isCurrent: boolean("is_current").notNull().default(false),
    videoUrl: text("video_url"),
    thumbnailUrl: text("thumbnail_url"),
    durationSeconds: integer("duration_seconds"),
    metadata: jsonb("metadata").$type<ClipVersionMetadata>(),
    errorMessage: text("error_message"),
    orientation: text("orientation").$type<VideoOrientation>().notNull(),
    generationModel: text("generation_model")
      .$type<GENERATION_MODELS>()
      .notNull(),
    imageUrls: jsonb("image_urls").$type<string[]>().notNull(),
    prompt: text("prompt").notNull(),
    aiDirections: text("ai_directions").notNull().default(""),
    sourceVideoGenJobId: text("source_video_gen_job_id").references(
      () => videoGenJobs.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    index("clip_versions_listing_id_idx").on(table.listingId),
    index("clip_versions_listing_is_current_idx").on(
      table.listingId,
      table.isCurrent
    ),
    index("clip_versions_clip_id_idx").on(table.clipId),
    index("clip_versions_listing_clip_id_idx").on(table.listingId, table.clipId),
    index("clip_versions_source_video_gen_job_id_idx").on(
      table.sourceVideoGenJobId
    ),
    crudPolicy({
      role: authenticatedRole,
      read: sql`(select ${listings.userId} = auth.user_id() from ${listings}
        where ${listings.id} = ${table.listingId})`,
      modify: sql`(select ${listings.userId} = auth.user_id() from ${listings}
        where ${listings.id} = ${table.listingId})`
    })
  ]
);
