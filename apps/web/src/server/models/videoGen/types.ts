import type {
  InsertDBVideoGenBatch,
  InsertDBVideoGenJob
} from "@db/types/models";

export type VideoGenBatchUpdates = Partial<
  Omit<InsertDBVideoGenBatch, "id" | "listingId" | "createdAt">
>;

export type VideoGenJobUpdates = Partial<
  Omit<InsertDBVideoGenJob, "id" | "videoGenBatchId" | "createdAt" | "updatedAt">
>;
