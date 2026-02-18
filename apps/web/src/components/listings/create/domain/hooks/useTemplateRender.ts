import * as React from "react";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import type { ListingTemplateRenderResult } from "@web/src/lib/domain/media/templateRender/types";
import type { ListingContentSubcategory } from "@shared/types/models";
import {
  buildTemplateRenderCaptionItems,
  mapTemplateRenderItemsToPreviewItems
} from "@web/src/components/listings/create/domain/listingCreateUtils";
import type { ListingImagePreviewItem } from "@web/src/components/listings/create/shared/types";
import {
  GENERATED_BATCH_SIZE,
  type ListingCreateMediaTab
} from "@web/src/components/listings/create/shared/constants";

type UseTemplateRenderParams = {
  listingId: string;
  activeSubcategory: ListingContentSubcategory;
  activeMediaTab: ListingCreateMediaTab;
  captionItems: ContentItem[];
  isGenerating: boolean;
};

type UseTemplateRenderResult = {
  previewItems: ListingImagePreviewItem[];
  isRendering: boolean;
  renderError: string | null;
};

export function useTemplateRender(
  params: UseTemplateRenderParams
): UseTemplateRenderResult {
  const {
    listingId,
    activeSubcategory,
    activeMediaTab,
    captionItems,
    isGenerating
  } = params;

  const [previewItems, setPreviewItems] = React.useState<
    ListingImagePreviewItem[]
  >([]);
  const [isRendering, setIsRendering] = React.useState(false);
  const [renderError, setRenderError] = React.useState<string | null>(null);
  const [isTemplateRenderingUnavailable, setIsTemplateRenderingUnavailable] =
    React.useState(false);
  const requestRef = React.useRef(0);

  React.useEffect(() => {
    setIsTemplateRenderingUnavailable(false);
  }, [listingId]);

  React.useEffect(() => {
    if (activeMediaTab !== "images") {
      setIsRendering(false);
      setRenderError(null);
      setPreviewItems([]);
      return;
    }
    if (isGenerating) {
      return;
    }

    const templateCaptionItems = buildTemplateRenderCaptionItems(captionItems);
    if (templateCaptionItems.length === 0) {
      setPreviewItems([]);
      setRenderError(null);
      return;
    }
    if (isTemplateRenderingUnavailable) {
      setIsRendering(false);
      setRenderError("Template rendering is unavailable. Showing fallback.");
      setPreviewItems([]);
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setIsRendering(true);
    setRenderError(null);
    const controller = new AbortController();

    void fetch(`/api/v1/listings/${listingId}/templates/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subcategory: activeSubcategory,
        captionItems: templateCaptionItems.slice(0, GENERATED_BATCH_SIZE),
        templateCount: GENERATED_BATCH_SIZE
      }),
      cache: "no-store",
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            (payload as { message?: string }).message ??
              "Failed to render templates"
          );
        }
        return response.json() as Promise<ListingTemplateRenderResult>;
      })
      .then((result) => {
        if (requestRef.current !== requestId) {
          return;
        }
        const mapped = mapTemplateRenderItemsToPreviewItems({
          renderedItems: result.items,
          captionItems: templateCaptionItems
        });
        setPreviewItems(mapped);

        if (mapped.length === 0 && result.failedTemplateIds.length > 0) {
          setRenderError("Failed to render templates. Showing fallback.");
        }
      })
      .catch((error) => {
        if (requestRef.current !== requestId) {
          return;
        }
        if ((error as Error).name === "AbortError") {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Failed to render templates";
        const normalizedMessage = message.toLowerCase();
        if (
          normalizedMessage.includes("api key") ||
          normalizedMessage.includes("must be configured")
        ) {
          setIsTemplateRenderingUnavailable(true);
        }
        setRenderError(message);
        setPreviewItems([]);
      })
      .finally(() => {
        if (requestRef.current === requestId) {
          setIsRendering(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [
    captionItems,
    activeMediaTab,
    activeSubcategory,
    isTemplateRenderingUnavailable,
    isGenerating,
    listingId
  ]);

  return { previewItems, isRendering, renderError };
}
