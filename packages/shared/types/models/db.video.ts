/**
 * Video Content Database Model Types
 *
 * Type definitions for video-related database operations
 */

import {
  videoGenBatch,
  videoGenJobs,
  videoStatusEnum
} from "@db/client";

export type DBVideoGenBatch = typeof videoGenBatch.$inferSelect;
export type InsertDBVideoGenBatch = typeof videoGenBatch.$inferInsert;

export type DBVideoGenJob = typeof videoGenJobs.$inferSelect;
export type InsertDBVideoGenJob = typeof videoGenJobs.$inferInsert;

export type VideoStatus = (typeof videoStatusEnum.enumValues)[number];

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
  checksumSha256?: string;
};

export type GENERATION_MODELS =
  | "veo3.1_fast"
  | "runway-gen4-turbo"
  | "kling1.6";

export type JobGenerationSettings = {
  model: GENERATION_MODELS;
  orientation: VideoOrientation;
  aiDirections: string;
  imageUrls: string[];
  prompt: string;
  category: string;
  sortOrder: number;
  durationSeconds?: number;
  roomId?: string;
  roomName?: string;
  roomNumber?: number;
  clipIndex?: number;
};
