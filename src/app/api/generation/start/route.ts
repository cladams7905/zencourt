/**
 * API Route: Start Generation
 *
 * POST /api/generation/start
 * Starts the video generation process using Kling API
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  startVideoGeneration,
  type VideoSettings
} from "@/services/videoGenerationOrchestrator";
import {
  ApiError,
  requireAuthenticatedUser,
  requireProjectAccess,
  validateVideoSettings
} from "../_utils";

// Force Node.js runtime (not Edge) - required for fal.ai SDK
export const runtime = "nodejs";

// Allow longer execution time for video generation
export const maxDuration = 300; // 5 minutes

// ============================================================================
// Types
// ============================================================================

interface StartGenerationRequest {
  projectId: string;
  videoSettings: VideoSettings;
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: StartGenerationRequest = await request.json();
    const { projectId } = body;
    const user = await requireAuthenticatedUser();
    const videoSettings = validateVideoSettings(body.videoSettings);

    await requireProjectAccess(projectId, user.id);

    // Update project status to processing
    await db
      .update(projects)
      .set({
        videoGenerationStatus: "processing",
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId));

    // Start video generation in background (don't await - let it run async)
    // The client will poll for progress
    await startVideoGeneration(projectId, user.id, videoSettings).catch(
      (error) => {
        console.error(
          `[API] ❌ Video generation failed for project ${projectId}:`,
          error
        );
        console.error(
          `[API] Error stack:`,
          error instanceof Error ? error.stack : "No stack trace"
        );
        console.error(`[API] Error details:`, JSON.stringify(error, null, 2));
      }
    );

    console.log(
      `[API] ✓ Video generation background task initiated for project ${projectId}`
    );

    // Calculate estimated completion time
    // 60 seconds per room + 90 seconds for composition
    const estimatedTime = videoSettings.roomOrder.length * 60 + 90;

    return NextResponse.json({
      success: true,
      projectId,
      estimatedCompletionTime: estimatedTime,
      message: "Video generation started successfully"
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    console.error("[API] Error starting generation:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to start generation. Please try again."
      },
      { status: 500 }
    );
  }
}
