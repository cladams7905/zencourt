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
