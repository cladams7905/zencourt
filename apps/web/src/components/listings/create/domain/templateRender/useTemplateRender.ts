import * as React from "react";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import type { ListingContentSubcategory } from "@shared/types/models";
import {
  buildTemplateRenderCaptionItems,
  getCachedPreviewsFromCaptionItems,
  mapSingleTemplateRenderItemToPreviewItem
} from "@web/src/components/listings/create/domain/listingCreateUtils";
import type { TemplateRenderCaptionItemInput } from "@web/src/lib/domain/media/templateRender/types";
import type { ListingImagePreviewItem } from "@web/src/components/listings/create/shared/types";
import { fetchStreamResponse } from "@web/src/lib/core/http/client";
import { streamTemplateRenderEvents } from "./streamEvents";
import type { ListingCreateMediaTab } from "@web/src/components/listings/create/shared/constants";

type UseTemplateRenderParams = {
  listingId: string;
  activeSubcategory: ListingContentSubcategory;
  activeMediaTab: ListingCreateMediaTab;
  captionItems: ContentItem[];
  isGenerating: boolean;
  /** When set (e.g. dev single-template), render stream uses this template id. Cleared after request. */
  templateIdForRender?: string;
  clearTemplateIdForRender?: () => void;
};

type UseTemplateRenderResult = {
  previewItems: ListingImagePreviewItem[];
  isRendering: boolean;
  renderError: string | null;
  isTemplateRenderingUnavailable: boolean;
};

export type ResetReason =
  | "not_images"
  | "generating"
  | "no_items"
  | "unavailable"
  | "nothing_to_render";

/**
 * Stable key for the first N caption item ids we consider for template render.
 * Used so the effect does not re-run on captionItems ref change alone.
 */
function captionItemIdsKey(
  captionItems: { id: string }[],
  max: number
): string {
  return captionItems
    .slice(0, max)
    .map((c) => c.id)
    .join(",");
}

function getCaptionItemsNeedingRender<T extends { id: string }>(
  consideredIdsKey: string,
  templateCaptionItems: T[],
  previewItems: { captionItemId?: string | null }[]
): T[] {
  const consideredIds = consideredIdsKey
    ? consideredIdsKey.split(",").filter(Boolean)
    : [];
  const idsWeHave = new Set(
    previewItems.map((p) => p.captionItemId).filter(Boolean)
  );
  return templateCaptionItems
    .filter((c) => consideredIds.includes(c.id))
    .filter((c) => !idsWeHave.has(c.id));
}

function filterPreviewItemsForActiveCaptionItems<
  T extends { captionItemId?: string | null }
>(
  previewItems: T[],
  captionItems: { id: string }[]
): T[] {
  if (previewItems.length === 0 || captionItems.length === 0) {
    return [];
  }

  const activeCaptionIds = new Set(captionItems.map((item) => item.id));
  return previewItems.filter((item) => {
    const captionItemId = item.captionItemId?.trim();
    if (!captionItemId) {
      return true;
    }
    return activeCaptionIds.has(captionItemId);
  });
}

function getResetReason(params: {
  activeMediaTab: ListingCreateMediaTab;
  isGenerating: boolean;
  templateCaptionItemCount: number;
  isTemplateRenderingUnavailable: boolean;
  captionItemsNeedingRenderCount: number;
}): ResetReason | null {
  const {
    activeMediaTab,
    isGenerating,
    templateCaptionItemCount,
    isTemplateRenderingUnavailable,
    captionItemsNeedingRenderCount
  } = params;
  if (activeMediaTab !== "images") return "not_images";
  if (isGenerating) return "generating";
  if (templateCaptionItemCount === 0) return "no_items";
  if (isTemplateRenderingUnavailable) return "unavailable";
  if (captionItemsNeedingRenderCount === 0) return "nothing_to_render";
  return null;
}

