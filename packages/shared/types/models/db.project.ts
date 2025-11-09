import { projects } from "@db/client";

export type DBProject = typeof projects.$inferSelect;

export type InsertDBProject = typeof projects.$inferInsert;

export type ProjectStatus = "uploading" | "analyzing" | "draft" | "published";

export type ProjectMetadata = {
  generationJobs?: any[];
  videoThumbnailUrl?: string;
  videoResolution?: { width: number; height: number };
  completedAt?: string;
  error?: {
    message: string;
    type: string;
    retryable: boolean;
    failedAt: string;
  };
};
