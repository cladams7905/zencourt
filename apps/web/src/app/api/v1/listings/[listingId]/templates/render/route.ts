import { NextRequest, NextResponse } from "next/server";
import {
  ApiError,
  requireAuthenticatedUser,
  requireListingAccess
} from "../../../../_utils";
import {
  apiErrorCodeFromStatus,
  apiErrorResponse,
  StatusCode
} from "@web/src/app/api/v1/_responses";
import { parseRequiredRouteParam } from "@shared/utils/api/parsers";
import type { ListingTemplateRenderResult } from "@web/src/lib/domain/media/templateRender/types";
import { getListingImages } from "@web/src/server/actions/db/listingImages";
import { getOrCreateUserAdditional } from "@web/src/server/actions/db/userAdditional";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { renderListingTemplateBatch } from "@web/src/server/services/templateRender";
import { readJsonBodySafe } from "@shared/utils/api/validation";
import { parseListingSubcategory, sanitizeCaptionItems } from "./validation";

const logger = createChildLogger(baseLogger, {
  module: "listing-template-render-route"
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    let listingId: string;
    try {
      listingId = parseRequiredRouteParam(
        (await params).listingId,
        "listingId"
      );
    } catch {
      throw new ApiError(StatusCode.BAD_REQUEST, {
        error: "Invalid request",
        message: "Listing ID is required"
      });
    }
    const user = await requireAuthenticatedUser();
    const listing = await requireListingAccess(listingId, user.id);

    const body = (await readJsonBodySafe(request)) as {
      subcategory?: string;
      captionItems?: unknown;
      templateCount?: number;
    } | null;

    let subcategory: ReturnType<typeof parseListingSubcategory>;
    try {
      subcategory = parseListingSubcategory(body?.subcategory);
    } catch {
      throw new ApiError(StatusCode.BAD_REQUEST, {
        error: "Invalid request",
        message: "A valid listing subcategory is required"
      });
    }

    const captionItems = sanitizeCaptionItems(body?.captionItems);
    if (captionItems.length === 0) {
      return NextResponse.json<ListingTemplateRenderResult>(
        { items: [], failedTemplateIds: [] },
        { status: StatusCode.OK }
      );
    }

    const [listingImages, userAdditional] = await Promise.all([
      getListingImages(user.id, listing.id),
      getOrCreateUserAdditional(user.id)
    ]);

    const result = await renderListingTemplateBatch({
      subcategory,
      listing,
      listingImages,
      userAdditional,
      captionItems,
      templateCount:
        typeof body?.templateCount === "number" && body.templateCount > 0
          ? body.templateCount
          : undefined,
      siteOrigin: request.nextUrl.origin
    });

    return NextResponse.json<ListingTemplateRenderResult>(result, {
      status: StatusCode.OK,
      headers: { "Cache-Control": "no-store" }
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

    logger.error(
      {
        error:
          error instanceof Error
            ? { name: error.name, message: error.message }
            : error
      },
      "Failed rendering templates"
    );
    return apiErrorResponse(
      StatusCode.INTERNAL_SERVER_ERROR,
      "INTERNAL_ERROR",
      "Failed to render templates",
      { message: "Failed to render templates" }
    );
  }
}
