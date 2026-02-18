import { NextRequest, NextResponse } from "next/server";
import {
  ApiError,
  requireAuthenticatedUser,
  requireListingAccess
} from "../../../../_utils";
import {
  LISTING_CONTENT_SUBCATEGORIES,
  type ListingContentSubcategory
} from "@shared/types/models";
import type {
  ListingTemplateRenderResult,
  TemplateRenderCaptionItemInput
} from "@web/src/lib/domain/media/templateRender/types";
import { getListingImages } from "@web/src/server/actions/db/listingImages";
import { getOrCreateUserAdditional } from "@web/src/server/actions/db/userAdditional";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { renderListingTemplateBatch } from "@web/src/server/services/templateRender";

const logger = createChildLogger(baseLogger, {
  module: "listing-template-render-route"
});

function isListingSubcategory(
  value: string
): value is ListingContentSubcategory {
  return (LISTING_CONTENT_SUBCATEGORIES as readonly string[]).includes(value);
}

function sanitizeCaptionItems(
  input: unknown
): TemplateRenderCaptionItemInput[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const candidate = item as {
        id?: string;
        hook?: string | null;
        caption?: string | null;
        body?: Array<{ header?: string; content?: string }>;
      };
      const id = candidate.id?.trim();
      if (!id) {
        return null;
      }

      const body = (candidate.body ?? [])
        .map((slide) => ({
          header: slide.header?.trim() ?? "",
          content: slide.content?.trim() ?? ""
        }))
        .filter((slide) => slide.header || slide.content);

      const sanitized = {
        id,
        hook: candidate.hook?.trim() || null,
        caption: candidate.caption?.trim() || null,
        body
      };

      if (
        !sanitized.hook &&
        !sanitized.caption &&
        sanitized.body.length === 0
      ) {
        return null;
      }

      return sanitized;
    })
    .filter((item): item is TemplateRenderCaptionItemInput => Boolean(item));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;
    const user = await requireAuthenticatedUser();
    const listing = await requireListingAccess(listingId, user.id);

    const body = (await request.json()) as {
      subcategory?: string;
      captionItems?: unknown;
      templateCount?: number;
    };

    const subcategoryCandidate = body.subcategory?.trim() ?? "";
    if (!isListingSubcategory(subcategoryCandidate)) {
      throw new ApiError(400, {
        error: "Invalid request",
        message: "A valid listing subcategory is required"
      });
    }

    const captionItems = sanitizeCaptionItems(body.captionItems);
    if (captionItems.length === 0) {
      return NextResponse.json<ListingTemplateRenderResult>(
        { items: [], failedTemplateIds: [] },
        { status: 200 }
      );
    }

    const [listingImages, userAdditional] = await Promise.all([
      getListingImages(user.id, listing.id),
      getOrCreateUserAdditional(user.id)
    ]);

    const result = await renderListingTemplateBatch({
      subcategory: subcategoryCandidate,
      listing,
      listingImages,
      userAdditional,
      captionItems,
      templateCount:
        typeof body.templateCount === "number" && body.templateCount > 0
          ? body.templateCount
          : undefined,
      siteOrigin: request.nextUrl.origin
    });

    return NextResponse.json<ListingTemplateRenderResult>(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.body, { status: error.status });
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
    return NextResponse.json(
      {
        error: "Server error",
        message: "Failed to render templates"
      },
      { status: 500 }
    );
  }
}
