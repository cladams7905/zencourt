import * as React from "react";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import type { ListingContentSubcategory } from "@shared/types/models";
import {
  buildTemplateRenderCaptionItems,
  mapSingleTemplateRenderItemToPreviewItem
} from "@web/src/components/listings/create/domain/listingCreateUtils";
import type { ListingImagePreviewItem } from "@web/src/components/listings/create/shared/types";
import { streamTemplateRenderEvents } from "./streamEvents";
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
  isTemplateRenderingUnavailable: boolean;
};

/**
 * Stable key for the first N caption item ids we consider for template render.
 * Used so the effect does not re-run on captionItems ref change alone.
 */
function captionItemIdsKey(captionItems: { id: string }[], max: number): string {
  return captionItems
    .slice(0, max)
    .map((c) => c.id)
    .join(",");
}

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
    setPreviewItems([]);
  }, [listingId, activeSubcategory]);

  const templateCaptionItems = React.useMemo(
    () => buildTemplateRenderCaptionItems(captionItems),
    [captionItems]
  );

  const consideredIdsKey = captionItemIdsKey(
    templateCaptionItems,
    Math.max(GENERATED_BATCH_SIZE, templateCaptionItems?.length ?? 0)
  );

  React.useEffect(() => {
    const consideredIds = consideredIdsKey
      ? consideredIdsKey.split(",").filter(Boolean)
      : [];
    const idsWeHave = new Set(
      previewItems.map((p) => p.captionItemId).filter(Boolean)
    );
    const captionItemsNeedingRender = templateCaptionItems.filter((c) =>
      consideredIds.includes(c.id)
    ).filter((c) => !idsWeHave.has(c.id));

    if (activeMediaTab !== "images") {
      setIsRendering(false);
      setRenderError(null);
      setPreviewItems([]);
      return;
    }
    if (isGenerating) {
      return;
    }
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

    if (captionItemsNeedingRender.length === 0) {
      setIsRendering(false);
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setIsRendering(true);
    setRenderError(null);
    const controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch(
          `/api/v1/listings/${listingId}/templates/render/stream`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subcategory: activeSubcategory,
              captionItems: captionItemsNeedingRender,
              templateCount: captionItemsNeedingRender.length
            }),
            cache: "no-store",
            signal: controller.signal
          }
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            (payload as { message?: string }).message ??
              "Failed to render templates"
          );
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Streaming response not available");
        }

        let appendedCount = 0;

        for await (const event of streamTemplateRenderEvents(reader)) {
          if (requestRef.current !== requestId) {
            return;
          }

          if (event.type === "item") {
            const variationNumber = previewItems.length + appendedCount + 1;
            const newItem = mapSingleTemplateRenderItemToPreviewItem({
              renderedItem: event.item,
              captionItems: templateCaptionItems,
              variationNumber
            });
            appendedCount += 1;
            setPreviewItems((prev) => [...prev, newItem]);
          }

          if (event.type === "error") {
            setRenderError(event.message);
            break;
          }

          if (event.type === "done") {
            if (
              appendedCount === 0 &&
              event.failedTemplateIds &&
              event.failedTemplateIds.length > 0
            ) {
              setRenderError("Failed to render templates. Showing fallback.");
            }
            break;
          }
        }
      } catch (error) {
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
      } finally {
        if (requestRef.current === requestId) {
          setIsRendering(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [
    listingId,
    activeSubcategory,
    activeMediaTab,
    isTemplateRenderingUnavailable,
    isGenerating,
    consideredIdsKey,
    templateCaptionItems
  ]);

  return {
    previewItems,
    isRendering,
    renderError,
    isTemplateRenderingUnavailable
  };
}
