import * as React from "react";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import type { ListingImagePreviewItem } from "@web/src/components/listings/create/shared/types";
import {
  type ListingCreateImage,
  buildVariedImageSequence,
  rankListingImagesForItem
} from "@web/src/components/listings/create/domain/listingCreateUtils";

export function useListingCreateMediaItems(params: {
  activeMediaTab: "videos" | "images";
  activeMediaItems: ContentItem[];
  listingImages: ListingCreateImage[];
  isGenerating: boolean;
  loadingCount: number;
  isTemplateRendering: boolean;
  isTemplateRenderingUnavailable: boolean;
  templatePreviewItems: ListingImagePreviewItem[];
}) {
  const {
    activeMediaTab,
    activeMediaItems,
    listingImages,
    isGenerating,
    loadingCount,
    isTemplateRendering,
    isTemplateRenderingUnavailable,
    templatePreviewItems
  } = params;

  const fallbackImagePreviewItems = React.useMemo<ListingImagePreviewItem[]>(() => {
    if (activeMediaTab !== "images" || activeMediaItems.length === 0) {
      return [];
    }

    const fallbackSortedImages = [...listingImages].sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) {
        return (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0);
      }
      const scoreDelta = (b.primaryScore ?? -Infinity) - (a.primaryScore ?? -Infinity);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return b.uploadedAtMs - a.uploadedAtMs;
    });

    return activeMediaItems.map((item, index) => {
      const rankedForItem = rankListingImagesForItem(fallbackSortedImages, item);
      const variedForItem = buildVariedImageSequence(rankedForItem, `${item.id}:${index}`);
      const fallbackSlides = [
        {
          id: `${item.id}-slide-fallback`,
          imageUrl: variedForItem[0]?.url ?? null,
          header: item.hook?.trim() || "Listing",
          content: item.caption?.trim() || "",
          textOverlay: null
        }
      ];
      const slides =
        item.body && item.body.length > 0
          ? item.body.map((slide, slideIndex) => ({
              id: `${item.id}-slide-${slideIndex}`,
              imageUrl:
                variedForItem[slideIndex % variedForItem.length]?.url ??
                variedForItem[0]?.url ??
                null,
              header: slide.header?.trim() || item.hook?.trim() || "Listing",
              content: slide.content?.trim() || "",
              textOverlay: slide.text_overlay ?? null
            }))
          : fallbackSlides;

      return {
        id: item.id,
        variationNumber: index + 1,
        hook: item.hook?.trim() || null,
        caption: item.caption?.trim() || null,
        slides,
        coverImageUrl: slides[0]?.imageUrl ?? null
      };
    });
  }, [activeMediaItems, activeMediaTab, listingImages]);

  const activeImagePreviewItems = React.useMemo(() => {
    if (isTemplateRenderingUnavailable) {
      return fallbackImagePreviewItems;
    }
    return templatePreviewItems;
  }, [fallbackImagePreviewItems, isTemplateRenderingUnavailable, templatePreviewItems]);

  const imageLoadingCount = React.useMemo(() => {
    if (activeMediaTab !== "images") {
      return 0;
    }
    if (isTemplateRenderingUnavailable) {
      return 0;
    }
    if (isGenerating) {
      return Math.max(0, loadingCount);
    }
    const expectingTemplateResults =
      activeMediaItems.length > 0 && (isTemplateRendering || templatePreviewItems.length === 0);
    if (!expectingTemplateResults) {
      return 0;
    }
    return Math.max(0, activeMediaItems.length - templatePreviewItems.length);
  }, [
    activeMediaItems.length,
    activeMediaTab,
    isGenerating,
    loadingCount,
    isTemplateRendering,
    isTemplateRenderingUnavailable,
    templatePreviewItems.length
  ]);

  return {
    activeImagePreviewItems,
    imageLoadingCount
  };
}
