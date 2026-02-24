import * as React from "react";
import { toast } from "sonner";
import { emitListingSidebarUpdate } from "@web/src/lib/domain/listing/sidebarEvents";
import type { ListingContentSubcategory } from "@shared/types/models";
import type { ListingCreateMediaTab } from "@web/src/components/listings/create/shared/constants";

export function useListingCreateEffects(params: {
  listingId: string;
  pathname: string;
  replaceUrl: (url: string) => void;
  activeMediaTab: ListingCreateMediaTab;
  activeSubcategory: ListingContentSubcategory;
  initialMediaTab: ListingCreateMediaTab;
  initialSubcategory: ListingContentSubcategory;
  activeMediaItemsLength: number;
  isGenerating: boolean;
  generationError: string | null;
  templateRenderError: string | null;
  generateSubcategoryContent: (
    subcategory: ListingContentSubcategory,
    options?: { forceNewBatch?: boolean }
  ) => Promise<void>;
}) {
  const {
    listingId,
    pathname,
    replaceUrl,
    activeMediaTab,
    activeSubcategory,
    initialMediaTab,
    initialSubcategory,
    activeMediaItemsLength,
    isGenerating,
    generationError,
    templateRenderError,
    generateSubcategoryContent
  } = params;

  const hasHandledInitialAutoGenerateRef = React.useRef(false);
  const lastToastedErrorRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    emitListingSidebarUpdate({
      id: listingId,
      listingStage: "create",
      lastOpenedAt: new Date().toISOString()
    });
  }, [listingId]);

  React.useEffect(() => {
    const next = new URLSearchParams(window.location.search);
    const mediaTypeParam = activeMediaTab === "images" ? "photos" : "videos";
    const filterParam = activeSubcategory;
    const currentMediaType = next.get("mediaType");
    const currentFilter = next.get("filter");

    if (currentMediaType === mediaTypeParam && currentFilter === filterParam) {
      return;
    }

    next.set("mediaType", mediaTypeParam);
    next.set("filter", filterParam);

    const query = next.toString();
    replaceUrl(query ? `${pathname}?${query}` : pathname);
  }, [activeMediaTab, activeSubcategory, pathname, replaceUrl]);

  React.useEffect(() => {
    if (hasHandledInitialAutoGenerateRef.current) {
      return;
    }
    if (isGenerating) {
      return;
    }
    if (
      activeMediaTab !== initialMediaTab ||
      activeSubcategory !== initialSubcategory
    ) {
      return;
    }
    if (process.env.NODE_ENV === "development") {
      hasHandledInitialAutoGenerateRef.current = true;
      return;
    }

    hasHandledInitialAutoGenerateRef.current = true;
    if (activeMediaItemsLength === 0) {
      void generateSubcategoryContent(activeSubcategory);
    }
  }, [
    activeMediaItemsLength,
    activeMediaTab,
    activeSubcategory,
    generateSubcategoryContent,
    initialMediaTab,
    initialSubcategory,
    isGenerating
  ]);

  React.useEffect(() => {
    const message = generationError ?? templateRenderError ?? null;
    if (message && message !== lastToastedErrorRef.current) {
      lastToastedErrorRef.current = message;
      toast.error(message);
    }
    if (!message) {
      lastToastedErrorRef.current = null;
    }
  }, [generationError, templateRenderError]);
}

