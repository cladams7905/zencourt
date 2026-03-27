"use client";

import * as React from "react";
import type { ListingContentSubcategory } from "@shared/types/models";
import type { ListingContentItem as ContentItem } from "@web/src/lib/domain/listings/content";
import type { ListingCreateImage } from "../shared/utils";
import type { ListingCreateMediaTab } from "@web/src/components/listings/create/shared/constants";
import { useContentGeneration } from "../content/generation";
import { useListingCreateActiveMediaItems } from "../media/activeMediaItems";
import { useTemplateRender } from "../templateRender";
import { useListingCreateMediaItems } from "../media/mediaItems";
import { useListingCreatePreviewPlans } from "../preview/previewPlans";
import { useDeleteCachedPreviewItem } from "../media/deleteCachedPreviewItem";

type ListingContentItem = ContentItem;
type ListingClipItem = ContentItem;

export function useListingCreateWorkflow(params: {
  listingId: string;
  listingContentItems: ListingContentItem[];
  listingImages: ListingCreateImage[];
  listingClipItems: ListingClipItem[];
  initialMediaTab: ListingCreateMediaTab;
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
    React.useState<ListingCreateMediaTab>(initialMediaTab);
  const [activeSubcategory, setActiveSubcategory] =
    React.useState<ListingContentSubcategory>(initialSubcategory);
  /** When set (e.g. by Dev single-template generate), next template render uses this id. Cleared after use. */
  const [templateIdForRender, setTemplateIdForRender] =
    React.useState<string | null>(null);

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

  const activeContentItems = useListingCreateActiveMediaItems({
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

  const { activeImagePreviewItems, imageLoadingCount } = useListingCreateMediaItems({
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

  const activePreviewPlans = useListingCreatePreviewPlans({
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
