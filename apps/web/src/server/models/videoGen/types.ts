import type {
  InsertDBVideoClip,
  InsertDBVideoClipVersion,
  InsertDBVideoGenBatch,
  InsertDBVideoGenJob
} from "@db/types/models";

export type VideoGenBatchUpdates = Partial<
  Omit<InsertDBVideoGenBatch, "id" | "listingId" | "createdAt">
>;

export type VideoGenJobUpdates = Partial<
  Omit<InsertDBVideoGenJob, "id" | "videoGenBatchId" | "createdAt" | "updatedAt">
>;

export type VideoClipUpdates = Partial<
  Omit<InsertDBVideoClip, "id" | "listingId" | "createdAt" | "updatedAt">
>;

export type VideoClipVersionUpdates = Partial<
  Omit<InsertDBVideoClipVersion, "id" | "videoClipId" | "createdAt" | "updatedAt">
>;
