"use server";

import { DomainValidationError } from "@web/src/server/errors/domain";
import { requireAuthenticatedUser } from "@web/src/server/utils/apiAuth";
import { requireListingAccess } from "@web/src/server/utils/listingAccess";
import { createListing, updateListing } from "@web/src/server/models/listings";
import type { UpdateListingInput } from "@web/src/server/models/listings/types";
import {
  assignPrimaryListingImageForCategory,
  createListingImageRecords,
  deleteListingImageUploads,
  getListingImageUploadUrls,
  updateListingImageAssignments,
  getListingImages
} from "@web/src/server/models/listingImages";
import type {
  ListingImageRecordInput,
  ListingImageUpdate,
  ListingImageUploadRequest
} from "@web/src/server/models/listingImages/types";
import { LISTING_CONTENT_SUBCATEGORIES } from "@shared/types/models";
import { deleteCachedListingContentItem as deleteCachedListingContentItemService } from "@web/src/server/services/cache/listingContent";
import { getOrCreateUserAdditional } from "@web/src/server/models/userAdditional";
import {
  renderListingTemplateBatch as renderListingTemplateBatchService,
  renderListingTemplateBatchStream as renderListingTemplateBatchStreamService
} from "@web/src/server/services/templateRender";
import { encodeSseEvent } from "@web/src/lib/sse/sseEncoder";
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
  module: "listing-actions-commands"
});

const MEDIA_TYPE_IMAGE = "image" as const;

export type DeleteCachedListingContentItemParams = {
  cacheKeyTimestamp: number;
  cacheKeyId: number;
  subcategory: string;
};

export type RenderListingTemplateBatchBody = {
  subcategory?: unknown;
  captionItems?: unknown;
  templateCount?: number;
};

export type RenderListingTemplateBatchStreamBody = {
  subcategory?: unknown;
  captionItems?: unknown;
  templateCount?: number;
  templateId?: string;
};

export async function createListingForCurrentUser() {
  const user = await requireAuthenticatedUser();
  return createListing(user.id);
}

export async function updateListingForCurrentUser(
  listingId: string,
  updates: UpdateListingInput
) {
  const user = await requireAuthenticatedUser();
  return updateListing(user.id, listingId, updates);
}

export async function deleteCachedListingContentItem(
  listingId: string,
  params: DeleteCachedListingContentItemParams
) {
  const user = await requireAuthenticatedUser();
  await requireListingAccess(listingId, user.id);

  const { cacheKeyTimestamp, cacheKeyId, subcategory: subcategoryRaw } = params;
  const subcategory = subcategoryRaw?.trim();
  if (
    typeof cacheKeyTimestamp !== "number" ||
    !Number.isFinite(cacheKeyTimestamp) ||
    cacheKeyTimestamp <= 0 ||
    typeof cacheKeyId !== "number" ||
    !Number.isFinite(cacheKeyId) ||
    cacheKeyId <= 0 ||
    !subcategory ||
    !(LISTING_CONTENT_SUBCATEGORIES as readonly string[]).includes(subcategory)
  ) {
    throw new DomainValidationError(
      "cacheKeyTimestamp, cacheKeyId, and valid subcategory are required"
    );
  }

  await deleteCachedListingContentItemService({
    userId: user.id,
    listingId,
    subcategory: subcategory as (typeof LISTING_CONTENT_SUBCATEGORIES)[number],
    mediaType: MEDIA_TYPE_IMAGE,
    timestamp: cacheKeyTimestamp,
    id: cacheKeyId
  });
}

export async function getListingImageUploadUrlsForCurrentUser(
  listingId: string,
  files: ListingImageUploadRequest[]
) {
  const user = await requireAuthenticatedUser();
  return getListingImageUploadUrls(user.id, listingId, files);
}

export async function createListingImageRecordsForCurrentUser(
  listingId: string,
  uploads: ListingImageRecordInput[]
) {
  const user = await requireAuthenticatedUser();
  return createListingImageRecords(user.id, listingId, uploads);
}

export async function updateListingImageAssignmentsForCurrentUser(
  listingId: string,
  updates: ListingImageUpdate[],
  deletions: string[]
) {
  const user = await requireAuthenticatedUser();
  return updateListingImageAssignments(user.id, listingId, updates, deletions);
}

export async function assignPrimaryListingImageForCategoryForCurrentUser(
  listingId: string,
  category: string
) {
  const user = await requireAuthenticatedUser();
  return assignPrimaryListingImageForCategory(user.id, listingId, category);
}

export async function deleteListingImageUploadsForCurrentUser(
  listingId: string,
  urls: string[]
) {
  const user = await requireAuthenticatedUser();
  return deleteListingImageUploads(user.id, listingId, urls);
}

export async function getListingImagesForCurrentUser(listingId: string) {
  const user = await requireAuthenticatedUser();
  return getListingImages(user.id, listingId);
}

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
    throw new DomainValidationError("A valid listing subcategory is required");
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

export async function renderListingTemplateBatchStream(
  listingId: string,
  body: RenderListingTemplateBatchStreamBody | null,
  siteOrigin: string
): Promise<{ stream: ReadableStream }> {
  const user = await requireAuthenticatedUser();
  const listing = await requireListingAccess(listingId, user.id);

  let subcategory: ReturnType<typeof parseListingSubcategory>;
  try {
    subcategory = parseListingSubcategory(body?.subcategory);
  } catch {
    throw new DomainValidationError("A valid listing subcategory is required");
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
    return { stream };
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

  return { stream };
}
