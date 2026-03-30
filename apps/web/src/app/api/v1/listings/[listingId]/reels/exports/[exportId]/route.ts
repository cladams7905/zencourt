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
import { assertListingReelExportAccessForCurrentUser } from "@web/src/server/actions/listings/content/reels/export";

const ROUTE_CALLER = "api/v1/listings/[listingId]/reels/exports/[exportId]";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isListingReelExportStatus(
  value: unknown
): value is ListingReelExportJob["status"] {
  return (
    value === "queued" ||
    value === "upscaling" ||
    value === "rendering" ||
    value === "completed" ||
    value === "failed" ||
    value === "canceled"
  );
}

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
      code?: unknown;
    };
    if (typeof body.message === "string" && body.message.trim().length > 0) {
      return body.message;
    }
    if (typeof body.error === "string" && body.error.trim().length > 0) {
      return body.error;
    }
    if (typeof body.code === "string" && body.code.trim().length > 0) {
      return body.code;
    }
  } catch {
    return null;
  }

  return null;
}

export async function GET(
  _request: Request,
  {
    params
  }: { params: Promise<{ listingId: string; exportId: string }> }
) {
  return runWithCaller(ROUTE_CALLER, async () => {
    try {
      const resolvedParams = await params;
      const listingId = parseRequiredRouteParam(
        resolvedParams.listingId,
        "listingId"
      );
      const exportId = parseRequiredRouteParam(
        resolvedParams.exportId,
        "exportId"
      );
      await assertListingReelExportAccessForCurrentUser(listingId);
      const config = getVideoServerConfig();
      const upstream = await fetch(`${config.baseUrl}/renders/${exportId}`, {
        cache: "no-store",
        headers: {
          "X-API-Key": config.apiKey
        }
      });

      if (!upstream.ok) {
        const message =
          (await readUpstreamErrorMessage(upstream)) ??
          "Failed to load reel export status";
        return apiErrorResponse(
          upstream.status === 404 ? StatusCode.NOT_FOUND : StatusCode.BAD_GATEWAY,
          upstream.status === 404 ? "NOT_FOUND" : "VIDEO_SERVER_ERROR",
          message,
          { message }
        );
      }

      const rawBody = (await upstream.json()) as unknown;
      if (!isRecord(rawBody)) {
        return apiErrorResponse(
          StatusCode.BAD_GATEWAY,
          "VIDEO_SERVER_ERROR",
          "Invalid reel export status response from video server",
          { message: "Invalid reel export status response from video server" }
        );
      }

      const rawJob = isRecord(rawBody.job) ? rawBody.job : null;
      const status = isListingReelExportStatus(rawJob?.status)
        ? rawJob.status
        : "queued";
      const progress =
        typeof rawJob?.progress === "number" && Number.isFinite(rawJob.progress)
          ? rawJob.progress
          : 0;
      const errorMessage =
        typeof rawJob?.error === "string" && rawJob.error.trim().length > 0
          ? rawJob.error
          : undefined;

      const payload: ListingReelExportJob = {
        exportId,
        status,
        progress,
        downloadReady: Boolean(rawJob?.artifactReady),
        ...(errorMessage ? { errorMessage } : {})
      };

      return NextResponse.json(
        {
          success: true,
          data: payload
        },
        {
          headers: {
            "Cache-Control": "private, no-store"
          }
        }
      );
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
        error instanceof Error
          ? error.message
          : "Failed to load reel export status",
        {
          message:
            error instanceof Error
              ? error.message
              : "Failed to load reel export status"
        }
      );
    }
  });
}
