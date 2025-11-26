/**
 * Video Database Model Types
 *
 * Type definitions for video-related database operations
 */

import { videoAssets, videoAssetJobs, videoStatusEnum } from "@db/client";

export type DBVideo = typeof videoAssets.$inferSelect;
export type InsertDBVideo = typeof videoAssets.$inferInsert;

export type DBVideoJob = typeof videoAssetJobs.$inferSelect;
export type InsertDBVideoJob = typeof videoAssetJobs.$inferInsert;

export type VideoStatus = typeof videoStatusEnum;

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
  roomId?: string;
  roomName?: string;
  roomNumber?: number;
};
