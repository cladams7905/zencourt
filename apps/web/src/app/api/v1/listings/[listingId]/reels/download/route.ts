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
import {
  buildListingReelExportRequestForCurrentUser,
  type PlayablePreviewExportRequest
} from "@web/src/server/actions/listings/content/reels/export";

const ROUTE_CALLER = "api/v1/listings/[listingId]/reels/download";

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
      const { filename, request: exportRequest } =
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

      if (!upstream.ok || !upstream.body) {
        const message =
          (await readUpstreamErrorMessage(upstream)) ??
          "Failed to download reel preview";
        return apiErrorResponse(
          StatusCode.BAD_GATEWAY,
          "VIDEO_SERVER_ERROR",
          message,
          { message }
        );
      }

      return new NextResponse(upstream.body, {
        status: 200,
        headers: {
          "Content-Type":
            upstream.headers.get("content-type") ?? "application/octet-stream",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "private, no-store"
        }
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
        "Failed to download reel preview"
      );
    }
  });
}
