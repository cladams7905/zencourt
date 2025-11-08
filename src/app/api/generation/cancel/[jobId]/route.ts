/**
 * API Route: Cancel Generation
 *
 * POST /api/generation/cancel/[jobId]
 * Cancels a running generation job
 */

import { NextRequest, NextResponse } from "next/server";
import { updateGenerationJobProgress } from "@/db/actions/generation";
import {
  ApiError,
  requireAuthenticatedUser,
  requireJobAccess
} from "../../_utils";

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(
  _request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const user = await requireAuthenticatedUser();
    const { job } = await requireJobAccess(jobId, user.id);

    // Check if job can be cancelled
    if (job.status === "completed" || job.status === "failed") {
      return NextResponse.json(
        {
          error: "Invalid operation",
          message: `Cannot cancel a ${job.status} job`
        },
        { status: 400 }
      );
    }

    // Update job status to failed (cancelled)
    await updateGenerationJobProgress(jobId, {
      status: "failed",
      error: "Cancelled by user"
    });

    // TODO: In production, signal the background worker to stop processing

    return NextResponse.json({
      success: true,
      message: "Job cancelled successfully"
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    console.error("Error cancelling job:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to cancel job. Please try again."
      },
      { status: 500 }
    );
  }
}
