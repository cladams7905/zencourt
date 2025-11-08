/**
 * API Route: Get Generation Progress
 *
 * GET /api/generation/progress?projectId=xxx
 * Retrieves the current progress of video generation for a project
 */

import { NextRequest, NextResponse } from "next/server";
import { getGenerationProgress } from "@/services/videoGenerationOrchestrator";
import {
  ApiError,
  requireAuthenticatedUser,
  requireProjectAccess
} from "../_utils";

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Get projectId from query params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const user = await requireAuthenticatedUser();
    await requireProjectAccess(projectId, user.id);

    // Get generation progress (webhooks update database automatically)
    const progress = await getGenerationProgress(projectId);

    // Check if complete or failed
    const isComplete = progress.status === "completed";
    const hasFailed = progress.steps.some((s) => s.status === "failed");

    return NextResponse.json({
      success: true,
      progress,
      isComplete,
      hasFailed
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    console.error("[API] Error getting generation progress:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to get generation progress"
      },
      { status: 500 }
    );
  }
}
