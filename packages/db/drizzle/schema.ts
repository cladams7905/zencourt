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
  ProjectStatus,
  ImageMetadata,
  VideoStatus,
  VideoMetadata,
  JobGenerationSettings,
  GENERATION_MODELS
} from "@shared/types/models";

/**
 * Projects table
 * Stores project metadata
 */
export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(), // From Stack Auth
    title: text("title"),
    status: varchar("status", { length: 50 })
      .$type<ProjectStatus>()
      .notNull()
      .default("draft"), // draft, published
    thumbnailUrl: text("thumbnail_url"),
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
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    url: text("url").notNull(), // Vercel Blob URL
    category: varchar("category", { length: 50 }), // room classification
    confidence: real("confidence"), // AI confidence score (0.0-1.0)
    features: jsonb("features").$type<string[]>(), // Detected features
    sceneDescription: text("scene_description"), // Detailed scene description for video generation
    sortOrder: integer("sort_order"), // Display order in video
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
 * Stores finalized videos in a project
 */
export const videos = pgTable(
  "videos",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    videoUrl: text("video_url"), // finalized video URL made up of 1 or many videoJob urls
    thumbnailUrl: text("thumbnail_url"),
    status: varchar("status", { length: 50 })
      .notNull()
      .default("pending")
      .$type<VideoStatus>(), // pending, processing, completed, failed, canceled
    metadata: jsonb("metadata").$type<VideoMetadata>(), // Additional video metadata
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    // Indexes for performance
    index("videos_project_id_idx").on(table.projectId),
    index("videos_status_idx").on(table.status),
    index("videos_project_status_idx").on(table.projectId, table.status),
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
 * Tracks individual video processing jobs sent to the external video server
 */
export const videoJobs = pgTable(
  "video_jobs",
  {
    id: text("id").primaryKey(), // Job ID from nanoid
    videoId: text("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    requestId: text("request_id"), // job request ID for webhook matching
    status: varchar("status", { length: 50 })
      .notNull()
      .default("pending")
      .$type<VideoStatus>(), // pending, processing, completed, failed, canceled
    videoUrl: text("video_url"), // video URL returned from API
    thumbnailUrl: text("thumbnail_url"), // thumbnail of an individual video
    generationModel: text("generation_model")
      .notNull()
      .default("kling1.6")
      .$type<GENERATION_MODELS>(), // The video generation model used
    generationSettings: jsonb(
      "generation_settings"
    ).$type<JobGenerationSettings>(), // Store generation API request params
    metadata: jsonb("metadata").$type<VideoMetadata>(), // Additional video metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),

    // Video archival
    archivedAt: timestamp("archived_at"), // When the job was archived

    // Error tracking
    errorMessage: text("error_message"),
    errorType: varchar("error_type", { length: 100 }),
    errorRetryable: jsonb("error_retryable").$type<boolean>(),

    // Job lifecycle timestamps
    processingStartedAt: timestamp("processing_submitted_at"), // When job was submitted to begin processing
    processingCompletedAt: timestamp("processing_completed_at"), // When job completed processing

    // Downstream webhook tracking
    deliveryAttempedAt: timestamp("delivery_attempted_at"), // time of last attempted downstream webhook delivery
    deliveryAttemptCount: integer("delivery_attempt_count").default(0), // Number of webhook delivery attempts
    deliveryLastError: text("delivery_last_error") // Last webhook delivery error
  },
  (table) => [
    // Indexes for performance
    index("video_jobs_video_id_idx").on(table.videoId),
    index("video_jobs_status_idx").on(table.status),
    index("video_jobs_video_status_idx").on(table.videoId, table.status),
    index("video_jobs_status_created_idx").on(table.status, table.createdAt),
    index("video_jobs_request_id_idx").on(table.requestId), // Index for webhook lookup
    // RLS Policy: Users can only access video jobs from their own videos
    crudPolicy({
      role: authenticatedRole,
      read: sql`(select ${projects.userId} = auth.user_id() from ${projects} join ${videos} on ${videos.projectId} = ${projects.id} where ${videos.id} = ${table.videoId})`,
      modify: sql`(select ${projects.userId} = auth.user_id() from ${projects} join ${videos} on ${videos.projectId} = ${projects.id} where ${videos.id} = ${table.videoId})`
    })
  ]
);
