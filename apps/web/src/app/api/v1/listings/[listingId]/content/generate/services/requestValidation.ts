import { ApiError } from "@web/src/app/api/v1/_utils";
import { StatusCode } from "@web/src/app/api/v1/_responses";
import { parseRequiredRouteParam } from "@shared/utils/api/parsers";
import { LISTING_CONTENT_SUBCATEGORIES } from "@shared/types/models";
import type {
  GenerateListingContentBody,
  ValidatedGenerateParams
} from "./types";

function parseListingSubcategory(
  value: unknown
): ValidatedGenerateParams["subcategory"] {
  if (typeof value !== "string") {
    throw new Error("A valid listing subcategory is required");
  }
  const normalized = value.trim();
  if (
    !(LISTING_CONTENT_SUBCATEGORIES as readonly string[]).includes(normalized)
  ) {
    throw new Error("A valid listing subcategory is required");
  }
  return normalized as ValidatedGenerateParams["subcategory"];
}

function parseListingMediaType(
  value: unknown
): ValidatedGenerateParams["mediaType"] {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "video";
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "video" || normalized === "image") {
    return normalized;
  }
  throw new Error("media_type must be either 'video' or 'image'");
}

function parseListingContentGenerateParams(
  body: GenerateListingContentBody | null,
  listingId: string
): ValidatedGenerateParams {
  return {
    listingId,
    subcategory: parseListingSubcategory(body?.subcategory),
    mediaType: parseListingMediaType(body?.media_type),
    focus: body?.focus?.trim() ?? "",
    notes: body?.notes?.trim() ?? "",
    generationNonce: body?.generation_nonce?.trim() ?? ""
  };
}

/**
 * Validates listingId (must be non-empty) and request body (subcategory, media_type, etc.).
 * @throws ApiError for invalid or missing values
 */
export function parseAndValidateParams(
  body: GenerateListingContentBody | null,
  listingIdRaw: string | undefined
): ValidatedGenerateParams {
  try {
    const listingId = parseRequiredRouteParam(listingIdRaw, "listingId");
    return parseListingContentGenerateParams(body, listingId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    throw new ApiError(StatusCode.BAD_REQUEST, {
      error: "Invalid request",
      message:
        message === "listingId is required" ? "Listing ID is required" : message
    });
  }
}
