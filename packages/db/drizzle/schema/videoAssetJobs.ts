import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar
} from "drizzle-orm/pg-core";
import { authenticatedRole, crudPolicy } from "drizzle-orm/neon";

import type {
  GENERATION_MODELS,
  JobGenerationSettings,
  VideoMetadata,
  VideoStatus
} from "@shared/types/models";

import { assets } from "./assets";
import { projects } from "./projects";
import { videoAssets } from "./videoAssets";
import { videoStatusEnum } from "./enums";

export const videoAssetJobs = pgTable(
  "video_asset_jobs",
  {
    id: text("id").primaryKey(),
    videoAssetId: text("video_asset_id")
      .notNull()
      .references(() => videoAssets.id, { onDelete: "cascade" }),
    requestId: text("request_id"),
    status: videoStatusEnum("status")
      .notNull()
      .default("pending")
      .$type<VideoStatus>(),
    videoUrl: text("video_url"),
    thumbnailUrl: text("thumbnail_url"),
    generationModel: text("generation_model")
      .notNull()
      .default("kling1.6")
      .$type<GENERATION_MODELS>(),
    generationSettings: jsonb(
      "generation_settings"
    ).$type<JobGenerationSettings>(),
    metadata: jsonb("metadata").$type<VideoMetadata>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    archivedAt: timestamp("archived_at"),
    errorMessage: text("error_message"),
    errorType: varchar("error_type", { length: 100 }),
    errorRetryable: jsonb("error_retryable").$type<boolean>(),
    processingStartedAt: timestamp("processing_submitted_at"),
    processingCompletedAt: timestamp("processing_completed_at"),
    deliveryAttempedAt: timestamp("delivery_attempted_at"),
    deliveryAttemptCount: integer("delivery_attempt_count").default(0),
    deliveryLastError: text("delivery_last_error")
  },
  (table) => [
    index("video_asset_jobs_video_asset_id_idx").on(table.videoAssetId),
    index("video_asset_jobs_status_idx").on(table.status),
    index("video_asset_jobs_video_asset_status_idx").on(
      table.videoAssetId,
      table.status
    ),
    index("video_asset_jobs_status_created_idx").on(
      table.status,
      table.createdAt
    ),
    index("video_asset_jobs_request_id_idx").on(table.requestId),
    crudPolicy({
      role: authenticatedRole,
      read: sql`(select ${projects.userId} = auth.user_id() from ${projects}
        join ${assets} on ${assets.projectId} = ${projects.id}
        join ${videoAssets} on ${videoAssets.assetId} = ${assets.id}
        where ${videoAssets.id} = ${table.videoAssetId})`,
      modify: sql`(select ${projects.userId} = auth.user_id() from ${projects}
        join ${assets} on ${assets.projectId} = ${projects.id}
        join ${videoAssets} on ${videoAssets.assetId} = ${assets.id}
        where ${videoAssets.id} = ${table.videoAssetId})`
    })
  ]
);
