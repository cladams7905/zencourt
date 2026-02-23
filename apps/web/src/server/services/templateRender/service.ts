import type {
  DBListing,
  DBListingImage,
  DBUserAdditional
} from "@db/types/models";
import type {
  ListingTemplateRenderedItem,
  ListingTemplateRenderResult,
  TemplateRenderCaptionItemInput,
  TemplateRenderConfig,
  TemplateRenderParameterKey
} from "@web/src/lib/domain/media/templateRender/types";
import type { ListingContentSubcategory } from "@shared/types/models";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import storageService from "@web/src/server/services/storage";
import {
  buildTemplateRenderCacheKey,
  cachedToRenderedItem,
  getCachedTemplateRender,
  setCachedTemplateRender
} from "./cache";
import { buildFallbackRenderedItem } from "./providers/fallback";
import {
  renderTemplate,
  resolveTemplateParameters,
  pickRandomTemplatesForSubcategory
} from "./providers/orshot";

const logger = createChildLogger(baseLogger, {
  module: "template-render-service"
});

const DEFAULT_TEMPLATE_COUNT = 4;
const IMAGE_PARAMETER_KEYS = new Set<TemplateRenderParameterKey>([
  "arrowImage",
  "backgroundImage1",
  "backgroundImage2",
  "backgroundImage3",
  "backgroundImage4",
  "backgroundImage5",
  "realtorProfileImage"
]);
const INLINE_HEADING_PARAMETER_KEYS = new Set<TemplateRenderParameterKey>([
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
  captionItems: TemplateRenderCaptionItemInput[],
  index: number
): TemplateRenderCaptionItemInput {
  return captionItems[
    index % captionItems.length
  ] as TemplateRenderCaptionItemInput;
}

function resolveListingImagesToPublicUrls(listingImages: DBListingImage[]): {
  images: DBListingImage[];
  resolutionSummary: { publicUrlCount: number };
} {
  let publicUrlCount = 0;
  const images = listingImages.map((img) => {
    const publicUrl = storageService.getPublicUrlForStorageUrl(img.url);
    const resolvedUrl = publicUrl ?? img.url;
    if (publicUrl) {
      publicUrlCount += 1;
    }
    return {
      ...img,
      url: resolvedUrl
    };
  });
  return {
    images,
    resolutionSummary: { publicUrlCount }
  };
}

function buildModifications(params: {
  resolvedParameters: Partial<Record<TemplateRenderParameterKey, string>>;
  template: TemplateRenderConfig;
}): Record<string, string> {
  const source = params.resolvedParameters;
  const requestedKeys =
    params.template.requiredParams.length > 0
      ? params.template.requiredParams
      : (Object.keys(source) as TemplateRenderParameterKey[]);

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

export async function renderListingTemplateBatch(params: {
  subcategory: ListingContentSubcategory;
  listing: DBListing;
  listingImages: DBListingImage[];
  userAdditional: DBUserAdditional;
  captionItems: TemplateRenderCaptionItemInput[];
  templateCount?: number;
  siteOrigin?: string | null;
  random?: () => number;
  now?: () => Date;
}): Promise<ListingTemplateRenderResult> {
  if (!params.captionItems.length) {
    return { items: [], failedTemplateIds: [] };
  }

  const selectedTemplates = pickRandomTemplatesForSubcategory({
    subcategory: params.subcategory,
    count: params.templateCount ?? DEFAULT_TEMPLATE_COUNT,
    random: params.random
  });

  if (!selectedTemplates.length) {
    return { items: [], failedTemplateIds: [] };
  }

  const { images: listingImagesWithPublicUrls, resolutionSummary } =
    resolveListingImagesToPublicUrls(params.listingImages);

  const usingPublicBaseUrl = storageService.hasPublicBaseUrl();
  logger.debug(
    {
      subcategory: params.subcategory,
      listingId: params.listing.id,
      usingPublicBaseUrl,
      urlSource: usingPublicBaseUrl
        ? "STORAGE_PUBLIC_BASE_URL (CDN)"
        : "fallback (no public base URL)",
      resolutionSummary,
      imageUrls: listingImagesWithPublicUrls.map((img) => ({
        id: img.id,
        url: img.url,
        category: img.category
      }))
    },
    "Template render: listing image URLs (after public URL resolution)"
  );

  const renders = await Promise.all(
    selectedTemplates.map(async (template, index) => {
      const captionItem = selectCaptionItem(params.captionItems, index);
      const resolvedParameters = resolveTemplateParameters({
        subcategory: params.subcategory,
        listing: params.listing,
        listingImages: listingImagesWithPublicUrls,
        userAdditional: params.userAdditional,
        captionItem,
        siteOrigin: params.siteOrigin,
        random: params.random,
        now: params.now?.()
      });

      const modifications = buildModifications({
        resolvedParameters,
        template
      });

      try {
        const imageUrl = await renderTemplate({
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
          "Template render failed"
        );
        return { ok: false as const, templateId: template.id };
      }
    })
  );

  const failedTemplateIds = renders
    .filter((result) => !result.ok)
    .map((result) => result.templateId);

  const items: ListingTemplateRenderedItem[] = [];
  for (let index = 0; index < renders.length; index += 1) {
    const result = renders[index];
    const captionItem = selectCaptionItem(params.captionItems, index);
    if (result?.ok && result.value) {
      items.push(result.value);
    } else {
      const fallback = buildFallbackRenderedItem(
        captionItem,
        listingImagesWithPublicUrls
      );
      if (fallback) {
        items.push(fallback);
      }
    }
  }

  return {
    items,
    failedTemplateIds
  };
}

export type RenderListingTemplateBatchStreamParams = {
  listingId: string;
  subcategory: ListingContentSubcategory;
  listing: DBListing;
  listingImages: DBListingImage[];
  userAdditional: DBUserAdditional;
  captionItems: TemplateRenderCaptionItemInput[];
  templateCount?: number;
  siteOrigin?: string | null;
  random?: () => number;
  now?: () => Date;
};

export type RenderListingTemplateBatchStreamCallbacks = {
  onItem: (item: ListingTemplateRenderedItem) => Promise<void>;
};

/**
 * Renders templates one-by-one, checking Redis first and calling onItem for each
 * (cache hit or after Orshot render). Caller can push SSE from onItem.
 */
export async function renderListingTemplateBatchStream(
  params: RenderListingTemplateBatchStreamParams,
  callbacks: RenderListingTemplateBatchStreamCallbacks
): Promise<{ failedTemplateIds: string[] }> {
  const failedTemplateIds: string[] = [];

  if (!params.captionItems.length) {
    return { failedTemplateIds };
  }

  const selectedTemplates = pickRandomTemplatesForSubcategory({
    subcategory: params.subcategory,
    count: params.templateCount ?? DEFAULT_TEMPLATE_COUNT,
    random: params.random
  });

  if (!selectedTemplates.length) {
    return { failedTemplateIds };
  }

  const { images: listingImagesWithPublicUrls } = resolveListingImagesToPublicUrls(
    params.listingImages
  );

  for (let index = 0; index < selectedTemplates.length; index += 1) {
    const template = selectedTemplates[index] as TemplateRenderConfig;
    const captionItem = selectCaptionItem(params.captionItems, index);

    const resolvedParameters = resolveTemplateParameters({
      subcategory: params.subcategory,
      listing: params.listing,
      listingImages: listingImagesWithPublicUrls,
      userAdditional: params.userAdditional,
      captionItem,
      siteOrigin: params.siteOrigin,
      random: params.random,
      now: params.now?.()
    });

    const modifications = buildModifications({
      resolvedParameters,
      template
    });

    const cacheKey = buildTemplateRenderCacheKey({
      listingId: params.listingId,
      subcategory: params.subcategory,
      captionItemId: captionItem.id,
      templateId: template.id,
      modifications
    });

    const cached = await getCachedTemplateRender(cacheKey);
    if (cached) {
      await callbacks.onItem(cachedToRenderedItem(cached));
      continue;
    }

    try {
      const imageUrl = await renderTemplate({
        templateId: template.id,
        modifications
      });

      await setCachedTemplateRender(cacheKey, {
        imageUrl,
        templateId: template.id,
        captionItemId: captionItem.id,
        modifications
      });

      await callbacks.onItem({
        templateId: template.id,
        imageUrl,
        captionItemId: captionItem.id,
        parametersUsed: resolvedParameters
      });
    } catch (error) {
      logger.error(
        {
          templateId: template.id,
          error: error instanceof Error ? error.message : error
        },
        "Template render failed"
      );
      failedTemplateIds.push(template.id);
      const fallback = buildFallbackRenderedItem(
        captionItem,
        listingImagesWithPublicUrls
      );
      if (fallback) {
        await callbacks.onItem(fallback);
      }
    }
  }

  return { failedTemplateIds };
}
