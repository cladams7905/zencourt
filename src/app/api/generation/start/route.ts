/**
 * API Route: Start Generation
 *
 * POST /api/generation/start
 * Starts the video generation process using Kling API
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/stack/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  startVideoGeneration,
  type VideoSettings
} from "@/services/videoGenerationOrchestrator";

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
    // Authenticate user
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to continue" },
        { status: 401 }
      );
    }

    // Parse request body
    const body: StartGenerationRequest = await request.json();
    const { projectId, videoSettings } = body;

    // Validate request
    if (!projectId) {
      return NextResponse.json(
        { error: "Invalid request", message: "Project ID is required" },
        { status: 400 }
      );
    }

    if (!videoSettings) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Video settings are required"
        },
        { status: 400 }
      );
    }

    // Validate video settings
    if (
      !videoSettings.duration ||
      !["5", "10"].includes(videoSettings.duration)
    ) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Duration must be 5 or 10 seconds"
        },
        { status: 400 }
      );
    }

    if (!videoSettings.roomOrder || videoSettings.roomOrder.length === 0) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "At least one room is required"
        },
        { status: 400 }
      );
    }

    // Verify project ownership
    const projectResult = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (projectResult.length === 0) {
      return NextResponse.json(
        { error: "Not found", message: "Project not found" },
        { status: 404 }
      );
    }

    const project = projectResult[0];
    if (project.userId !== user.id) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You don't have access to this project"
        },
        { status: 403 }
      );
    }

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