function applyResetReason(
  reason: ResetReason,
  setters: {
    setPreviewItems: React.Dispatch<React.SetStateAction<ListingImagePreviewItem[]>>;
    setRenderError: React.Dispatch<React.SetStateAction<string | null>>;
    setIsRendering: React.Dispatch<React.SetStateAction<boolean>>;
  }
): void {
  switch (reason) {
    case "not_images":
      setters.setPreviewItems([]);
      setters.setRenderError(null);
      setters.setIsRendering(false);
      break;
    case "generating":
      break;
    case "no_items":
      setters.setPreviewItems([]);
      setters.setRenderError(null);
      break;
    case "unavailable":
      setters.setPreviewItems([]);
      setters.setRenderError(
        "Template rendering is unavailable. Showing fallback."
      );
      setters.setIsRendering(false);
      break;
    case "nothing_to_render":
      setters.setIsRendering(false);
      break;
  }
}

async function runTemplateRenderRequest(params: {
  listingId: string;
  activeSubcategory: ListingContentSubcategory;
  captionItemsNeedingRender: TemplateRenderCaptionItemInput[];
  templateCaptionItems: TemplateRenderCaptionItemInput[];
  initialPreviewCount: number;
  requestId: number;
  requestRef: React.MutableRefObject<number>;
  signal: AbortSignal;
  setPreviewItems: React.Dispatch<React.SetStateAction<ListingImagePreviewItem[]>>;
  setRenderError: React.Dispatch<React.SetStateAction<string | null>>;
  templateIdForRender?: string;
  clearTemplateIdForRender?: () => void;
}): Promise<void> {
  const {
    listingId,
    activeSubcategory,
    captionItemsNeedingRender,
    templateCaptionItems,
    initialPreviewCount,
    requestId,
    requestRef,
    signal,
    setPreviewItems,
    setRenderError,
    templateIdForRender,
    clearTemplateIdForRender
  } = params;

  const body: {
    subcategory: ListingContentSubcategory;
    captionItems: TemplateRenderCaptionItemInput[];
    templateCount: number;
    templateId?: string;
  } = {
    subcategory: activeSubcategory,
    captionItems: captionItemsNeedingRender,
    templateCount: templateIdForRender ? 1 : captionItemsNeedingRender.length
  };
  if (templateIdForRender?.trim()) {
    body.templateId = templateIdForRender.trim();
  }

  const response = await fetchStreamResponse(
    `/api/v1/listings/${listingId}/templates/render/stream`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal
    },
    "Failed to render templates"
  );

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Streaming response not available");
  }

  let appendedCount = 0;

  for await (const event of streamTemplateRenderEvents(reader)) {
    if (requestRef.current !== requestId) return;

    if (event.type === "item") {
      const variationNumber = initialPreviewCount + appendedCount + 1;
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

  clearTemplateIdForRender?.();
}

function handleTemplateRenderRequestError(params: {
  error: unknown;
  requestId: number;
  requestRef: React.MutableRefObject<number>;
  setRenderError: React.Dispatch<React.SetStateAction<string | null>>;
  setIsTemplateRenderingUnavailable: React.Dispatch<React.SetStateAction<boolean>>;
}): void {
  const {
    error,
    requestId,
    requestRef,
    setRenderError,
    setIsTemplateRenderingUnavailable
  } = params;

  if (requestRef.current !== requestId) return;
  if ((error as Error).name === "AbortError") return;

  const message =
    error instanceof Error ? error.message : "Failed to render templates";
  const normalizedMessage = message.toLowerCase();
  if (
    normalizedMessage.includes("api key") ||
    normalizedMessage.includes("must be configured")
  ) {
    setIsTemplateRenderingUnavailable(true);
  }
  setRenderError(message);
}

export function useTemplateRender(
  params: UseTemplateRenderParams
): UseTemplateRenderResult {
  const {
    listingId,
    activeSubcategory,
    activeMediaTab,
    captionItems,
    isGenerating,
    templateIdForRender,
    clearTemplateIdForRender
  } = params;

  const [previewItemsBySubcategory, setPreviewItemsBySubcategory] =
    React.useState<Record<string, ListingImagePreviewItem[]>>({});
  const [isRendering, setIsRendering] = React.useState(false);
  const [renderError, setRenderError] = React.useState<string | null>(null);
  const [isTemplateRenderingUnavailable, setIsTemplateRenderingUnavailable] =
    React.useState(false);
  const requestRef = React.useRef(0);

  const cachedPreviews = React.useMemo(
    () => getCachedPreviewsFromCaptionItems(captionItems),
    [captionItems]
  );

  const templateCaptionItems = React.useMemo(
    () => buildTemplateRenderCaptionItems(captionItems),
    [captionItems]
  );

  const streamedPreviews = React.useMemo(() => {
    const previews = previewItemsBySubcategory[activeSubcategory] ?? [];
    return filterPreviewItemsForActiveCaptionItems(previews, templateCaptionItems);
  }, [activeSubcategory, previewItemsBySubcategory, templateCaptionItems]);

  const previewItems = [...cachedPreviews, ...streamedPreviews];

  const setPreviewItemsForCurrentSubcategory = React.useCallback(
    (updater: React.SetStateAction<ListingImagePreviewItem[]>) => {
      setPreviewItemsBySubcategory((prev) => {
        const current = prev[activeSubcategory] ?? [];
        const next =
          typeof updater === "function" ? updater(current) : updater;
        return { ...prev, [activeSubcategory]: next };
      });
    },
    [activeSubcategory]
  );

  React.useEffect(() => {
    setIsTemplateRenderingUnavailable(false);
  }, [listingId]);

  React.useEffect(() => {
    setPreviewItemsBySubcategory({});
  }, [listingId]);

  const consideredIdsKey = captionItemIdsKey(
    templateCaptionItems,
    templateCaptionItems.length
  );

  React.useEffect(() => {
    setPreviewItemsForCurrentSubcategory((prev) => {
      const filtered = filterPreviewItemsForActiveCaptionItems(
        prev,
        templateCaptionItems
      );
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [setPreviewItemsForCurrentSubcategory, templateCaptionItems]);

  React.useEffect(() => {
    const captionItemsNeedingRender = getCaptionItemsNeedingRender(
      consideredIdsKey,
      templateCaptionItems,
      previewItems
    );

    const resetReason = getResetReason({
      activeMediaTab,
      isGenerating,
      templateCaptionItemCount: templateCaptionItems.length,
      isTemplateRenderingUnavailable,
      captionItemsNeedingRenderCount: captionItemsNeedingRender.length
    });

    if (resetReason !== null) {
      applyResetReason(resetReason, {
        setPreviewItems: setPreviewItemsForCurrentSubcategory,
        setRenderError,
        setIsRendering
      });
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setIsRendering(true);
    setRenderError(null);
    const controller = new AbortController();

    void (async () => {
      try {
        await runTemplateRenderRequest({
          listingId,
          activeSubcategory,
          captionItemsNeedingRender,
          templateCaptionItems,
          initialPreviewCount: previewItems.length,
          requestId,
          requestRef,
          signal: controller.signal,
          setPreviewItems: setPreviewItemsForCurrentSubcategory,
          setRenderError,
          templateIdForRender,
          clearTemplateIdForRender
        });
      } catch (error) {
        handleTemplateRenderRequestError({
          error,
          requestId,
          requestRef,
          setRenderError,
          setIsTemplateRenderingUnavailable
        });
      } finally {
        if (requestRef.current === requestId) {
          setIsRendering(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- previewItems omitted to avoid re-running when stream appends
  }, [
    listingId,
    activeSubcategory,
    activeMediaTab,
    isTemplateRenderingUnavailable,
    isGenerating,
    consideredIdsKey,
    templateCaptionItems,
    setPreviewItemsForCurrentSubcategory,
    templateIdForRender,
    clearTemplateIdForRender
  ]);

  return {
    previewItems,
    isRendering,
    renderError,
    isTemplateRenderingUnavailable
  };
}
