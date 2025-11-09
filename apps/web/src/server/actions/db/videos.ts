"use server";

import { eq, and, isNull, isNotNull } from "drizzle-orm";
import type {
  InsertDBVideo,
  DBVideo as Video,
  VideoStatus
} from "@shared/types/models";
import { db, videos } from "@db/client";
import { withDbErrorHandling } from "../_utils";
import { getUser } from "./users";

/**
 * Create a new video record
 */
export async function createVideoRecord(params: InsertDBVideo): Promise<Video> {
  if (!params.projectId) {
    throw new Error("Project ID is required");
  }

  const [video] = await createVideoRecords([params]);
  return video;
}

/**
 * Create multiple video records (for batch room processing)
 */
export async function createVideoRecords(
  params: InsertDBVideo[]
): Promise<Video[]> {
  if (!params || params.length === 0) {
    throw new Error("At least one video record is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      const createdVideos = await db.insert(videos).values(params).returning();

      return createdVideos as Video[];
    },
    {
      actionName: "createVideoRecords",
      context: { count: params.length },
      errorMessage: "Failed to create video records. Please try again."
    }
  );
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get all videos for a project
 */
export async function getVideosByProject(projectId: string): Promise<Video[]> {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      const projectVideos = await db
        .select()
        .from(videos)
        .where(eq(videos.projectId, projectId))
        .orderBy(videos.createdAt);

      return projectVideos as Video[];
    },
    {
      actionName: "getVideosByProject",
      context: { projectId },
      errorMessage: "Failed to get videos. Please try again."
    }
  );
}

/**
 * Get video for a specific room
 */
export async function getVideoByRoom(
  projectId: string,
  roomId: string
): Promise<Video | null> {
  if (!projectId || !roomId) {
    throw new Error("Project ID and Room ID are required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      const [video] = await db
        .select()
        .from(videos)
        .where(and(eq(videos.projectId, projectId), eq(videos.roomId, roomId)))
        .limit(1);

      return (video as Video) || null;
    },
    {
      actionName: "getVideoByRoom",
      context: { projectId, roomId },
      errorMessage: "Failed to get video. Please try again."
    }
  );
}

/**
 * Get video by fal.ai request ID (for webhook processing)
 */
export async function getVideoByFalRequestId(
  falRequestId: string
): Promise<Video | null> {
  if (!falRequestId) {
    throw new Error("Fal request ID is required");
  }

  return withDbErrorHandling(
    async () => {
      const [video] = await db
        .select()
        .from(videos)
        .where(eq(videos.falRequestId, falRequestId))
        .limit(1);

      return (video as Video) || null;
    },
    {
      actionName: "getVideoByFalRequestId",
      context: { falRequestId },
      errorMessage: "Failed to get video by request ID. Please try again."
    }
  );
}

/**
 * Get the final combined video for a project (roomId is NULL)
 */
export async function getFinalVideo(projectId: string): Promise<Video | null> {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      const [video] = await db
        .select()
        .from(videos)
        .where(and(eq(videos.projectId, projectId), isNull(videos.roomId)))
        .limit(1);

      return (video as Video) || null;
    },
    {
      actionName: "getFinalVideo",
      context: { projectId },
      errorMessage: "Failed to get final video. Please try again."
    }
  );
}

/**
 * Get a specific video by ID
 */
export async function getVideoById(videoId: string): Promise<Video | null> {
  if (!videoId) {
    throw new Error("Video ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      const [video] = await db
        .select()
        .from(videos)
        .where(eq(videos.id, videoId))
        .limit(1);

      return (video as Video) || null;
    },
    {
      actionName: "getVideoById",
      context: { videoId },
      errorMessage: "Failed to get video. Please try again."
    }
  );
}

/**
 * Get room videos only (exclude final video)
 */
export async function getRoomVideos(projectId: string): Promise<Video[]> {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      const roomVideos = await db
        .select()
        .from(videos)
        .where(and(eq(videos.projectId, projectId), isNotNull(videos.roomId)))
        .orderBy(videos.createdAt);

      return roomVideos as Video[];
    },
    {
      actionName: "getRoomVideos",
      context: { projectId },
      errorMessage: "Failed to get room videos. Please try again."
    }
  );
}

/**
 * Get videos by status
 */
export async function getVideosByStatus(
  projectId: string,
  status: VideoStatus
): Promise<Video[]> {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      const statusVideos = await db
        .select()
        .from(videos)
        .where(and(eq(videos.projectId, projectId), eq(videos.status, status)))
        .orderBy(videos.createdAt);

      return statusVideos as Video[];
    },
    {
      actionName: "getVideosByStatus",
      context: { projectId, status },
      errorMessage: "Failed to get videos by status. Please try again."
    }
  );
}

// ============================================================================
// Update Operations
// ============================================================================

/**
 * Update a video record
 */
export async function updateVideoRecord(
  videoId: string,
  updates: InsertDBVideo
): Promise<void> {
  if (!videoId) {
    throw new Error("Video ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      await db
        .update(videos)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(videos.id, videoId));
    },
    {
      actionName: "updateVideoRecord",
      context: { videoId },
      errorMessage: "Failed to update video record. Please try again."
    }
  );
}

// ============================================================================
// Delete Operations
// ============================================================================

/**
 * Delete all videos for a project (cascade on project delete handles this automatically)
 */
export async function deleteVideos(projectId: string): Promise<void> {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      await db.delete(videos).where(eq(videos.projectId, projectId));
    },
    {
      actionName: "deleteVideos",
      context: { projectId },
      errorMessage: "Failed to delete videos. Please try again."
    }
  );
}

/**
 * Delete a specific video by ID
 */
export async function deleteVideo(videoId: string): Promise<void> {
  if (!videoId) {
    throw new Error("Video ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      await db.delete(videos).where(eq(videos.id, videoId));
    },
    {
      actionName: "deleteVideo",
      context: { videoId },
      errorMessage: "Failed to delete video. Please try again."
    }
  );
}

// ============================================================================
// Utility Operations
// ============================================================================

/**
 * Get video generation statistics for a project
 */
export async function getVideoGenerationStats(projectId: string): Promise<{
  total: number;
  completed: number;
  failed: number;
  processing: number;
  pending: number;
}> {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      const projectVideos = await db
        .select()
        .from(videos)
        .where(eq(videos.projectId, projectId));

      const stats = {
        total: projectVideos.length,
        completed: projectVideos.filter((v) => v.status === "completed").length,
        failed: projectVideos.filter((v) => v.status === "failed").length,
        processing: projectVideos.filter((v) => v.status === "processing")
          .length,
        pending: projectVideos.filter((v) => v.status === "pending").length
      };

      return stats;
    },
    {
      actionName: "getVideoGenerationStats",
      context: { projectId },
      errorMessage: "Failed to get video statistics. Please try again."
    }
  );
}

/**
 * Check if all room videos are completed
 */
export async function areAllRoomVideosCompleted(
  projectId: string
): Promise<boolean> {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      const roomVideos = await db
        .select()
        .from(videos)
        .where(and(eq(videos.projectId, projectId), isNotNull(videos.roomId)));

      if (roomVideos.length === 0) {
        return false;
      }

      return roomVideos.every((v) => v.status === "completed");
    },
    {
      actionName: "areAllRoomVideosCompleted",
      context: { projectId },
      errorMessage: "Failed to check video completion status. Please try again."
    }
  );
}
