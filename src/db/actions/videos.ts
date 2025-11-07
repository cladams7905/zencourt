/**
 * Video Database Actions
 *
 * CRUD operations for managing video records
 */

"use server";

import { db } from "@/db";
import { videos } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import type {
  CreateVideoParams,
  UpdateVideoParams,
  Video,
  VideoStatus
} from "@/types/video-generation";

// ============================================================================
// Create Operations
// ============================================================================

/**
 * Create a new video record
 */
export async function createVideoRecord(
  params: CreateVideoParams
): Promise<Video> {
  try {
    const videoId = `video-${params.projectId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const [video] = await db
      .insert(videos)
      .values({
        id: videoId,
        projectId: params.projectId,
        roomId: params.roomId ?? null,
        roomName: params.roomName ?? null,
        videoUrl: params.videoUrl,
        duration: params.duration,
        status: params.status,
        generationSettings: params.generationSettings ?? null,
        errorMessage: null,
        thumbnailUrl: null
      })
      .returning();

    if (!video) {
      throw new Error("Failed to create video record");
    }

    console.log(`Created video record: ${videoId}`);
    return video as Video;
  } catch (error) {
    console.error("Error creating video record:", error);
    throw new Error("Failed to create video record");
  }
}

/**
 * Create multiple video records (for batch room processing)
 */
export async function createVideoRecords(
  params: CreateVideoParams[]
): Promise<Video[]> {
  try {
    const videoRecords = params.map((param) => ({
      id: `video-${param.projectId}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      projectId: param.projectId,
      roomId: param.roomId ?? null,
      roomName: param.roomName ?? null,
      videoUrl: param.videoUrl,
      duration: param.duration,
      status: param.status,
      generationSettings: param.generationSettings ?? null,
      errorMessage: null,
      thumbnailUrl: null
    }));

    const createdVideos = await db.insert(videos).values(videoRecords).returning();

    console.log(`Created ${createdVideos.length} video records`);
    return createdVideos as Video[];
  } catch (error) {
    console.error("Error creating video records:", error);
    throw new Error("Failed to create video records");
  }
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get all videos for a project
 */
export async function getVideosByProject(projectId: string): Promise<Video[]> {
  try {
    const projectVideos = await db
      .select()
      .from(videos)
      .where(eq(videos.projectId, projectId))
      .orderBy(videos.createdAt);

    return projectVideos as Video[];
  } catch (error) {
    console.error("Error getting videos by project:", error);
    throw new Error("Failed to get videos by project");
  }
}

/**
 * Get video for a specific room
 */
export async function getVideoByRoom(
  projectId: string,
  roomId: string
): Promise<Video | null> {
  try {
    const [video] = await db
      .select()
      .from(videos)
      .where(and(eq(videos.projectId, projectId), eq(videos.roomId, roomId)))
      .limit(1);

    return (video as Video) || null;
  } catch (error) {
    console.error("Error getting video by room:", error);
    throw new Error("Failed to get video by room");
  }
}

/**
 * Get the final combined video for a project (roomId is NULL)
 */
export async function getFinalVideo(projectId: string): Promise<Video | null> {
  try {
    const [video] = await db
      .select()
      .from(videos)
      .where(and(eq(videos.projectId, projectId), isNull(videos.roomId)))
      .limit(1);

    return (video as Video) || null;
  } catch (error) {
    console.error("Error getting final video:", error);
    throw new Error("Failed to get final video");
  }
}

/**
 * Get a specific video by ID
 */
export async function getVideoById(videoId: string): Promise<Video | null> {
  try {
    const [video] = await db
      .select()
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1);

    return (video as Video) || null;
  } catch (error) {
    console.error("Error getting video by ID:", error);
    throw new Error("Failed to get video by ID");
  }
}

/**
 * Get room videos only (exclude final video)
 */
export async function getRoomVideos(projectId: string): Promise<Video[]> {
  try {
    const roomVideos = await db
      .select()
      .from(videos)
      .where(
        and(
          eq(videos.projectId, projectId),
          // Only get videos where roomId is NOT NULL
          eq(videos.roomId, videos.roomId)
        )
      )
      .orderBy(videos.createdAt);

    // Filter out null roomIds in application layer for type safety
    return roomVideos.filter((v) => v.roomId !== null) as Video[];
  } catch (error) {
    console.error("Error getting room videos:", error);
    throw new Error("Failed to get room videos");
  }
}

/**
 * Get videos by status
 */
export async function getVideosByStatus(
  projectId: string,
  status: VideoStatus
): Promise<Video[]> {
  try {
    const statusVideos = await db
      .select()
      .from(videos)
      .where(and(eq(videos.projectId, projectId), eq(videos.status, status)))
      .orderBy(videos.createdAt);

    return statusVideos as Video[];
  } catch (error) {
    console.error("Error getting videos by status:", error);
    throw new Error("Failed to get videos by status");
  }
}

