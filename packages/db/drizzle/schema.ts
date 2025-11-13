/**
 * Database Schema
 *
 * Defines the structure for projects and images in the database with RLS policies.
 */

import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  varchar,
  index,
  real
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authenticatedRole, authUid, crudPolicy } from "drizzle-orm/neon";
import {
  ProjectMetadata,
  ProjectStatus,
  ImageMetadata
} from "@shared/types/models";

/**
 * Projects table
 * Stores video project metadata
 */
export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(), // UUID or custom ID
    userId: text("user_id").notNull(), // From Stack Auth
    title: text("title"),
    status: varchar("status", { length: 50 })
      .$type<ProjectStatus>()
      .notNull()
      .default("uploading"), // uploading, analyzing, draft, published
    format: varchar("format", { length: 20 }), // vertical, landscape
    platform: varchar("platform", { length: 50 }), // youtube, tiktok, instagram, etc.
    thumbnailUrl: text("thumbnail_url"),
    videoUrl: text("video_url"),
    duration: integer("duration"), // in seconds
    subtitles: jsonb("subtitles").$type<boolean>().default(false),
    metadata: jsonb("metadata").$type<ProjectMetadata>(), // Additional project metadata
    // Video generation fields
    videoGenerationStatus: varchar("video_generation_status", { length: 50 }), // idle, processing, completed, failed
    finalVideoUrl: text("final_video_url"),
    finalVideoDuration: integer("final_video_duration"), // in seconds
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    // RLS Policy: Users can only access their own projects
    crudPolicy({
      role: authenticatedRole,
      read: authUid(table.userId),
      modify: authUid(table.userId)
    })
  ]
);

/**
 * Images table
 * Stores uploaded images for projects
 */
export const images = pgTable(
  "images",
  {
    id: text("id").primaryKey(), // UUID or custom ID
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    url: text("url").notNull(), // Vercel Blob URL
    category: varchar("category", { length: 50 }), // room classification
    confidence: real("confidence"), // AI confidence score (0.0-1.0)
    features: jsonb("features").$type<string[]>(), // Detected features
    sceneDescription: text("scene_description"), // Detailed scene description for video generation
    order: integer("order"), // Display order in video
    metadata: jsonb("metadata").$type<ImageMetadata>(), // Additional image metadata
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull()
  },
  (table) => [
    // RLS Policy: Users can only access images from their own projects
    crudPolicy({
      role: authenticatedRole,
      read: sql`(select ${projects.userId} = auth.user_id() from ${projects} where ${projects.id} = ${table.projectId})`,
      modify: sql`(select ${projects.userId} = auth.user_id() from ${projects} where ${projects.id} = ${table.projectId})`
    })
  ]
);

/**
 * Videos table
 * Stores generated videos for projects (room videos and final combined video)
 */
export const videos = pgTable(
  "videos",
  {
    id: text("id").primaryKey(), // UUID or custom ID
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    roomId: text("room_id"), // NULL for final combined video
    roomName: text("room_name"),
    videoUrl: text("video_url"), // Vercel Blob URL
    thumbnailUrl: text("thumbnail_url"),
    duration: integer("duration"), // in seconds
    status: varchar("status", { length: 50 }).notNull(), // pending, processing, completed, failed
    generationSettings: jsonb("generation_settings"), // Store Kling API request params
    falRequestId: text("fal_request_id"), // fal.ai request ID for webhook matching
    errorMessage: text("error_message"),
    archivedAt: timestamp("archived_at"), // When the clip was archived (room videos only)
    archiveBatchId: text("archive_batch_id"), // Batch identifier for grouped archives
    archiveLabel: text("archive_label"), // Human-friendly version label
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    // Indexes for performance
    index("videos_project_id_idx").on(table.projectId),
    index("videos_room_id_idx").on(table.roomId),
    index("videos_status_idx").on(table.status),
    index("videos_fal_request_id_idx").on(table.falRequestId), // Index for webhook lookup
    // RLS Policy: Users can only access videos from their own projects
    crudPolicy({
      role: authenticatedRole,
      read: sql`(select ${projects.userId} = auth.user_id() from ${projects} where ${projects.id} = ${table.projectId})`,
      modify: sql`(select ${projects.userId} = auth.user_id() from ${projects} where ${projects.id} = ${table.projectId})`
    })
  ]
);

/**
 * Video Jobs table
 * Tracks video processing jobs sent to AWS Express server
 */
export const videoJobs = pgTable(
  "video_jobs",
  {
    id: text("id").primaryKey(), // Job ID from nanoid
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(), // From Stack Auth
    status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, processing, completed, failed
    progress: integer("progress").default(0), // 0-100
    // Video processing result
    videoUrl: text("video_url"), // Final composed video URL
    thumbnailUrl: text("thumbnail_url"), // Video thumbnail URL
    duration: integer("duration"), // Video duration in seconds
    resolution: jsonb("resolution").$type<{ width: number; height: number }>(), // Video resolution
    // Error tracking
    errorMessage: text("error_message"),
    errorType: varchar("error_type", { length: 100 }),
    errorRetryable: jsonb("error_retryable").$type<boolean>(),
    // Processing metadata
    compositionSettings: jsonb("composition_settings"), // Store composition settings
    estimatedDuration: integer("estimated_duration"), // Estimated processing time in seconds
    queuePosition: integer("queue_position"), // Position in processing queue
    startedAt: timestamp("started_at"), // When processing actually started
    completedAt: timestamp("completed_at"), // When processing completed (success or failure)
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    // Indexes for performance
    index("video_jobs_project_id_idx").on(table.projectId),
    index("video_jobs_user_id_idx").on(table.userId),
    index("video_jobs_status_idx").on(table.status),
    // RLS Policy: Users can only access their own video jobs
    crudPolicy({
      role: authenticatedRole,
      read: authUid(table.userId),
      modify: authUid(table.userId)
    })
  ]
);
