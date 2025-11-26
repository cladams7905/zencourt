import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  varchar,
  index,
  real,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authenticatedRole, authUid, crudPolicy } from "drizzle-orm/neon";
import {
  ImageMetadata,
  VideoStatus,
  VideoMetadata,
  JobGenerationSettings,
  GENERATION_MODELS
} from "@shared/types/models";

export const assetGenerationTypeEnum = pgEnum("asset_generation_type", [
  "video"
]);
export const assetGenerationStageEnum = pgEnum("asset_generation_stage", [
  "upload",
  "categorize",
  "plan",
  "review",
  "generate",
  "complete"
]);
export const videoStatusEnum = pgEnum("video_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "canceled"
]);

/**
 * Projects table
 * Stores project metadata and ownership
 */
export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    index("projects_user_id_idx").on(table.userId),
    crudPolicy({
      role: authenticatedRole,
      read: authUid(table.userId),
      modify: authUid(table.userId)
    })
  ]
);

/**
 * Collections table
 * Stores property images used as input for project assets
 */
export const collections = pgTable(
  "collections",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    index("collections_project_id_idx").on(table.projectId),
    index("collections_created_at_idx").on(table.createdAt),
    uniqueIndex("collections_project_id_unique").on(table.projectId),
    crudPolicy({
      role: authenticatedRole,
      read: sql`(select ${projects.userId} = auth.user_id() from ${projects} where ${projects.id} = ${table.projectId})`,
      modify: sql`(select ${projects.userId} = auth.user_id() from ${projects} where ${projects.id} = ${table.projectId})`
    })
  ]
);

/**
 * Assets table
 * Stores generated assets tied to a parent project
 */
export const assets = pgTable(
  "assets",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title"),
    type: assetGenerationTypeEnum("generation_type").notNull(),
    stage: assetGenerationStageEnum("generation_stage")
      .notNull()
      .default("upload"),
    thumbnailUrl: text("thumbnail_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    index("assets_project_id_idx").on(table.projectId),
    index("assets_type_idx").on(table.type),
    crudPolicy({
      role: authenticatedRole,
      read: sql`(select ${projects.userId} = auth.user_id() from ${projects} where ${projects.id} = ${table.projectId})`,
      modify: sql`(select ${projects.userId} = auth.user_id() from ${projects} where ${projects.id} = ${table.projectId})`
    })
  ]
);

/**
 * Collection Images table
 * Stores uploaded images for a collection
 */
export const collectionImages = pgTable(
  "collection_images",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
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
    index("collection_images_collection_id_idx").on(table.collectionId),
    crudPolicy({
      role: authenticatedRole,
      read: sql`(select ${projects.userId} = auth.user_id()
        from ${projects}
        join ${collections} on ${collections.projectId} = ${projects.id}
        where ${collections.id} = ${table.collectionId})`,
      modify: sql`(select ${projects.userId} = auth.user_id()
        from ${projects}
        join ${collections} on ${collections.projectId} = ${projects.id}
        where ${collections.id} = ${table.collectionId})`
    })
  ]
);

/**
 * Video Assets table
 * Stores finalized videos for an asset
 */
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

/**
 * Video Asset Jobs table
 * Tracks individual processing tasks for video assets
 */
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
