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
  TemplateRenderCaptionItemWithCacheKey
} from "@web/src/lib/domain/media/templateRender/types";
import type {
  ListingContentSubcategory,
  ListingPropertyDetails
} from "@shared/types/models";
import { resolveListingOpenHouseContext } from "@web/src/lib/domain/listings/openHouse";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { buildFallbackRenderedItem } from "./providers/fallback";
import {
  getTemplateById,
  pickRandomTemplatesForSubcategory,
  renderOrshotTemplate
} from "./providers/orshot";
import {
  createInMemoryTemplateHeaderRotationStore,
  createInMemoryTemplateImageRotationStore,
  type TemplateHeaderRotationStore,
  type TemplateImageRotationStore
} from "./rotation";

const logger = createChildLogger(baseLogger, {
  module: "template-render-service"
});

const DEFAULT_TEMPLATE_COUNT = 4;
const OPEN_HOUSE_SCHEDULE_PARAM = "openHouseDateTime";

function selectCaptionItem(
  captionItems: TemplateRenderCaptionItemInput[],
  index: number
): TemplateRenderCaptionItemInput {
  return captionItems[
    index % captionItems.length
  ] as TemplateRenderCaptionItemInput;
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
  headerRotationStore?: TemplateHeaderRotationStore;
  imageRotationStore?: TemplateImageRotationStore;
}): Promise<ListingTemplateRenderResult> {
  if (!params.captionItems.length) {
    return { items: [], failedTemplateIds: [] };
  }

  const selectedTemplates = pickRandomTemplatesForSubcategory({
    subcategory: params.subcategory,
    count: params.templateCount ?? DEFAULT_TEMPLATE_COUNT,
    random: params.random
  });
  const openHouseContext =
    params.subcategory === "open_house"
      ? resolveListingOpenHouseContext({
          listingPropertyDetails:
            (params.listing.propertyDetails as ListingPropertyDetails | null) ??
            null,
          listingAddress: params.listing.address?.trim() ?? "",
          now: params.now?.()
        })
      : null;
  if (params.subcategory === "open_house") {
    logger.info(
      {
        listingId: params.listing.id,
        hasAnyEvent: openHouseContext?.hasAnyEvent ?? false,
        hasSchedule: openHouseContext?.hasSchedule ?? false,
        selectedEventDate: openHouseContext?.selectedEvent?.date ?? null
      },
      "Resolved open house template context"
    );
  }
  const templatesToRender =
    params.subcategory === "open_house" && openHouseContext && !openHouseContext.hasSchedule
      ? selectedTemplates.filter(
          (template) => !template.requiredParams.includes(OPEN_HOUSE_SCHEDULE_PARAM)
        )
      : selectedTemplates;

  if (templatesToRender.length !== selectedTemplates.length) {
    logger.info(
      {
        listingId: params.listing.id,
        droppedTemplateCount: selectedTemplates.length - templatesToRender.length
      },
      "Filtered open house templates requiring schedule parameter"
    );
  }

  if (!templatesToRender.length) {
    return { items: [], failedTemplateIds: [] };
  }
  const headerRotationStore =
    params.headerRotationStore ?? createInMemoryTemplateHeaderRotationStore();
  const imageRotationStore =
    params.imageRotationStore ?? createInMemoryTemplateImageRotationStore();

  const renders = await Promise.all(
    templatesToRender.map(async (template, index) => {
      const captionItem = selectCaptionItem(params.captionItems, index);

      try {
        const { imageUrl, parametersUsed } = await renderOrshotTemplate({
          template,
          subcategory: params.subcategory,
          listing: params.listing,
          listingImages: params.listingImages,
          userAdditional: params.userAdditional,
          captionItem,
          siteOrigin: params.siteOrigin,
          random: params.random,
          now: params.now?.(),
          renderIndex: index,
          headerRotationStore,
          imageRotationStore
        });

        return {
          ok: true as const,
          value: {
            templateId: template.id,
            imageUrl,
            captionItemId: captionItem.id,
            parametersUsed
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
        params.listingImages
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
  headerRotationStore?: TemplateHeaderRotationStore;
  imageRotationStore?: TemplateImageRotationStore;
};

export type RenderListingTemplateBatchStreamCallbacks = {
  onItem: (item: ListingTemplateRenderedItem) => Promise<void>;
  onResult?: (result: {
    cacheKeyTimestamp?: number;
    cacheKeyId?: number;
    content: {
      hook: string;
      broll_query: string;
      body: Array<{
        header: string;
        content: string;
        broll_query: string;
      }> | null;
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
  const openHouseContext =
    params.subcategory === "open_house"
      ? resolveListingOpenHouseContext({
          listingPropertyDetails:
            (params.listing.propertyDetails as ListingPropertyDetails | null) ??
            null,
          listingAddress: params.listing.address?.trim() ?? "",
          now: params.now?.()
        })
      : null;
  if (params.subcategory === "open_house") {
    logger.info(
      {
        listingId: params.listing.id,
        hasAnyEvent: openHouseContext?.hasAnyEvent ?? false,
        hasSchedule: openHouseContext?.hasSchedule ?? false,
        selectedEventDate: openHouseContext?.selectedEvent?.date ?? null
      },
      "Resolved open house template context"
    );
  }
  const templatesToRender =
    params.subcategory === "open_house" && openHouseContext && !openHouseContext.hasSchedule
      ? selectedTemplates.filter(
          (template) => !template.requiredParams.includes(OPEN_HOUSE_SCHEDULE_PARAM)
        )
      : selectedTemplates;

  if (templatesToRender.length !== selectedTemplates.length) {
    logger.info(
      {
        listingId: params.listing.id,
        droppedTemplateCount: selectedTemplates.length - templatesToRender.length
      },
      "Filtered open house templates requiring schedule parameter"
    );
  }

  if (!templatesToRender.length) {
    return { failedTemplateIds };
  }
  const headerRotationStore =
    params.headerRotationStore ?? createInMemoryTemplateHeaderRotationStore();
  const imageRotationStore =
    params.imageRotationStore ?? createInMemoryTemplateImageRotationStore();

  for (let index = 0; index < templatesToRender.length; index += 1) {
    const template = templatesToRender[index] as TemplateRenderConfig;
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

    try {
      const { imageUrl, parametersUsed, modifications } =
        await renderOrshotTemplate({
          template,
          subcategory: params.subcategory,
          listing: params.listing,
          listingImages: params.listingImages,
          userAdditional: params.userAdditional,
          captionItem,
          siteOrigin: params.siteOrigin,
          random: params.random,
          now: params.now?.(),
          renderIndex: index,
          headerRotationStore,
          imageRotationStore
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
        parametersUsed
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
