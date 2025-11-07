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

import { generateRoomVideo } from "./klingService";
import { combineRoomVideos } from "./videoCompositionService";
import {
  downloadVideoFromUrl,
  uploadRoomVideo,
  executeStorageWithRetry
} from "./storage";
import {
  createVideoRecord,
  updateVideoStatus,
  markVideoCompleted,
  markVideoFailed,
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
 * Start complete video generation workflow
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

    // Step 2: Process room videos
    console.log(`[Video Generation] Step 2: Processing room videos...`);
    const roomResults = await processRoomVideos(
      projectId,
      userId,
      rooms,
      videoSettings,
      onProgress
    );
    console.log(`[Video Generation] ✓ Completed room video processing`);

    const failedRooms = roomResults
      .filter((r) => r.status === "failed")
      .map((r) => r.roomId);

    // If all rooms failed, return error
    if (failedRooms.length === rooms.length) {
      throw new Error("All room videos failed to generate");
    }

    // Step 3: Compose final video (only with successful room videos)
    const successfulRooms = roomResults.filter((r) => r.status === "completed");

    if (onProgress) {
      onProgress(
        buildProgressUpdate("composing_video", rooms.length, roomResults)
      );
    }

    const compositionResult = await composeFinalVideo(
      projectId,
      userId,
      successfulRooms,
      videoSettings
    );

    // Step 4: Update project record
    await updateProjectWithFinalVideo(
      projectId,
      compositionResult.videoUrl,
      compositionResult.duration
    );

    console.log(
      `[Video Generation] Generation complete for project: ${projectId}`
    );

    return {
      success: true,
      finalVideoUrl: compositionResult.videoUrl,
      thumbnailUrl: compositionResult.thumbnailUrl,
      duration: compositionResult.duration,
      failedRooms
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
// Room Video Processing
// ============================================================================

/**
 * Process videos for all rooms sequentially (fal.subscribe blocks until complete)
 */
async function processRoomVideos(
  projectId: string,
  userId: string,
  rooms: RoomData[],
  videoSettings: VideoSettings,
  onProgress?: (progress: VideoGenerationProgress) => void
): Promise<RoomVideoResult[]> {
  console.log(
    `[Video Generation] Processing ${rooms.length} rooms`
  );

  const results: RoomVideoResult[] = [];

  // Process each room sequentially
  for (const room of rooms) {
    let videoRecordId: string | null = null;
    try {
      console.log(`[Video Generation] Processing room: ${room.name}`);
      console.log(`[Video Generation]   - Images: ${room.imageUrls.length}`);
      console.log(`[Video Generation]   - Scene descriptions: ${room.sceneDescriptions?.length || 0}`);

      // Create video record in database (pending)
      console.log(`[Video Generation]   - Creating video record in database...`);
      const videoRecord = await createVideoRecord({
        projectId,
        roomId: room.id,
        roomName: room.name,
        videoUrl: "",
        duration: parseInt(videoSettings.duration),
        status: "pending"
      });
      videoRecordId = videoRecord.id;
      console.log(`[Video Generation]   - ✓ Video record created: ${videoRecord.id}`);

      // Update to processing
      console.log(`[Video Generation]   - Updating status to processing...`);
      await updateVideoStatus(videoRecord.id, "processing");
      console.log(`[Video Generation]   - ✓ Status updated`);

      // Build video generation request
      const roomRequest: RoomVideoRequest = {
        roomId: room.id,
        roomName: room.name,
        roomType: room.type,
        images: room.imageUrls,
        sceneDescriptions: room.sceneDescriptions,
        settings: {
          duration: videoSettings.duration,
          aspectRatio:
            videoSettings.orientation === "landscape" ? "16:9" : "9:16",
          aiDirections: videoSettings.aiDirections
        }
      };

      console.log(`[Video Generation]   - 🚀 Calling generateRoomVideo for ${room.name}...`);
      // This will block until the video is complete (handles queue submission and polling internally)
      const klingResponse = await generateRoomVideo(roomRequest);
      console.log(`[Video Generation]   - ✓ Video generation completed`);

      // Download video from Kling API
      const videoBlob = await downloadVideoFromUrl(klingResponse.video.url);

      // Upload to our storage
      const videoUrl = await executeStorageWithRetry(() =>
        uploadRoomVideo(
          videoBlob,
          {
            userId,
            projectId,
            videoId: videoRecord.id,
            roomId: room.id
          },
          room.name
        )
      );

      // Mark video as completed
      await markVideoCompleted(videoRecord.id, videoUrl);

      // Add to results
      results.push({
        roomId: videoRecord.id,
        roomName: room.name,
        videoUrl,
        duration: parseInt(videoSettings.duration),
        status: "completed"
      });

      console.log(
        `[Video Generation] ✅ Successfully completed room: ${room.name}`
      );

      // Update progress
      if (onProgress) {
        onProgress(
          buildProgressUpdate("processing_rooms", results.length, results)
        );
      }
    } catch (error) {
      console.error(
        `[Video Generation] ❌ Error processing room ${room.name}:`,
        error
      );
      console.error(`[Video Generation] Error type:`, error instanceof Error ? error.constructor.name : typeof error);
      console.error(`[Video Generation] Error message:`, error instanceof Error ? error.message : String(error));
      console.error(`[Video Generation] Error stack:`, error instanceof Error ? error.stack : 'No stack');

      // Use videoRecordId if available, otherwise generate a unique ID
      const uniqueId = videoRecordId || `failed-${room.id}-${Date.now()}`;

      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      if (videoRecordId) {
        await markVideoFailed(videoRecordId, errorMessage);
      }

      results.push({
        roomId: uniqueId,
        roomName: room.name,
        videoUrl: "",
        duration: 0,
        status: "failed",
        error: errorMessage
      });
    }
  }

  return results;
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
  status: "processing" | "completed" | "failed"
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
): Promise<RoomVideoResult[]> {
  console.log(`[Video Generation] Retrying ${roomIds.length} failed rooms`);

  // Fetch room data for failed rooms
  const allRooms = await fetchProjectRooms(projectId, videoSettings.roomOrder);
  const roomsToRetry = allRooms.filter((room) => roomIds.includes(room.id));

  // Process only the failed rooms
  return await processRoomVideos(
    projectId,
    userId,
    roomsToRetry,
    videoSettings
  );
}

// ============================================================================
// Get Generation Progress
// ============================================================================

/**
 * Get current generation progress for a project
 */
export async function getGenerationProgress(
  projectId: string
): Promise<VideoGenerationProgress> {
  const videoRecords = await getVideosByProject(projectId);
  const finalVideo = await getFinalVideo(projectId);

  const roomVideos = videoRecords.filter((v) => v.roomId !== null);

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
  const status: VideoGenerationStatus = finalVideo
    ? "completed"
    : completedCount === roomResults.length && roomResults.length > 0
    ? "composing_video"
    : "processing_rooms";

  return buildProgressUpdate(status, completedCount, roomResults);
}
