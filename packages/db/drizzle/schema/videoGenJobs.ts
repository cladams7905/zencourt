import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";
import { authenticatedRole, crudPolicy } from "drizzle-orm/neon";

import type {
  JobGenerationSettings,
  VideoMetadata,
  VideoStatus
} from "@shared/types/models";

import { videoGenBatch } from "./videoGenBatch";
import { videoStatusEnum } from "./enums";
import { listings } from "./listings";

export const videoGenJobs = pgTable(
  "video_gen_jobs",
  {
    id: text("id").primaryKey(),
    videoGenBatchId: text("video_gen_batch_id")
      .notNull()
      .references(() => videoGenBatch.id, { onDelete: "cascade" }),
    requestId: text("request_id"),
    status: videoStatusEnum("status")
      .notNull()
      .default("pending")
      .$type<VideoStatus>(),
    videoUrl: text("video_url"),
    thumbnailUrl: text("thumbnail_url"),
    generationSettings: jsonb(
      "generation_settings"
    ).$type<JobGenerationSettings>(),
    metadata: jsonb("metadata").$type<VideoMetadata>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    errorMessage: text("error_message"),
  },
  (table) => [
    index("video_gen_jobs_video_gen_batch_id_idx").on(table.videoGenBatchId),
    index("video_gen_jobs_status_idx").on(table.status),
    index("video_gen_jobs_video_gen_batch_status_idx").on(
      table.videoGenBatchId,
      table.status
    ),
    index("video_gen_jobs_status_created_idx").on(
      table.status,
      table.createdAt
    ),
    index("video_gen_jobs_request_id_idx").on(table.requestId),
    crudPolicy({
      role: authenticatedRole,
      read: sql`(select ${listings.userId} = auth.user_id() from ${listings}
        join ${videoGenBatch} on ${videoGenBatch.listingId} = ${listings.id}
        where ${videoGenBatch.id} = ${table.videoGenBatchId})`,
      modify: sql`(select ${listings.userId} = auth.user_id() from ${listings}
        join ${videoGenBatch} on ${videoGenBatch.listingId} = ${listings.id}
        where ${videoGenBatch.id} = ${table.videoGenBatchId})`
    })
  ]
);
