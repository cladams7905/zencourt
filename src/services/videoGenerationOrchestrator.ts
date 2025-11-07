/**
 * Video Generation Orchestrator
 *
 * Main orchestration service for complete video generation workflow:
 * 1. Process room videos via Kling API
 * 2. Combine videos with composition service
 * 3. Track progress and handle errors
 * 4. Update database records
 */

"use server";

import { submitRoomVideoRequest } from "./klingService";
import { combineRoomVideos } from "./videoCompositionService";
import {
  createVideoRecord,
  updateVideoStatus,
  updateVideoFalRequestId,
  markVideoCompleted,
  getVideosByProject,
  getFinalVideo
} from "@/db/actions/videos";
import { db } from "@/db";
import { projects, images } from "@/db/schema";
import { eq } from "drizzle-orm";
import type {
  RoomVideoRequest,
  RoomVideoResult,
  VideoCompositionSettings,
  VideoGenerationProgress,
  VideoProgressStep,
  VideoGenerationStatus
} from "@/types/video-generation";

// ============================================================================
// Main Orchestration Functions
// ============================================================================

export interface VideoSettings {
  orientation: "landscape" | "vertical";
  roomOrder: Array<{ id: string; name: string; imageCount: number }>;
  logoFile?: File | null;
  logoPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  scriptText: string;
  enableSubtitles: boolean;
  subtitleFont: string;
  aiDirections: string;
  duration: "5" | "10";
}

export interface RoomData {
  id: string;
  name: string;
  type: string;
  imageUrls: string[];
  sceneDescriptions?: string[]; // Detailed descriptions from OpenAI vision
}

export interface VideoGenerationResult {
  success: boolean;
  finalVideoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  failedRooms: string[];
  error?: string;
}

/**
 * Start video generation workflow - FAST submission phase only
 * Returns immediately after submitting to fal.ai (doesn't wait for completion)
 */
