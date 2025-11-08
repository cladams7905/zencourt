/**
 * API Route: Retry Failed Rooms
 *
 * POST /api/generation/retry
 * Retries video generation for specific failed rooms
 */

import { NextRequest, NextResponse } from "next/server";
import {
  retryFailedRoomVideos,
  type VideoSettings
} from "@/services/videoGenerationOrchestrator";
import {
  ApiError,
  requireAuthenticatedUser,
  requireProjectAccess,
  validateVideoSettings
} from "../_utils";

// Allow longer execution time for retries
export const maxDuration = 300; // 5 minutes

// ============================================================================
// Types
// ============================================================================

interface RetryRequest {
  projectId: string;
  roomIds: string[];
  videoSettings: VideoSettings;
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: RetryRequest = await request.json();
    const { projectId, roomIds } = body;
    const user = await requireAuthenticatedUser();
    const videoSettings = validateVideoSettings(body.videoSettings);

    // Validate request
    if (!roomIds || roomIds.length === 0) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "At least one room ID is required"
        },
        { status: 400 }
      );
    }

    await requireProjectAccess(projectId, user.id);

    console.log(
      `[API] Retrying ${roomIds.length} failed rooms for project ${projectId}`
    );

    // Retry failed rooms in background
    retryFailedRoomVideos(projectId, user.id, roomIds, videoSettings).catch(
      (error) => {
        console.error(`[API] Retry failed for project ${projectId}:`, error);
      }
    );

    return NextResponse.json({
      success: true,
      message: `Retrying ${roomIds.length} room(s)`
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    console.error("[API] Error retrying generation:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to retry generation"
      },
      { status: 500 }
    );
  }
}
