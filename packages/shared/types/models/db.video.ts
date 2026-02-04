/**
 * Video Content Database Model Types
 *
 * Type definitions for video-related database operations
 */

import {
  videoContent,
  videoContentJobs,
  videoRenderJobs,
  videoStatusEnum
} from "@db/client";

export type DBVideoContent = typeof videoContent.$inferSelect;
export type InsertDBVideoContent = typeof videoContent.$inferInsert;

export type DBVideoContentJob = typeof videoContentJobs.$inferSelect;
export type InsertDBVideoContentJob = typeof videoContentJobs.$inferInsert;
export type DBVideoRenderJob = typeof videoRenderJobs.$inferSelect;
export type InsertDBVideoRenderJob = typeof videoRenderJobs.$inferInsert;

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

export type GENERATION_MODELS = "runway-gen4-turbo" | "kling1.6";

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
};
