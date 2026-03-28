import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  type PgTableExtraConfigValue,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { authenticatedRole, crudPolicy } from "drizzle-orm/neon";

import type {
  ClipVersionMetadata,
  GENERATION_MODELS,
  VideoOrientation
} from "@shared/types/models";

import { listings } from "./listings";
import { videoStatusEnum } from "./enums";
import { videoClips } from "./videoClips";

type VideoStatus = (typeof videoStatusEnum.enumValues)[number];

export const videoClipVersions = pgTable(
  "video_clip_versions",
  {
    id: text("id").primaryKey(),
    videoClipId: text("video_clip_id")
      .notNull()
      .references(() => videoClips.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    status: videoStatusEnum("status")
      .notNull()
      .$type<VideoStatus>()
      .default("pending"),
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
    sourceVideoGenJobId: text("source_video_gen_job_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table): PgTableExtraConfigValue[] => [
    index("video_clip_versions_video_clip_id_idx").on(table.videoClipId),
    index("video_clip_versions_status_idx").on(table.status),
    index("video_clip_versions_source_video_gen_job_id_idx").on(
      table.sourceVideoGenJobId
    ),
    uniqueIndex("video_clip_versions_clip_id_id_uidx").on(
      table.videoClipId,
      table.id
    ),
    uniqueIndex("video_clip_versions_clip_version_number_uidx").on(
      table.videoClipId,
      table.versionNumber
    ),
    crudPolicy({
      role: authenticatedRole,
      read: sql`(
        select ${listings.userId} = auth.user_id()
        from ${listings}
        join ${videoClips} on ${videoClips.listingId} = ${listings.id}
        where ${videoClips.id} = ${table.videoClipId}
      )`,
      modify: sql`(
        select ${listings.userId} = auth.user_id()
        from ${listings}
        join ${videoClips} on ${videoClips.listingId} = ${listings.id}
        where ${videoClips.id} = ${table.videoClipId}
      )`
    })
  ]
);