export async function startVideoGeneration(
  projectId: string,
  userId: string,
  videoSettings: VideoSettings,
  onProgress?: (progress: VideoGenerationProgress) => void
): Promise<VideoGenerationResult> {
  console.log(
    `[Video Generation] ========================================`
  );
  console.log(
    `[Video Generation] Starting generation for project: ${projectId}`
  );
  console.log(
    `[Video Generation] User: ${userId}, Rooms: ${videoSettings.roomOrder.length}`
  );

  try {
    // Step 1: Fetch project data and images
    console.log(`[Video Generation] Step 1: Fetching project rooms...`);
    const rooms = await fetchProjectRooms(projectId, videoSettings.roomOrder);
    console.log(`[Video Generation] ✓ Fetched ${rooms.length} rooms`);

    if (rooms.length === 0) {
      console.error(`[Video Generation] ❌ No rooms found!`);
      throw new Error("No rooms found for video generation");
    }

    // Log room details
    rooms.forEach((room, idx) => {
      console.log(`[Video Generation] Room ${idx + 1}: ${room.name} (${room.type}) - ${room.imageUrls.length} images, ${room.sceneDescriptions?.length || 0} descriptions`);
    });

    // Step 2: Submit room videos to fal.ai (FAST - just submission, not completion)
    console.log(`[Video Generation] Step 2: Submitting room videos to fal.ai...`);
    await processRoomVideosSubmission(
      projectId,
      userId,
      rooms,
      videoSettings
    );
    console.log(`[Video Generation] ✓ Submitted all room videos to fal.ai`);

    // Note: Background processing now happens in the /api/generation/progress endpoint
    // which gets called by frontend polling. This ensures processing continues even
    // after this function returns (Vercel serverless limitation workaround).

    console.log(
      `[Video Generation] ✓ Video generation initiated successfully`
    );

    return {
      success: true,
      failedRooms: []
    };
  } catch (error) {
    console.error(`[Video Generation] Error during generation:`, error);

    // Update project status to failed
    await updateProjectStatus(projectId, "failed");

    return {
      success: false,
      failedRooms: [],
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// ============================================================================
// Room Video Processing - Two Phase Approach
// ============================================================================

/**
 * PHASE 1: Submit all room videos to fal.ai (Blocks until fal.subscribe() returns)
 * Creates DB records AND calls fal.subscribe() - returns when videos are queued
 */
async function processRoomVideosSubmission(
  projectId: string,
  userId: string,
  rooms: RoomData[],
  videoSettings: VideoSettings
): Promise<void> {
  console.log(`[Video Generation] Submitting ${rooms.length} rooms to fal.ai`);

  for (const room of rooms) {
    try {
      console.log(`[Video Generation]   - Submitting room: ${room.name}`);

      // Create video record in database (pending)
      const videoRecord = await createVideoRecord({
        projectId,
        roomId: room.id,
        roomName: room.name,
        videoUrl: "",
        duration: parseInt(videoSettings.duration),
        status: "pending"
      });

      // Update to processing
      await updateVideoStatus(videoRecord.id, "processing");

      console.log(`[Video Generation]   - ✓ Created DB record: ${videoRecord.id}`);

      // Build video generation request
      const roomRequest: RoomVideoRequest = {
        roomId: room.id,
        roomName: room.name,
        roomType: room.type,
        images: room.imageUrls,
        sceneDescriptions: room.sceneDescriptions,
        settings: {
          duration: videoSettings.duration,
          aspectRatio: videoSettings.orientation === "landscape" ? "16:9" : "9:16",
          aiDirections: videoSettings.aiDirections
        }
      };

      // CRITICAL: Submit to fal.ai queue (FAST - just submits, doesn't wait for completion)
      console.log(`[Video Generation]   - 🚀 Submitting to fal.ai queue for ${room.name}...`);
      const requestId = await submitRoomVideoRequest(roomRequest);
      console.log(`[Video Generation]   - ✓ Submitted! Request ID: ${requestId}`);

      // Store the request ID so we can poll for it later
      await updateVideoFalRequestId(videoRecord.id, requestId);
      console.log(`[Video Generation]   - ✓ Stored request ID in database`);

    } catch (error) {
      console.error(`[Video Generation] ❌ Error submitting room ${room.name}:`, error);
      throw error; // Fail fast on submission errors
    }
  }

  console.log(`[Video Generation] ✓ All ${rooms.length} rooms submitted to fal.ai`);
}

// ============================================================================
// Final Video Composition
// ============================================================================

/**
 * Compose final video from successful room videos
 */
async function composeFinalVideo(
  projectId: string,
  userId: string,
  roomResults: RoomVideoResult[],
  videoSettings: VideoSettings
): Promise<{ videoUrl: string; thumbnailUrl: string; duration: number }> {
  console.log(
    `[Video Generation] Composing final video from ${roomResults.length} rooms`
  );

  // Build composition settings
  const compositionSettings: VideoCompositionSettings = {
    roomVideos: roomResults.map((result, index) => ({
      url: result.videoUrl,
      roomName: result.roomName,
      order: index
    })),
    logo: videoSettings.logoFile
      ? {
          file: videoSettings.logoFile,
          position: videoSettings.logoPosition
        }
      : undefined,
    subtitles: videoSettings.enableSubtitles
      ? {
          enabled: true,
          text: videoSettings.scriptText,
          font: videoSettings.subtitleFont
        }
      : undefined,
    transitions: true,
    outputFormat: {
      aspectRatio: videoSettings.orientation === "landscape" ? "16:9" : "9:16"
    }
  };

  // Get project name for filename
  const project = await db
    .select({ title: projects.title })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  const projectName = project[0]?.title || undefined;

  // Create final video record in database (before composition to get videoId for storage)
  const finalVideoRecord = await createVideoRecord({
    projectId,
    roomId: null, // null indicates final video
    roomName: null,
    videoUrl: "", // Will be updated after composition
    duration: 0, // Will be updated after composition
    status: "processing"
  });

  // Compose video
  const result = await combineRoomVideos(
    roomResults.map((r) => r.videoUrl),
    compositionSettings,
    userId,
    projectId,
    finalVideoRecord.id, // Use video record ID for storage folder
    projectName
  );

  // Update final video record with URL, thumbnail, and duration
  await markVideoCompleted(
    finalVideoRecord.id,
    result.videoUrl,
    result.thumbnailUrl,
    result.duration
  );

  return result;
}

// ============================================================================
// Data Fetching
// ============================================================================

/**
 * Fetch room data from project images
 */
async function fetchProjectRooms(
  projectId: string,
  roomOrder: Array<{ id: string; name: string; imageCount: number }>
): Promise<RoomData[]> {
  // Get all images for the project grouped by category (room)
  const projectImages = await db
    .select()
    .from(images)
    .where(eq(images.projectId, projectId))
    .orderBy(images.order);

  // Group images by category (room type) with URLs and scene descriptions
  const imagesByRoom = projectImages.reduce((acc, image) => {
    const category = image.category || "Other";
    if (!acc[category]) {
      acc[category] = {
        urls: [],
        descriptions: []
      };
    }
    acc[category].urls.push(image.url);
    // Add scene description if available
    if (image.sceneDescription) {
      acc[category].descriptions.push(image.sceneDescription);
    }
    return acc;
  }, {} as Record<string, { urls: string[]; descriptions: string[] }>);

  // Build room data based on roomOrder
  const rooms: RoomData[] = roomOrder
    .map((room) => {
      const roomImages = imagesByRoom[room.name];
      if (!roomImages || roomImages.urls.length === 0) {
        return null;
      }
      return {
        id: room.id,
        name: room.name,
        type: room.name, // Room name is the type
        imageUrls: roomImages.urls,
        sceneDescriptions:
          roomImages.descriptions.length > 0
            ? roomImages.descriptions
            : undefined
      } as RoomData;
    })
    .filter((room) => room !== null) as RoomData[];

  return rooms;
}

// ============================================================================
// Progress Tracking
// ============================================================================

/**
 * Build progress update for UI
 */
function buildProgressUpdate(
  status: VideoGenerationStatus,
  completedCount: number,
  roomResults: RoomVideoResult[],
  currentRoomName?: string
): VideoGenerationProgress {
  const steps: VideoProgressStep[] = roomResults.map((result) => ({
    id: result.roomId,
    type: "room_video",
    label: result.roomName,
    status:
      result.status === "completed"
        ? "completed"
        : result.status === "failed"
        ? "failed"
        : result.status === "processing"
        ? "in-progress"
        : "waiting",
    error: result.error
  }));

  // Add current room if processing
  if (currentRoomName && status === "processing_rooms") {
    steps.push({
      id: `current-${Date.now()}`,
      type: "room_video",
      label: currentRoomName,
      status: "in-progress"
    });
  }

  // Add composition step
  if (status === "composing_video") {
    steps.push({
      id: "composition",
      type: "composition",
      label: "Combining videos",
      status: "in-progress"
    });
  } else if (status !== "completed") {
    // Show composition as waiting if not yet started
    steps.push({
      id: "composition",
      type: "composition",
      label: "Combining videos",
      status: "waiting"
    });
  } else {
    // Show composition as completed
    steps.push({
      id: "composition",
      type: "composition",
      label: "Combining videos",
      status: "completed"
    });
  }

  const totalSteps = steps.length;
  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const overallProgress =
    totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  // Calculate estimated time remaining
  // Total time should be around 120 seconds (2 minutes) for the entire process
  // Break down: ~90 seconds for video generation + ~30 seconds for composition
  const totalRooms = steps.filter((s) => s.type === "room_video").length;
  const completedRooms = steps.filter(
    (s) => s.type === "room_video" && s.status === "completed"
  ).length;
  const remainingRooms = totalRooms - completedRooms;

  const timePerRoom = 90 / Math.max(totalRooms, 1); // Distribute 90 seconds across all rooms
  const compositionTime = 30;

  const needsComposition =
    status !== "completed" &&
    !steps.some((s) => s.type === "composition" && s.status === "completed");
  const estimatedTimeRemaining = Math.round(
    remainingRooms * timePerRoom + (needsComposition ? compositionTime : 0)
  );

  const currentStep = steps.find((s) => s.status === "in-progress");

  return {
    status,
    currentStep: currentStep?.label || "Processing",
    totalSteps,
    completedSteps,
    overallProgress,
    steps,
    estimatedTimeRemaining
  };
}

// ============================================================================
// Database Updates
// ============================================================================

/**
 * Update project with final video URL
 */
async function updateProjectWithFinalVideo(
  projectId: string,
  videoUrl: string,
  duration: number
): Promise<void> {
  await db
    .update(projects)
    .set({
      videoGenerationStatus: "completed",
      finalVideoUrl: videoUrl,
      finalVideoDuration: Math.round(duration), // Round to nearest integer
      status: "published",
      updatedAt: new Date()
    })
    .where(eq(projects.id, projectId));
}

/**
 * Update project status
 */
async function updateProjectStatus(
  projectId: string,
  status: "processing" | "completed" | "failed" | "composing"
): Promise<void> {
  await db
    .update(projects)
    .set({
      videoGenerationStatus: status,
      updatedAt: new Date()
    })
    .where(eq(projects.id, projectId));
}

// ============================================================================
// Retry Functionality
// ============================================================================

/**
 * Retry failed room videos
 */
export async function retryFailedRoomVideos(
  projectId: string,
  userId: string,
  roomIds: string[],
  videoSettings: VideoSettings
): Promise<{ success: boolean }> {
  console.log(`[Video Generation] Retrying ${roomIds.length} failed rooms`);

  // Fetch room data for failed rooms
  const allRooms = await fetchProjectRooms(projectId, videoSettings.roomOrder);
  const roomsToRetry = allRooms.filter((room) => roomIds.includes(room.id));

  // Submit retries (webhooks will handle completion automatically)
  await processRoomVideosSubmission(
    projectId,
    userId,
    roomsToRetry,
    videoSettings
  );

  console.log(`[Video Generation] ✓ Retry requests submitted, webhooks will process completion`);

  return { success: true };
}

// ============================================================================
// Video Composition Trigger
// ============================================================================

/**
 * Trigger video composition when all room videos are complete
 * This runs asynchronously and creates the final combined video
 */
async function triggerVideoComposition(
  projectId: string,
  roomResults: RoomVideoResult[]
): Promise<void> {
  try {
    console.log(`[Composition] Starting composition for ${roomResults.length} room videos`);

    // Get project details to find userId
    const projectResult = await db
      .select({ userId: projects.userId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (projectResult.length === 0) {
      throw new Error("Project not found");
    }

    const userId = projectResult[0].userId;

    // Get video settings from the first video record (they all share same project settings)
    // For now, use default settings - in the future, we could store these in the project
    const videoSettings: VideoSettings = {
      orientation: "landscape",
      roomOrder: roomResults.map((r, idx) => ({
        id: r.roomId,
        name: r.roomName,
        imageCount: 0
      })),
      logoPosition: "bottom-right",
      scriptText: "",
      enableSubtitles: false,
      subtitleFont: "Arial",
      aiDirections: "",
      duration: "5"
    };

    // Compose final video
    const compositionResult = await composeFinalVideo(
      projectId,
      userId,
      roomResults,
      videoSettings
    );

    // Update project with final video
    await updateProjectWithFinalVideo(
      projectId,
      compositionResult.videoUrl,
      compositionResult.duration
    );

    console.log(`[Composition] ✅ Final video composition complete`);
  } catch (error) {
    console.error(`[Composition] ❌ Composition failed:`, error);
    await updateProjectStatus(projectId, "failed");
  }
}

// ============================================================================
// Get Generation Progress
// ============================================================================

/**
 * Get current generation progress for a project
 * Reads database status (webhooks update the database automatically)
 */
export async function getGenerationProgress(
  projectId: string
): Promise<VideoGenerationProgress> {
  console.log(`[Progress] Getting progress for project: ${projectId}`);

  const videoRecords = await getVideosByProject(projectId);
  const finalVideo = await getFinalVideo(projectId);

  console.log(`[Progress] Found ${videoRecords.length} video records`);

  const roomVideos = videoRecords.filter((v) => v.roomId !== null);

  // Log each video's status for debugging
  roomVideos.forEach((video) => {
    console.log(`[Progress]   - ${video.roomName}: status=${video.status}, videoUrl=${video.videoUrl ? 'present' : 'empty'}, falRequestId=${video.falRequestId}`);
  });

  const roomResults: RoomVideoResult[] = roomVideos.map((video) => ({
    roomId: video.id, // Use unique video record ID instead of room category
    roomName: video.roomName!,
    videoUrl: video.videoUrl,
    duration: video.duration,
    status:
      video.status === "completed"
        ? "completed"
        : video.status === "failed"
        ? "failed"
        : "processing",
    error: video.errorMessage || undefined
  }));

  const completedCount = roomResults.filter(
    (r) => r.status === "completed"
  ).length;

  console.log(`[Progress] Completed: ${completedCount}/${roomResults.length}`);

  // Check if all videos are completed and we need to compose
  const allCompleted = completedCount === roomResults.length && roomResults.length > 0;
  const needsComposition = allCompleted && !finalVideo;

  if (needsComposition) {
    console.log(`[Progress] All videos completed, checking if composition needed...`);

    // Check if composition is already in progress (to avoid duplicate triggers)
    const project = await db
      .select({ videoGenerationStatus: projects.videoGenerationStatus })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    const currentStatus = project[0]?.videoGenerationStatus;

    if (currentStatus !== "composing") {
      console.log(`[Progress] Triggering composition (current status: ${currentStatus})...`);

      // Mark as composing to prevent duplicate triggers
      await updateProjectStatus(projectId, "composing");

      // Trigger composition asynchronously (don't await to avoid blocking progress response)
      triggerVideoComposition(projectId, roomResults).catch((error) => {
        console.error(`[Progress] Composition trigger failed:`, error);
      });
    } else {
      console.log(`[Progress] Composition already in progress, skipping trigger`);
    }
  }

  const status: VideoGenerationStatus = finalVideo
    ? "completed"
    : allCompleted
    ? "composing_video"
    : "processing_rooms";

  console.log(`[Progress] Overall status: ${status}`);

  return buildProgressUpdate(status, completedCount, roomResults);
}
