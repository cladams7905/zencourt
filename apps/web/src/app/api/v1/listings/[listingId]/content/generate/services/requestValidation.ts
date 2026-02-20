import { ApiError } from "@web/src/app/api/v1/_utils";
import { StatusCode } from "@web/src/app/api/v1/_responses";
import { requireNonEmptyParam } from "@web/src/app/api/v1/_validation";
import {
  isListingMediaType,
  isListingSubcategory
} from "@web/src/lib/domain/listing";
import type {
  GenerateListingContentBody,
  ValidatedGenerateParams
} from "./types";

/**
 * Validates listingId (must be non-empty) and request body (subcategory, media_type, etc.).
 * @throws ApiError for invalid or missing values
 */
export function parseAndValidateParams(
  body: GenerateListingContentBody | null,
  listingIdRaw: string | undefined
): ValidatedGenerateParams {
  const listingId = requireNonEmptyParam(listingIdRaw) ?? "";
  if (!listingId) {
    throw new ApiError(StatusCode.BAD_REQUEST, {
      error: "Invalid request",
      message: "Listing ID is required"
    });
  }

  const subcategoryCandidate = body?.subcategory?.trim() ?? "";
  if (!subcategoryCandidate || !isListingSubcategory(subcategoryCandidate)) {
    throw new ApiError(StatusCode.BAD_REQUEST, {
      error: "Invalid request",
      message: "A valid listing subcategory is required"
    });
  }

  const mediaTypeCandidate = body?.media_type?.trim().toLowerCase() ?? "video";
  if (!isListingMediaType(mediaTypeCandidate)) {
    throw new ApiError(StatusCode.BAD_REQUEST, {
      error: "Invalid request",
      message: "media_type must be either 'video' or 'image'"
    });
  }

  return {
    listingId,
    subcategory: subcategoryCandidate,
    mediaType: mediaTypeCandidate,
    focus: body?.focus?.trim() ?? "",
    notes: body?.notes?.trim() ?? "",
    generationNonce: body?.generation_nonce?.trim() ?? ""
  };
}
