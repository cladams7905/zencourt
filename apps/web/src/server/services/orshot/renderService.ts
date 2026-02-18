import type { DBListing, DBListingImage, DBUserAdditional } from "@shared/types/models";
import type {
  ListingOrshotRenderResult,
  OrshotCaptionItemInput,
  OrshotParameterKey,
  OrshotTemplateConfig
} from "@web/src/lib/domain/media/orshot/types";
import type { ListingContentSubcategory } from "@shared/types/models";
import { createChildLogger, logger as baseLogger } from "@web/src/lib/core/logging/logger";
import { renderOrshotTemplate } from "./client";
import { resolveOrshotTemplateParameters } from "./parameterResolver";
import { pickRandomTemplatesForSubcategory } from "./templateConfig";

const logger = createChildLogger(baseLogger, { module: "orshot-render-service" });

const DEFAULT_TEMPLATE_COUNT = 4;
const IMAGE_PARAMETER_KEYS = new Set<OrshotParameterKey>([
  "arrowImage",
  "backgroundImage1",
  "backgroundImage2",
  "backgroundImage3",
  "backgroundImage4",
  "backgroundImage5",
  "realtorProfileImage"
]);
const INLINE_HEADING_PARAMETER_KEYS = new Set<OrshotParameterKey>([
  "headerText",
  "headerTag",
  "headerTextTop",
  "headerTextBottom",
  "subheader1Text",
  "subheader2Text",
  "bedCount",
  "bathCount",
  "garageCount",
  "squareFootage",
  "listingPrice",
  "priceLabel",
  "priceDescription",
  "propertyDescription",
  "listingAddress",
  "feature1",
  "feature2",
  "feature3",
  "featureList",
  "openHouseDateTime",
  "socialHandle",
  "realtorName",
  "realtorContactInfo",
  "realtorContact1",
  "realtorContact2",
  "realtorContact3"
]);

function isPublicFetchableImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      return false;
    }
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function selectCaptionItem(
  captionItems: OrshotCaptionItemInput[],
  index: number
): OrshotCaptionItemInput {
  return captionItems[index % captionItems.length] as OrshotCaptionItemInput;
}

function buildModifications(params: {
  resolvedParameters: Partial<Record<OrshotParameterKey, string>>;
  template: OrshotTemplateConfig;
}): Record<string, string> {
  const source = params.resolvedParameters;
  const requestedKeys =
    params.template.requiredParams.length > 0
      ? params.template.requiredParams
      : (Object.keys(source) as OrshotParameterKey[]);

  const modifications: Record<string, string> = {};

  for (const key of requestedKeys) {
    const value = source[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        continue;
      }
      if (
        IMAGE_PARAMETER_KEYS.has(key) &&
        !isPublicFetchableImageUrl(trimmed)
      ) {
        continue;
      }

      modifications[key] = trimmed;
      // Inline text variables in heading text use the "heading:name" pattern.
      if (INLINE_HEADING_PARAMETER_KEYS.has(key)) {
        modifications[`heading:${key}`] = trimmed;
      }
    }
  }

  return modifications;
}

export async function renderListingOrshotBatch(params: {
  subcategory: ListingContentSubcategory;
  listing: DBListing;
  listingImages: DBListingImage[];
  userAdditional: DBUserAdditional;
  captionItems: OrshotCaptionItemInput[];
  templateCount?: number;
  siteOrigin?: string | null;
}): Promise<ListingOrshotRenderResult> {
  if (!params.captionItems.length) {
    return { items: [], failedTemplateIds: [] };
  }

  const selectedTemplates = pickRandomTemplatesForSubcategory({
    subcategory: params.subcategory,
    count: params.templateCount ?? DEFAULT_TEMPLATE_COUNT
  });

  if (!selectedTemplates.length) {
    return { items: [], failedTemplateIds: [] };
  }

  const renders = await Promise.all(
    selectedTemplates.map(async (template, index) => {
      const captionItem = selectCaptionItem(params.captionItems, index);
      const resolvedParameters = resolveOrshotTemplateParameters({
        subcategory: params.subcategory,
        listing: params.listing,
        listingImages: params.listingImages,
        userAdditional: params.userAdditional,
        captionItem,
        siteOrigin: params.siteOrigin
      });

      const modifications = buildModifications({
        resolvedParameters,
        template
      });

      try {
        const imageUrl = await renderOrshotTemplate({
          templateId: template.id,
          modifications
        });

        return {
          ok: true as const,
          value: {
            templateId: template.id,
            imageUrl,
            captionItemId: captionItem.id,
            parametersUsed: resolvedParameters
          }
        };
      } catch (error) {
        logger.error(
          {
            templateId: template.id,
            error: error instanceof Error ? error.message : error
          },
          "Orshot template render failed"
        );
        return { ok: false as const, templateId: template.id };
      }
    })
  );

  const items = renders
    .filter((result) => result.ok)
    .map((result) => result.value);

  const failedTemplateIds = renders
    .filter((result) => !result.ok)
    .map((result) => result.templateId);

  return {
    items,
    failedTemplateIds
  };
}
