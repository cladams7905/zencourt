import * as React from "react";
import type { ContentItem } from "../../../dashboard/ContentGrid";
import type { ListingImagePreviewItem } from "./../ListingImagePreviewGrid";
import type { ListingOrshotRenderResult } from "@web/src/lib/orshot/types";
import type { ListingContentSubcategory } from "@shared/types/models";
import type { ListingCreateMediaTab } from "./../ListingCreateView";
import {
  buildOrshotCaptionItems,
  mapOrshotItemsToPreviewItems
} from "./listingCreateUtils";

const GENERATED_BATCH_SIZE = 4;
let orshotDisabledForSession = false;

export function useOrshotRender(params: {
  listingId: string;
  activeSubcategory: ListingContentSubcategory;
  activeMediaTab: ListingCreateMediaTab;
  captionItems: ContentItem[];
  isGenerating: boolean;
}): {
  previewItems: ListingImagePreviewItem[];
  isRendering: boolean;
  renderError: string | null;
} {
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
  const requestRef = React.useRef(0);

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

    const orshotCaptionItems = buildOrshotCaptionItems(captionItems);
    if (orshotCaptionItems.length === 0) {
      setPreviewItems([]);
      setRenderError(null);
      return;
    }
    if (orshotDisabledForSession) {
      setRenderError("Orshot is unavailable. Showing fallback.");
      setPreviewItems([]);
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setIsRendering(true);
    setRenderError(null);

    void fetch(`/api/v1/listings/${listingId}/orshot/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subcategory: activeSubcategory,
        captionItems: orshotCaptionItems.slice(0, GENERATED_BATCH_SIZE),
        templateCount: GENERATED_BATCH_SIZE
      }),
      cache: "no-store"
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            (payload as { message?: string }).message ??
              "Failed to render Orshot templates"
          );
        }
        return response.json() as Promise<ListingOrshotRenderResult>;
      })
      .then((result) => {
        if (requestRef.current !== requestId) {
          return;
        }
        const mapped = mapOrshotItemsToPreviewItems({
          renderedItems: result.items,
          captionItems: orshotCaptionItems
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
        const message =
          error instanceof Error
            ? error.message
            : "Failed to render Orshot templates";
        if (message.includes("ORSHOT_API_KEY")) {
          orshotDisabledForSession = true;
        }
        setRenderError(message);
        setPreviewItems([]);
      })
      .finally(() => {
        if (requestRef.current === requestId) {
          setIsRendering(false);
        }
      });
  }, [
    captionItems,
    activeMediaTab,
    activeSubcategory,
    isGenerating,
    listingId
  ]);

  return { previewItems, isRendering, renderError };
}
