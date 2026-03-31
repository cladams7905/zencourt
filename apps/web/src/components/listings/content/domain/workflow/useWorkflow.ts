"use client";

import * as React from "react";
import type { ListingContentSubcategory } from "@shared/types/models";
import type { ListingContentItem as ContentItem } from "@web/src/lib/domain/listings/content";
import type { ListingContentImage } from "@web/src/components/listings/content/image/domain/listingImages";
import type { ListingContentMediaTab } from "@web/src/components/listings/content/shared/constants";
import { useContentGeneration } from "@web/src/components/listings/content/domain/generation";
import { useListingContentActiveMediaItems } from "@web/src/components/listings/content/domain/media/activeMediaItems";
import { useTemplateRender } from "@web/src/components/listings/content/image/domain/templateRender";
import { useListingContentMediaItems } from "@web/src/components/listings/content/domain/media/mediaItems";
import { useListingContentPreviewPlans } from "./usePreviewPlans";
import { useDeleteCachedPreviewItem } from "@web/src/components/listings/content/domain/media/deleteCachedPreviewItem";

type ListingContentItem = ContentItem;
type ListingClipItem = ContentItem;

export function useListingContentWorkflow(params: {
  listingId: string;
  listingContentItems: ListingContentItem[];
  listingImages: ListingContentImage[];
  listingClipItems: ListingClipItem[];
  initialMediaTab: ListingContentMediaTab;
  initialSubcategory: ListingContentSubcategory;
}) {
  const {
    listingId,
    listingContentItems,
    listingImages,
    listingClipItems,
    initialMediaTab,
    initialSubcategory
  } = params;

  const [activeMediaTab, setActiveMediaTab] =
    React.useState<ListingContentMediaTab>(initialMediaTab);
  const [activeSubcategory, setActiveSubcategory] =
    React.useState<ListingContentSubcategory>(initialSubcategory);
  /** When set (e.g. by Dev single-template generate), next template render uses this id. Cleared after use. */
  const [templateIdForRender, setTemplateIdForRender] = React.useState<
    string | null
  >(null);

  const {
    bucketContentItems,
    isGenerating,
    generationError,
    loadingCount,
    initialPageLoadingCount,
    loadingMoreCount,
    hasMoreForActiveFilter,
    generateSubcategoryContent: generateSubcategoryContentRaw,
    removeContentItem,
    loadMoreForActiveFilter,
    replaceContentItem
  } = useContentGeneration({
    listingId,
    listingContentItems,
    initialMediaTab,
    initialSubcategory,
    activeMediaTab,
    activeSubcategory,
    listingClipItems
  });

  const generateSubcategoryContent = React.useCallback(
    async (
      subcategory: ListingContentSubcategory,
      options?: {
        forceNewBatch?: boolean;
        generationCount?: number;
        templateId?: string;
      }
    ) => {
      if (options?.templateId?.trim()) {
        setTemplateIdForRender(options.templateId.trim());
      }
      return generateSubcategoryContentRaw(subcategory, options);
    },
    [generateSubcategoryContentRaw]
  );

  const activeContentItems = useListingContentActiveMediaItems({
    activeMediaTab,
    activeSubcategory,
    bucketContentItems
  });

  const clearTemplateIdForRender = React.useCallback(() => {
    setTemplateIdForRender(null);
  }, []);

  const {
    previewItems: templatePreviewItems,
    isRendering: isTemplateRendering,
    renderError: templateRenderError,
    isTemplateRenderingUnavailable
  } = useTemplateRender({
    listingId,
    activeSubcategory,
    activeMediaTab,
    captionItems: activeContentItems,
    isGenerating,
    templateIdForRender: templateIdForRender ?? undefined,
    clearTemplateIdForRender
  });

  const { activeImagePreviewItems, imageLoadingCount } =
    useListingContentMediaItems({
      activeMediaTab,
      activeContentItems,
      listingImages,
      isGenerating,
      loadingCount,
      initialPageLoadingCount,
      loadingMoreCount,
      isTemplateRendering,
      isTemplateRenderingUnavailable,
      templatePreviewItems
    });

  const activePreviewPlans = useListingContentPreviewPlans({
    listingId,
    activeMediaTab,
    activeSubcategory,
    activeContentItems,
    listingClipItems
  });

  const handleDeleteImagePreviewItem = useDeleteCachedPreviewItem({
    listingId,
    activeSubcategory,
    activeContentItems,
    removeContentItem
  });

  return {
    activeMediaTab,
    setActiveMediaTab,
    activeSubcategory,
    setActiveSubcategory,
    isGenerating,
    generationError,
    loadingCount,
    initialPageLoadingCount,
    loadingMoreCount,
    hasMoreForActiveFilter,
    generateSubcategoryContent,
    activeContentItems,
    templateRenderError,
    isTemplateRendering,
    activeImagePreviewItems,
    imageLoadingCount,
    loadMoreForActiveFilter,
    activePreviewPlans,
    handleDeleteImagePreviewItem,
    replaceContentItem
  };
}
