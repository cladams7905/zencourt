/**
 * Video Database Model Types
 *
 * Type definitions for video-related database operations
 */

import { videos, videoJobs } from "@db/client";

export type DBVideo = typeof videos.$inferSelect;
export type InsertDBVideo = typeof videos.$inferInsert;

export type DBVideoJob = typeof videoJobs.$inferSelect;
export type InsertDBVideoJob = typeof videoJobs.$inferInsert;

export type VideoStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "canceled";

export type VideoResolution = {
  width: number;
  height: number;
};

export type VideoOrientation = "landscape" | "vertical";

export type VideoMetadata = {
  duration?: number;
  resolution?: VideoResolution;
  orientation?: VideoOrientation;
  fileSize?: number;
};

export type GENERATION_MODELS = "kling1.6";

export type JobGenerationSettings = {
  model: GENERATION_MODELS;
  orientation: VideoOrientation;
  aiDirections: string;
  imageUrls: string[];
  prompt: string;
  category: string;
  sortOrder: number;
};

export type JobDeliveryStatus =
  | "pending"
  | "delivering"
  | "delivered"
  | "failed";
