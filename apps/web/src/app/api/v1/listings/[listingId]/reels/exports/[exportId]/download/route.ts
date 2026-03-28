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
  assertListingReelExportAccessForCurrentUser,
  buildListingReelExportFilename
} from "@web/src/server/actions/listings/content/reels/export";

const ROUTE_CALLER =
  "api/v1/listings/[listingId]/reels/exports/[exportId]/download";

export const runtime = "nodejs";

function readFilenameBaseFromRequestUrl(requestUrl: string): string | undefined {
  const query = requestUrl.split("?")[1];
  if (!query) {
    return undefined;
  }

  const params = new URLSearchParams(query);
  const value = params.get("filenameBase")?.trim();
  return value ? value : undefined;
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

export async function GET(
  request: Request,
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
      const requestUrl =
        typeof request.url === "string" && request.url.length > 0
          ? request.url
          : "http://localhost";
      const filename = buildListingReelExportFilename(
        readFilenameBaseFromRequestUrl(requestUrl)
      );
      const config = getVideoServerConfig();
      const upstream = await fetch(
        `${config.baseUrl}/renders/${exportId}/artifact`,
        {
          headers: {
            "X-API-Key": config.apiKey
          }
        }
      );

      if (!upstream.ok) {
        const message =
          (await readUpstreamErrorMessage(upstream)) ??
          "Failed to download reel export";
        return apiErrorResponse(
          upstream.status === 404 ? StatusCode.NOT_FOUND : StatusCode.BAD_GATEWAY,
          upstream.status === 404 ? "NOT_FOUND" : "VIDEO_SERVER_ERROR",
          message,
          { message }
        );
      }

      return new NextResponse(upstream.body, {
        status: 200,
        headers: {
          "Content-Type":
            upstream.headers.get("content-type") ?? "application/octet-stream",
          ...(upstream.headers.has("content-length")
            ? {
                "Content-Length":
                  upstream.headers.get("content-length") ?? ""
              }
            : {}),
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

      const message =
        error instanceof Error
          ? error.message
          : "Failed to download reel export";

      return apiErrorResponse(
        StatusCode.INTERNAL_SERVER_ERROR,
        "INTERNAL_ERROR",
        message,
        { message }
      );
    }
  });
}
