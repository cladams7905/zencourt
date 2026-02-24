"use server";

import { NextResponse } from "next/server";
import { ApiError } from "@web/src/server/utils/apiError";
import { StatusCode } from "@web/src/server/utils/apiResponses";
import { requireAuthenticatedUser } from "@web/src/server/utils/apiAuth";
import { requireListingAccess } from "@web/src/server/utils/listingAccess";
import { getListingImages } from "@web/src/server/actions/db/listingImages";
import { getOrCreateUserAdditional } from "@web/src/server/actions/db/userAdditional";
import {
  renderListingTemplateBatch as renderListingTemplateBatchService,
  renderListingTemplateBatchStream as renderListingTemplateBatchStreamService
} from "@web/src/server/services/templateRender";
import {
  encodeSseEvent,
  makeSseStreamHeaders
} from "@web/src/lib/sse/sseEncoder";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import {
  parseListingSubcategory,
  sanitizeCaptionItems
} from "@web/src/server/services/templateRender/validation";
import type { ListingTemplateRenderResult } from "@web/src/lib/domain/media/templateRender/types";

const logger = createChildLogger(baseLogger, {
  module: "listing-templates-action"
});

export type RenderListingTemplateBatchBody = {
  subcategory?: unknown;
  captionItems?: unknown;
  templateCount?: number;
};

/**
 * Single entry point for "render listing template batch" (non-streaming).
 * Used by POST /api/v1/listings/[listingId]/templates/render.
 */
export async function renderListingTemplateBatch(
  listingId: string,
  body: RenderListingTemplateBatchBody | null,
  siteOrigin: string
): Promise<ListingTemplateRenderResult> {
  const user = await requireAuthenticatedUser();
  const listing = await requireListingAccess(listingId, user.id);

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
    return { items: [], failedTemplateIds: [] };
  }

  const [listingImages, userAdditional] = await Promise.all([
    getListingImages(user.id, listing.id),
    getOrCreateUserAdditional(user.id)
  ]);

  return renderListingTemplateBatchService({
    subcategory,
    listing,
    listingImages,
    userAdditional,
    captionItems,
    templateCount:
      typeof body?.templateCount === "number" && body.templateCount > 0
        ? body.templateCount
        : undefined,
    siteOrigin
  });
}

export type RenderListingTemplateBatchStreamBody = {
  subcategory?: unknown;
  captionItems?: unknown;
  templateCount?: number;
  templateId?: string;
};

/**
 * Single entry point for "render listing template batch stream" (SSE).
 * Used by POST /api/v1/listings/[listingId]/templates/render/stream.
 * Returns a Response with SSE stream.
 */
export async function renderListingTemplateBatchStream(
  listingId: string,
  body: RenderListingTemplateBatchStreamBody | null,
  siteOrigin: string
): Promise<NextResponse | Response> {
  const user = await requireAuthenticatedUser();
  const listing = await requireListingAccess(listingId, user.id);

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
  const templateCount =
    typeof body?.templateCount === "number" && body.templateCount > 0
      ? body.templateCount
      : undefined;
  const templateId =
    typeof body?.templateId === "string" && body.templateId.trim().length > 0
      ? body.templateId.trim()
      : undefined;

  if (captionItems.length === 0) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encodeSseEvent({ type: "done", items: [], failedTemplateIds: [] })
        );
        controller.close();
      }
    });
    return new Response(stream, { headers: makeSseStreamHeaders() });
  }

  const [listingImages, userAdditional] = await Promise.all([
    getListingImages(user.id, listing.id),
    getOrCreateUserAdditional(user.id)
  ]);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { failedTemplateIds } =
          await renderListingTemplateBatchStreamService(
            {
              userId: user.id,
              listingId,
              subcategory,
              mediaType: "image",
              listing,
              listingImages,
              userAdditional,
              captionItems,
              templateCount,
              templateId,
              siteOrigin
            },
            {
              onItem: async (item) => {
                controller.enqueue(encodeSseEvent({ type: "item", item }));
              }
            }
          );

        controller.enqueue(
          encodeSseEvent({
            type: "done",
            failedTemplateIds
          })
        );
      } catch (error) {
        logger.error({ error }, "Template render stream error");
        controller.enqueue(
          encodeSseEvent({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Failed to render templates"
          })
        );
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, { headers: makeSseStreamHeaders() });
}
