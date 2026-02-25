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
  /** When set (e.g. by Dev single-template generate), next template render uses this id. Cleared after use. */
  const [templateIdForRender, setTemplateIdForRender] =
    React.useState<string | null>(null);

  const {
    localPostItems,
    isGenerating,
    generationError,
    loadingCount,
    generateSubcategoryContent: generateSubcategoryContentRaw,
    removeContentItem
  } = useContentGeneration({
    listingId,
    listingPostItems,
    activeMediaTab,
    activeSubcategory
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

  const activeMediaItems = useListingCreateActiveMediaItems({
    activeMediaTab,
    activeSubcategory,
    localPostItems
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
    captionItems: activeMediaItems,
    isGenerating,
    templateIdForRender: templateIdForRender ?? undefined,
    clearTemplateIdForRender
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
