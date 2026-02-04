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

import { content } from "./content";
import { videoContent } from "./videoContent";
import { videoStatusEnum } from "./enums";

export const videoContentJobs = pgTable(
  "video_content_jobs",
  {
    id: text("id").primaryKey(),
    videoContentId: text("video_content_id")
      .notNull()
      .references(() => videoContent.id, { onDelete: "cascade" }),
    requestId: text("request_id"),
    status: videoStatusEnum("status")
      .notNull()
      .default("pending")
      .$type<VideoStatus>(),
    videoUrl: text("video_url"),
    thumbnailUrl: text("thumbnail_url"),
    generationModel: text("generation_model")
      .notNull()
      .default("runway-gen4-turbo")
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
    index("video_content_jobs_video_content_id_idx").on(
      table.videoContentId
    ),
    index("video_content_jobs_status_idx").on(table.status),
    index("video_content_jobs_video_content_status_idx").on(
      table.videoContentId,
      table.status
    ),
    index("video_content_jobs_status_created_idx").on(
      table.status,
      table.createdAt
    ),
    index("video_content_jobs_request_id_idx").on(table.requestId),
    crudPolicy({
      role: authenticatedRole,
      read: sql`(select ${content.userId} = auth.user_id() from ${content}
        join ${videoContent} on ${videoContent.contentId} = ${content.id}
        where ${videoContent.id} = ${table.videoContentId})`,
      modify: sql`(select ${content.userId} = auth.user_id() from ${content}
        join ${videoContent} on ${videoContent.contentId} = ${content.id}
        where ${videoContent.id} = ${table.videoContentId})`
    })
  ]
);
