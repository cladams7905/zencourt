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
import { buildFallbackRenderedItem } from "./providers/fallback";
import {
  getTemplateById,
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

  const renders = await Promise.all(
    selectedTemplates.map(async (template, index) => {
      const captionItem = selectCaptionItem(params.captionItems, index);
      const resolvedParameters = resolveTemplateParameters({
        subcategory: params.subcategory,
        listing: params.listing,
        listingImages: params.listingImages,
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
      const fallback = buildFallbackRenderedItem(captionItem, params.listingImages);
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

export type TemplateRenderCaptionItemWithCacheKey =
  TemplateRenderCaptionItemInput & {
    cacheKeyTimestamp?: number;
    cacheKeyId?: number;
  };

export type RenderListingTemplateBatchStreamParams = {
  userId: string;
  listingId: string;
  subcategory: ListingContentSubcategory;
  mediaType: "video" | "image";
  listing: DBListing;
  listingImages: DBListingImage[];
  userAdditional: DBUserAdditional;
  captionItems: TemplateRenderCaptionItemWithCacheKey[];
  templateCount?: number;
  /** When set, render only this template (e.g. for dev single-template preview). */
  templateId?: string;
  siteOrigin?: string | null;
  random?: () => number;
  now?: () => Date;
};

export type RenderListingTemplateBatchStreamCallbacks = {
  onItem: (item: ListingTemplateRenderedItem) => Promise<void>;
  onResult?: (result: {
    cacheKeyTimestamp?: number;
    cacheKeyId?: number;
    content: {
      hook: string;
      broll_query: string;
      body: Array<{ header: string; content: string; broll_query: string }> | null;
      cta: string | null;
      caption: string;
    };
    rendered: {
      imageUrl: string;
      templateId: string;
      modifications: Record<string, string>;
    } | null;
  }) => Promise<void>;
};

/**
 * Renders templates one-by-one and emits each result via onItem.
 * This path intentionally does not mutate listing content cache.
 */
export async function renderListingTemplateBatchStream(
  params: RenderListingTemplateBatchStreamParams,
  callbacks: RenderListingTemplateBatchStreamCallbacks
): Promise<{ failedTemplateIds: string[] }> {
  const failedTemplateIds: string[] = [];

  if (!params.captionItems.length) {
    return { failedTemplateIds };
  }

  const selectedTemplates =
    params.templateId != null
      ? (() => {
          const template = getTemplateById(params.templateId!);
          return template ? [template] : [];
        })()
      : pickRandomTemplatesForSubcategory({
          subcategory: params.subcategory,
          count: params.templateCount ?? DEFAULT_TEMPLATE_COUNT,
          random: params.random
        });

  if (!selectedTemplates.length) {
    return { failedTemplateIds };
  }

  for (let index = 0; index < selectedTemplates.length; index += 1) {
    const template = selectedTemplates[index] as TemplateRenderConfig;
    const captionItem = selectCaptionItem(
      params.captionItems,
      index
    ) as TemplateRenderCaptionItemWithCacheKey;

    const cacheKeyTimestamp = captionItem.cacheKeyTimestamp;
    const cacheKeyId = captionItem.cacheKeyId;

    const content = {
      hook: captionItem.hook ?? "",
      broll_query: captionItem.broll_query ?? "",
      body:
        captionItem.body.length > 0
          ? captionItem.body.map((slide) => ({
              header: slide.header,
              content: slide.content,
              broll_query: captionItem.broll_query ?? ""
            }))
          : null,
      cta: captionItem.cta ?? null,
      caption: captionItem.caption ?? ""
    };

    const resolvedParameters = resolveTemplateParameters({
      subcategory: params.subcategory,
      listing: params.listing,
      listingImages: params.listingImages,
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

      await callbacks.onResult?.({
        cacheKeyTimestamp,
        cacheKeyId,
        content,
        rendered: {
          imageUrl,
          templateId: template.id,
          modifications
        }
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

      await callbacks.onResult?.({
        cacheKeyTimestamp,
        cacheKeyId,
        content,
        rendered: null
      });

      const fallback = buildFallbackRenderedItem(
        captionItem,
        params.listingImages
      );
      if (fallback) {
        await callbacks.onItem(fallback);
      }
    }
  }

  return { failedTemplateIds };
}
