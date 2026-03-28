import { NextResponse } from "next/server";
import { ApiError } from "@web/src/app/api/v1/_utils";
import {
  apiErrorCodeFromStatus,
  apiErrorResponse,
  StatusCode
} from "@web/src/app/api/v1/_responses";
import { parseRequiredRouteParam } from "@shared/utils/api/parsers";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getVideoServerConfig } from "@web/src/app/api/v1/video/_config";
import type { ListingReelExportJob } from "@web/src/lib/domain/listings/content/reels";
import {
  buildListingReelExportRequestForCurrentUser,
  type PlayablePreviewExportRequest
} from "@web/src/server/actions/listings/content/reels/export";

const ROUTE_CALLER = "api/v1/listings/[listingId]/reels/exports";

export const runtime = "nodejs";

async function readUpstreamErrorMessage(
  upstream: Response
): Promise<string | null> {
  const contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    const body = (await upstream.json()) as {
      message?: unknown;
      error?: unknown;
    };
    if (typeof body.message === "string" && body.message.trim().length > 0) {
      return body.message;
    }
    if (typeof body.error === "string" && body.error.trim().length > 0) {
      return body.error;
    }
  } catch {
    return null;
  }

  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ listingId: string }> }
) {
  return runWithCaller(ROUTE_CALLER, async () => {
    try {
      const resolvedParams = await params;
      const listingId = parseRequiredRouteParam(
        resolvedParams.listingId,
        "listingId"
      );
      const input = (await request.json()) as PlayablePreviewExportRequest;
      const { request: exportRequest } =
        await buildListingReelExportRequestForCurrentUser(listingId, input);
      const config = getVideoServerConfig();

      const upstream = await fetch(`${config.baseUrl}/renders/reel-export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": config.apiKey
        },
        body: JSON.stringify(exportRequest)
      });

      if (!upstream.ok) {
        const message =
          (await readUpstreamErrorMessage(upstream)) ??
          "Failed to start reel export";
        return apiErrorResponse(
          StatusCode.BAD_GATEWAY,
          "VIDEO_SERVER_ERROR",
          message,
          { message }
        );
      }

      const body = (await upstream.json()) as {
        success?: boolean;
        jobId?: string;
      };

      const payload: ListingReelExportJob = {
        exportId: body.jobId ?? exportRequest.exportId,
        status: "queued",
        progress: 0,
        downloadReady: false
      };

      return NextResponse.json({
        success: true,
        data: payload
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return apiErrorResponse(
          error.status,
          apiErrorCodeFromStatus(error.status),
          error.body.message,
          { message: error.body.message }
        );
      }

      return apiErrorResponse(
        StatusCode.INTERNAL_SERVER_ERROR,
        "INTERNAL_ERROR",
        "Failed to start reel export"
      );
    }
  });
}
