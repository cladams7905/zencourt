import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@web/src/app/api/v1/_utils";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { updateListingForCurrentUser } from "@web/src/server/actions/listings/commands";
import {
  apiErrorCodeFromStatus,
  apiErrorResponse,
  StatusCode
} from "@web/src/app/api/v1/_responses";
import { parseRequiredRouteParam } from "@shared/utils/api/parsers";
import { readJsonBodySafe } from "@shared/utils/api/validation";

const ROUTE_CALLER = "api/v1/listings/.../stage";

const ALLOWED_STAGES = new Set(["categorize", "create", "review", "generate"]);

type StageUpdateBody = {
  listingStage?: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  return runWithCaller(ROUTE_CALLER, async () => {
    try {
      const listingId = parseRequiredRouteParam(
        (await params).listingId,
        "listingId"
      );
      const body = (await readJsonBodySafe(request)) as StageUpdateBody | null;
      const listingStage = body?.listingStage?.trim() ?? "";

      if (!ALLOWED_STAGES.has(listingStage)) {
        return apiErrorResponse(
          StatusCode.BAD_REQUEST,
          "INVALID_REQUEST",
          "listingStage must be one of: categorize, create, review, generate",
          { message: "Invalid listingStage" }
        );
      }

      await updateListingForCurrentUser(listingId, {
        listingStage: listingStage as "categorize" | "create" | "review" | "generate"
      });

      return NextResponse.json({
        success: true,
        data: { listingId, listingStage }
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
        "Failed to update listing stage"
      );
    }
  });
}
