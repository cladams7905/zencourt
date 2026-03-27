import { NextResponse } from "next/server";
import { ApiError } from "@web/src/app/api/v1/_utils";
import {
  apiErrorCodeFromStatus,
  apiErrorResponse,
  StatusCode
} from "@web/src/app/api/v1/_responses";
import { parseRequiredRouteParam } from "@shared/utils/api/parsers";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getListingClipDownloadForCurrentUser } from "@web/src/server/actions/listings/clips";

const ROUTE_CALLER =
  "api/v1/listings/[listingId]/clips/[clipVersionId]/download";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ listingId: string; clipVersionId: string }> }
) {
  return runWithCaller(ROUTE_CALLER, async () => {
    try {
      const resolvedParams = await params;
      const listingId = parseRequiredRouteParam(
        resolvedParams.listingId,
        "listingId"
      );
      const clipVersionId = parseRequiredRouteParam(
        resolvedParams.clipVersionId,
        "clipVersionId"
      );

      const { videoUrl, filename } = await getListingClipDownloadForCurrentUser(
        listingId,
        clipVersionId
      );

      const upstream = await fetch(videoUrl);
      if (!upstream.ok || !upstream.body) {
        return apiErrorResponse(
          StatusCode.BAD_GATEWAY,
          "VIDEO_SERVER_ERROR",
          "Failed to download clip"
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
        "Failed to download clip"
      );
    }
  });
}