// ============================================================================
// Update Operations
// ============================================================================

/**
 * Update a video record
 */
export async function updateVideoRecord(
  videoId: string,
  updates: UpdateVideoParams
): Promise<void> {
  try {
    await db
      .update(videos)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(videos.id, videoId));

    console.log(`Updated video record: ${videoId}`);
  } catch (error) {
    console.error("Error updating video record:", error);
    throw new Error("Failed to update video record");
  }
}

/**
 * Update video status
 */
export async function updateVideoStatus(
  videoId: string,
  status: VideoStatus,
  errorMessage?: string
): Promise<void> {
  try {
    await db
      .update(videos)
      .set({
        status,
        errorMessage: errorMessage ?? null,
        updatedAt: new Date()
      })
      .where(eq(videos.id, videoId));

    console.log(`Updated video status: ${videoId} -> ${status}`);
  } catch (error) {
    console.error("Error updating video status:", error);
    throw new Error("Failed to update video status");
  }
}

/**
 * Update video with fal.ai request ID
 */
export async function updateVideoFalRequestId(
  videoId: string,
  falRequestId: string
): Promise<void> {
  try {
    await db
      .update(videos)
      .set({
        falRequestId,
        updatedAt: new Date()
      })
      .where(eq(videos.id, videoId));

    console.log(`Updated video ${videoId} with fal request ID: ${falRequestId}`);
  } catch (error) {
    console.error("Error updating fal request ID:", error);
    throw new Error("Failed to update fal request ID");
  }
}

/**
 * Mark video as completed with URL
 */
export async function markVideoCompleted(
  videoId: string,
  videoUrl: string,
  thumbnailUrl?: string,
  duration?: number
): Promise<void> {
  try {
    const updateData: {
      status: string;
      videoUrl: string;
      thumbnailUrl: string | null;
      errorMessage: string | null;
      updatedAt: Date;
      duration?: number;
    } = {
      status: "completed",
      videoUrl,
      thumbnailUrl: thumbnailUrl ?? null,
      errorMessage: null,
      updatedAt: new Date()
    };

    // Only update duration if provided
    if (duration !== undefined) {
      updateData.duration = Math.round(duration);
    }

    await db
      .update(videos)
      .set(updateData)
      .where(eq(videos.id, videoId));

    console.log(`Marked video as completed: ${videoId}`);
  } catch (error) {
    console.error("Error marking video as completed:", error);
    throw new Error("Failed to mark video as completed");
  }
}

/**
 * Mark video as failed with error
 */
export async function markVideoFailed(
  videoId: string,
  errorMessage: string
): Promise<void> {
  try {
    await db
      .update(videos)
      .set({
        status: "failed",
        errorMessage,
        updatedAt: new Date()
      })
      .where(eq(videos.id, videoId));

    console.log(`Marked video as failed: ${videoId}`);
  } catch (error) {
    console.error("Error marking video as failed:", error);
    throw new Error("Failed to mark video as failed");
  }
}

// ============================================================================
// Delete Operations
// ============================================================================

/**
 * Delete all videos for a project (cascade on project delete handles this automatically)
 */
export async function deleteVideos(projectId: string): Promise<void> {
  try {
    await db.delete(videos).where(eq(videos.projectId, projectId));

    console.log(`Deleted all videos for project: ${projectId}`);
  } catch (error) {
    console.error("Error deleting videos:", error);
    throw new Error("Failed to delete videos");
  }
}

/**
 * Delete a specific video by ID
 */
export async function deleteVideo(videoId: string): Promise<void> {
  try {
    await db.delete(videos).where(eq(videos.id, videoId));

    console.log(`Deleted video: ${videoId}`);
  } catch (error) {
    console.error("Error deleting video:", error);
    throw new Error("Failed to delete video");
  }
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
  try {
    const projectVideos = await getVideosByProject(projectId);

    const stats = {
      total: projectVideos.length,
      completed: projectVideos.filter((v) => v.status === "completed").length,
      failed: projectVideos.filter((v) => v.status === "failed").length,
      processing: projectVideos.filter((v) => v.status === "processing").length,
      pending: projectVideos.filter((v) => v.status === "pending").length
    };

    return stats;
  } catch (error) {
    console.error("Error getting video generation stats:", error);
    throw new Error("Failed to get video generation stats");
  }
}

/**
 * Check if all room videos are completed
 */
export async function areAllRoomVideosCompleted(
  projectId: string
): Promise<boolean> {
  try {
    const roomVideos = await getRoomVideos(projectId);

    if (roomVideos.length === 0) {
      return false;
    }

    return roomVideos.every((v) => v.status === "completed");
  } catch (error) {
    console.error("Error checking room videos completion:", error);
    return false;
  }
}
