import type { ListingImagePreviewItem } from "@web/src/components/listings/content/shared/types";
import type { ListingContentItem as ContentItem } from "@web/src/lib/domain/listings/content";
import type {
  ListingTemplateRenderedItem,
  TemplateRenderCaptionItemInput
} from "@web/src/lib/domain/media/templateRender/types";

/** Content item with optional cache key identity for template render API. */
export type CaptionItemWithCacheKey = ContentItem & {
  cacheKeyTimestamp?: number;
  cacheKeyId?: number;
};

export function buildTemplateRenderCaptionItems(
  items: CaptionItemWithCacheKey[]
): TemplateRenderCaptionItemInput[] {
  return items
    .map((item) => {
      const base = {
        id: item.id,
        hook: item.hook?.trim() || null,
        caption: item.caption?.trim() || null,
        broll_query: item.brollQuery?.trim() || null,
        cta: null,
        body: (item.body ?? [])
          .map((slide) => ({
            header: slide.header?.trim() ?? "",
            content: slide.content?.trim() ?? ""
          }))
          .filter((slide) => slide.header || slide.content)
      };
      if (
        typeof item.cacheKeyTimestamp === "number" &&
        typeof item.cacheKeyId === "number"
      ) {
        return {
          ...base,
          cacheKeyTimestamp: item.cacheKeyTimestamp,
          cacheKeyId: item.cacheKeyId
        };
      }
      return base;
    })
    .filter((item) => item.hook || item.caption || item.body.length > 0);
}

export function mapTemplateRenderItemsToPreviewItems(params: {
  renderedItems: ListingTemplateRenderedItem[];
  captionItems: TemplateRenderCaptionItemInput[];
}): ListingImagePreviewItem[] {
  const captionById = new Map(
    params.captionItems.map((item) => [item.id, item] as const)
  );

  return params.renderedItems.map((renderedItem, index) => {
    const matchedCaption = captionById.get(renderedItem.captionItemId);
    const fallbackHeader = matchedCaption?.hook || "Listing";
    const fallbackContent = matchedCaption?.caption || "";
    return {
      id: `template-render-${renderedItem.templateId}-${renderedItem.captionItemId}-${index}`,
      variationNumber: index + 1,
      hook: matchedCaption?.hook ?? null,
      caption: matchedCaption?.caption ?? null,
      slides: [
        {
          id: `${renderedItem.templateId}-render`,
          imageUrl: renderedItem.imageUrl,
          header: fallbackHeader,
          content: fallbackContent,
          textOverlay: null
        }
      ],
      coverImageUrl: renderedItem.imageUrl,
      isTemplateRender: renderedItem.isFallback !== true,
      captionItemId: renderedItem.captionItemId
    };
  });
}

export function mapCachedRenderedPreviewToPreviewItem(
  item: ContentItem & {
    cachedRenderedPreview: {
      imageUrl: string;
      templateId: string;
      modifications: Record<string, string>;
    };
  },
  variationNumber: number
): ListingImagePreviewItem {
  const { cachedRenderedPreview } = item;
  return {
    id: `cached-preview-${item.id}-${cachedRenderedPreview.templateId}`,
    variationNumber,
    hook: item.hook ?? null,
    caption: item.caption ?? null,
    slides: [
      {
        id: `${cachedRenderedPreview.templateId}-cached`,
        imageUrl: cachedRenderedPreview.imageUrl,
        header: item.hook?.trim() ?? "",
        content: item.caption?.trim() ?? "",
        textOverlay: null
      }
    ],
    coverImageUrl: cachedRenderedPreview.imageUrl,
    isTemplateRender: true,
    captionItemId: item.id
  };
}

export function getCachedPreviewsFromCaptionItems(
  captionItems: ContentItem[]
): ListingImagePreviewItem[] {
  type ItemWithCached = ContentItem & {
    cachedRenderedPreview: {
      imageUrl: string;
      templateId: string;
      modifications: Record<string, string>;
    };
  };
  return captionItems
    .filter(
      (c): c is ItemWithCached =>
        !!(c && "cachedRenderedPreview" in c && c.cachedRenderedPreview)
    )
    .map((item, i) => mapCachedRenderedPreviewToPreviewItem(item, i + 1));
}

export function mapSingleTemplateRenderItemToPreviewItem(params: {
  renderedItem: ListingTemplateRenderedItem;
  captionItems: TemplateRenderCaptionItemInput[];
  variationNumber: number;
}): ListingImagePreviewItem {
  const mapped = mapTemplateRenderItemsToPreviewItems({
    renderedItems: [params.renderedItem],
    captionItems: params.captionItems
  });
  const one = mapped[0];
  if (!one) {
    throw new Error("mapTemplateRenderItemsToPreviewItems returned empty");
  }
  return {
    ...one,
    variationNumber: params.variationNumber
  };
}
