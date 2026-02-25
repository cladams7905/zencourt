import { ApiError } from "@web/src/server/errors/api";
import { StatusCode } from "@shared/types/api";
import { LISTING_CONTENT_SUBCATEGORIES } from "@shared/types/models";
import type {
  GenerateListingContentBody,
  ValidatedGenerateParams
} from "./types";

const DEFAULT_GENERATION_COUNT = 4;

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
  const rawGenerationCount = body?.generation_count;
  const generationCount =
    typeof rawGenerationCount === "number" && Number.isFinite(rawGenerationCount)
      ? Math.max(1, Math.floor(rawGenerationCount))
      : DEFAULT_GENERATION_COUNT;
  const templateId =
    typeof body?.template_id === "string" ? body.template_id.trim() : "";

  return {
    listingId,
    subcategory: parseListingSubcategory(body?.subcategory),
    mediaType: parseListingMediaType(body?.media_type),
    focus: body?.focus?.trim() ?? "",
    notes: body?.notes?.trim() ?? "",
    generationNonce: body?.generation_nonce?.trim() ?? "",
    generationCount,
    templateId
  };
}

/**
 * Validates listingId (must be non-empty) and request body (subcategory, media_type, etc.).
 * @throws ApiError for invalid or missing values
 */
export function parseAndValidateParams(
  body: GenerateListingContentBody | null,
  listingId: string
): ValidatedGenerateParams {
  try {
    return parseListingContentGenerateParams(body, listingId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    throw new ApiError(StatusCode.BAD_REQUEST, {
      error: "Invalid request",
      message
    });
  }
}
