/**
 * API Route: Get Generation Status
 *
 * GET /api/generation/status/[jobId]
 * Gets the status of a specific generation job
 */

import { NextRequest, NextResponse } from "next/server";
import {
  ApiError,
  requireAuthenticatedUser,
  requireJobAccess
} from "../../_utils";

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const user = await requireAuthenticatedUser();
    const { job } = await requireJobAccess(jobId, user.id);

    return NextResponse.json({
      success: true,
      job
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    console.error("Error fetching job status:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch status. Please try again."
      },
      { status: 500 }
    );
  }
}
