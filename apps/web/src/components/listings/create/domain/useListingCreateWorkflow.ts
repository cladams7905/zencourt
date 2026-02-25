import * as React from "react";
import type { ListingContentSubcategory } from "@shared/types/models";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import type { ListingCreateImage } from "./listingCreateUtils";
import type { ListingCreateMediaTab } from "@web/src/components/listings/create/shared/constants";
import { useContentGeneration } from "./contentGeneration";
import { useListingCreateActiveMediaItems } from "./useListingCreateActiveMediaItems";
import { useTemplateRender } from "./templateRender";
import { useListingCreateMediaItems } from "./useListingCreateMediaItems";
import { useListingCreatePreviewPlans } from "./useListingCreatePreviewPlans";
import { useDeleteCachedPreviewItem } from "./useDeleteCachedPreviewItem";

export function useListingCreateWorkflow(params: {
  listingId: string;
  listingPostItems: ContentItem[];
  listingImages: ListingCreateImage[];
  videoItems: ContentItem[];
  initialMediaTab: ListingCreateMediaTab;
  initialSubcategory: ListingContentSubcategory;
}) {
  const {
    listingId,
    listingPostItems,
    listingImages,
    videoItems,
    initialMediaTab,
    initialSubcategory
  } = params;

  const [activeMediaTab, setActiveMediaTab] =
    React.useState<ListingCreateMediaTab>(initialMediaTab);
  const [activeSubcategory, setActiveSubcategory] =
    React.useState<ListingContentSubcategory>(initialSubcategory);

  const {
    localPostItems,
    isGenerating,
    generationError,
    loadingCount,
    generateSubcategoryContent,
    removeContentItem
  } = useContentGeneration({
    listingId,
    listingPostItems,
    activeMediaTab,
    activeSubcategory
  });

  const activeMediaItems = useListingCreateActiveMediaItems({
    activeMediaTab,
    activeSubcategory,
    localPostItems
  });

  const {
    previewItems: templatePreviewItems,
    isRendering: isTemplateRendering,
    renderError: templateRenderError,
    isTemplateRenderingUnavailable
  } = useTemplateRender({
    listingId,
    activeSubcategory,
    activeMediaTab,
    captionItems: activeMediaItems,
    isGenerating
  });

  const { activeImagePreviewItems, imageLoadingCount } = useListingCreateMediaItems({
    activeMediaTab,
    activeMediaItems,
    listingImages,
    isGenerating,
    loadingCount,
    isTemplateRendering,
    isTemplateRenderingUnavailable,
    templatePreviewItems
  });

  const activePreviewPlans = useListingCreatePreviewPlans({
    listingId,
    activeMediaTab,
    activeSubcategory,
    activeMediaItems,
    videoItems
  });

  const handleDeleteImagePreviewItem = useDeleteCachedPreviewItem({
    listingId,
    activeSubcategory,
    activeMediaItems,
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
    generateSubcategoryContent,
    activeMediaItems,
    templateRenderError,
    isTemplateRendering,
    activeImagePreviewItems,
    imageLoadingCount,
    activePreviewPlans,
    handleDeleteImagePreviewItem
  };
}
