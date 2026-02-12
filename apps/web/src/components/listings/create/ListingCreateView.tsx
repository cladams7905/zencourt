"use client";

import * as React from "react";
import { ListingViewHeader } from "../ListingViewHeader";
import {
  type ContentItem,
  type TextOverlayInput
} from "../../dashboard/ContentGrid";
import { emitListingSidebarUpdate } from "@web/src/lib/listingSidebarEvents";
import { usePathname, useRouter } from "next/navigation";
import {
  buildPreviewTimelinePlan,
  type PreviewTimelineClip,
  type PreviewTimelinePlan
} from "@web/src/lib/video/previewTimeline";
import { ListingTimelinePreviewGrid } from "./ListingTimelinePreviewGrid";
import {
  ListingImagePreviewGrid,
  type ListingImagePreviewItem
} from "./ListingImagePreviewGrid";
import { cn } from "../../ui/utils";
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../../ui/dropdown-menu";
import {
  Camera,
  ChevronDown,
  Clapperboard,
  RefreshCw,
  Settings
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { toast } from "sonner";
import {
  LISTING_CONTENT_SUBCATEGORIES,
  type ListingContentSubcategory
} from "@shared/types/models";

type ListingCreateViewProps = {
  listingId: string;
  title: string;
  listingAddress?: string | null;
  videoItems: ContentItem[];
  listingPostItems: ContentItem[];
  listingImages: ListingCreateImage[];
  initialMediaTab?: ListingCreateMediaTab;
  initialSubcategory?: ListingContentSubcategory;
};

const SUBCATEGORY_LABELS: Record<ListingContentSubcategory, string> = {
  new_listing: "New Listing",
  open_house: "Open House",
  price_change: "Price Change",
  status_update: "Status Update",
  property_features: "Property Features"
};

type PreviewClipCandidate = PreviewTimelineClip & {
  searchableText: string;
};
export type ListingCreateMediaTab = "videos" | "images";
type ListingCreateImage = {
  id: string;
  url: string;
  category: string | null;
  isPrimary: boolean;
  primaryScore: number | null;
  uploadedAtMs: number;
};

const MEDIA_TAB_LABELS: Record<ListingCreateMediaTab, string> = {
  videos: "Videos",
  images: "Photos"
};

const GENERATED_BATCH_SIZE = 4;
const INITIAL_SKELETON_HOLD_MS = 350;

const createBatchId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

function extractJsonItemsFromStream(text: string) {
  const items: {
    hook: string;
    body?: { header: string; content: string; broll_query?: string }[] | null;
    caption?: string | null;
    broll_query?: string | null;
  }[] = [];

  let arrayStarted = false;
  let inString = false;
  let escape = false;
  let braceDepth = 0;
  let objectStart = -1;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (!arrayStarted) {
      if (char === "[") {
        arrayStarted = true;
      }
      continue;
    }

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (braceDepth === 0) {
        objectStart = i;
      }
      braceDepth += 1;
    } else if (char === "}") {
      braceDepth -= 1;
      if (braceDepth === 0 && objectStart >= 0) {
        const objectText = text.slice(objectStart, i + 1);
        try {
          const parsed = JSON.parse(objectText);
          if (parsed && typeof parsed === "object") {
            items.push(parsed);
          }
        } catch {
          // Ignore incomplete/invalid JSON objects
        }
        objectStart = -1;
      }
    }
  }

  return items;
}

const FEATURE_KEYWORDS = [
  "kitchen",
  "countertop",
  "granite",
  "pantry",
  "breakfast bar",
  "island",
  "bedroom",
  "bathroom",
  "tub",
  "shower",
  "closet",
  "laundry",
  "den",
  "office",
  "living room",
  "great room",
  "open concept",
  "hardwood",
  "porch",
  "deck",
  "yard",
  "firepit",
  "shed",
  "garage",
  "exterior",
  "acre",
  "lot",
  "suite"
];

function buildFeatureNeedle(item: ContentItem): string {
  const bodyText = (item.body ?? [])
    .map(
      (slide) =>
        `${slide.header ?? ""} ${slide.content ?? ""} ${slide.broll_query ?? ""}`
    )
    .join(" ");
  return `${item.hook ?? ""} ${item.caption ?? ""} ${item.brollQuery ?? ""} ${bodyText}`
    .toLowerCase()
    .replace(/[^\w\s]/g, " ");
}

function filterFeatureClips(
  clips: PreviewClipCandidate[],
  captionItem: ContentItem
): PreviewClipCandidate[] {
  const needle = buildFeatureNeedle(captionItem);
  const matchedKeywords = FEATURE_KEYWORDS.filter((keyword) =>
    needle.includes(keyword)
  );

  if (matchedKeywords.length === 0) {
    return clips;
  }

  const matched = clips.filter((clip) =>
    matchedKeywords.some((keyword) => clip.searchableText.includes(keyword))
  );

  if (matched.length >= 2) {
    return matched;
  }

  if (matched.length === 1 && clips.length > 1) {
    const fallback = clips.find((clip) => clip.id !== matched[0]?.id);
    return fallback ? [matched[0], fallback] : matched;
  }

  return clips;
}

function resolveContentMediaType(item: ContentItem): "video" | "image" {
  return item.mediaType === "image" ? "image" : "video";
}

function isSimpleTextOverlayTemplate(
  overlay?: TextOverlayInput | null
): boolean {
  if (!overlay) {
    return true;
  }
  return !overlay.accent_top?.trim() && !overlay.accent_bottom?.trim();
}

function hasAnyNonSimpleOverlayTemplate(item: ContentItem): boolean {
  if (!item.body || item.body.length === 0) {
    return true;
  }
  const overlays = item.body
    .map((slide) => slide.text_overlay ?? null)
    .filter(Boolean);
  if (overlays.length === 0) {
    return true;
  }
  return overlays.some((overlay) => !isSimpleTextOverlayTemplate(overlay));
}

function buildImageNeedle(item: ContentItem): string {
  const bodyText = (item.body ?? [])
    .map(
      (slide) =>
        `${slide.header ?? ""} ${slide.content ?? ""} ${slide.broll_query ?? ""}`
    )
    .join(" ");
  return `${item.hook ?? ""} ${item.caption ?? ""} ${item.brollQuery ?? ""} ${bodyText}`
    .toLowerCase()
    .replace(/[^\w\s]/g, " ");
}

function rankListingImagesForItem(
  images: ListingCreateImage[],
  item: ContentItem
): ListingCreateImage[] {
  const needle = buildImageNeedle(item);
  return [...images].sort((a, b) => {
    const aPrimary = a.isPrimary ? 1 : 0;
    const bPrimary = b.isPrimary ? 1 : 0;
    if (aPrimary !== bPrimary) {
      return bPrimary - aPrimary;
    }

    const aCategoryMatch =
      a.category && needle.includes(a.category.toLowerCase()) ? 1 : 0;
    const bCategoryMatch =
      b.category && needle.includes(b.category.toLowerCase()) ? 1 : 0;
    if (aCategoryMatch !== bCategoryMatch) {
      return bCategoryMatch - aCategoryMatch;
    }

    const aScore = a.primaryScore ?? -Infinity;
    const bScore = b.primaryScore ?? -Infinity;
    if (aScore !== bScore) {
      return bScore - aScore;
    }

    return b.uploadedAtMs - a.uploadedAtMs;
  });
}

export function ListingCreateView({
  listingId,
  title,
  listingAddress,
  videoItems,
  listingPostItems,
  listingImages,
  initialMediaTab = "videos",
  initialSubcategory = LISTING_CONTENT_SUBCATEGORIES[0]
}: ListingCreateViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const filterSentinelRef = React.useRef<HTMLDivElement | null>(null);
  const filterTagsRef = React.useRef<HTMLDivElement | null>(null);
  const [isFilterStickyActive, setIsFilterStickyActive] = React.useState(false);
  const [tagScrollFade, setTagScrollFade] = React.useState<
    "none" | "right" | "left" | "both"
  >("none");
  const [activeMediaTab, setActiveMediaTab] =
    React.useState<ListingCreateMediaTab>(initialMediaTab);
  const [activeSubcategory, setActiveSubcategory] =
    React.useState<ListingContentSubcategory>(initialSubcategory);
  const [localPostItems, setLocalPostItems] =
    React.useState<ContentItem[]>(listingPostItems);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [activeBatchStreamedCount, setActiveBatchStreamedCount] =
    React.useState(0);
  const [holdInitialSkeletons, setHoldInitialSkeletons] = React.useState(false);
  const [incompleteBatchSkeletonCount, setIncompleteBatchSkeletonCount] =
    React.useState(0);
  const [generationError, setGenerationError] = React.useState<string | null>(
    null
  );
  const streamBufferRef = React.useRef("");
  const parsedItemsRef = React.useRef<
    {
      hook: string;
      body?: { header: string; content: string; broll_query?: string }[] | null;
      caption?: string | null;
      broll_query?: string | null;
    }[]
  >([]);
  const activeControllerRef = React.useRef<AbortController | null>(null);
  const initialSkeletonHoldTimeoutRef = React.useRef<number | null>(null);
  const activeBatchIdRef = React.useRef<string>("");
  const activeBatchItemIdsRef = React.useRef<string[]>([]);

  React.useEffect(() => {
    emitListingSidebarUpdate({
      id: listingId,
      listingStage: "create",
      lastOpenedAt: new Date().toISOString()
    });
  }, [listingId]);

  React.useEffect(() => {
    setLocalPostItems(listingPostItems);
  }, [listingPostItems]);

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
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false
    });
  }, [activeMediaTab, activeSubcategory, pathname, router]);

  const createGenerationNonce = React.useCallback(() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }, []);

  const generateSubcategoryContent = React.useCallback(
    async (
      subcategory: ListingContentSubcategory,
      options?: { forceNewBatch?: boolean }
    ) => {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
      const controller = new AbortController();
      activeControllerRef.current = controller;
      activeBatchIdRef.current = createBatchId();
      activeBatchItemIdsRef.current = [];
      setIsGenerating(true);
      setActiveBatchStreamedCount(0);
      setIncompleteBatchSkeletonCount(0);
      setHoldInitialSkeletons(true);
      if (initialSkeletonHoldTimeoutRef.current !== null) {
        window.clearTimeout(initialSkeletonHoldTimeoutRef.current);
      }
      initialSkeletonHoldTimeoutRef.current = window.setTimeout(() => {
        setHoldInitialSkeletons(false);
        initialSkeletonHoldTimeoutRef.current = null;
      }, INITIAL_SKELETON_HOLD_MS);
      setGenerationError(null);
      streamBufferRef.current = "";
      parsedItemsRef.current = [];

      const resolvedMediaType: "video" | "image" =
        activeMediaTab === "videos" ? "video" : "image";

      try {
        const response = await fetch(
          `/api/v1/listings/${listingId}/content/generate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subcategory,
              media_type: resolvedMediaType,
              focus: SUBCATEGORY_LABELS[subcategory],
              generation_nonce: options?.forceNewBatch
                ? createGenerationNonce()
                : ""
            }),
            signal: controller.signal
          }
        );

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(
            (errorPayload as { message?: string }).message ||
              "Failed to generate listing post content"
          );
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Streaming response not available");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let didReceiveDone = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part
              .split("\n")
              .find((entry) => entry.startsWith("data:"));
            if (!line) continue;

            const payload = line.replace(/^data:\s*/, "");
            if (!payload) continue;

            const event = JSON.parse(payload) as
              | { type: "delta"; text: string }
              | {
                  type: "done";
                  items: {
                    hook: string;
                    body?:
                      | {
                          header: string;
                          content: string;
                          broll_query?: string | null;
                        }[]
                      | null;
                    caption?: string | null;
                    broll_query?: string | null;
                  }[];
                }
              | { type: "error"; message: string };

            if (event.type === "delta") {
              streamBufferRef.current += event.text;
              const parsedItems = extractJsonItemsFromStream(
                streamBufferRef.current
              );

              if (parsedItems.length > parsedItemsRef.current.length) {
                parsedItemsRef.current = parsedItems;

                const streamedContentItems: ContentItem[] = parsedItems.map(
                  (item, absoluteIndex) => {
                    const id =
                      activeBatchItemIdsRef.current[absoluteIndex] ??
                      `generated-${activeBatchIdRef.current}-${absoluteIndex}`;
                    activeBatchItemIdsRef.current[absoluteIndex] = id;
                    return {
                      id,
                      aspectRatio: "square" as const,
                      isFavorite: false,
                      hook: item.hook,
                      caption: item.caption ?? null,
                      body: item.body ?? null,
                      brollQuery: item.broll_query ?? null,
                      listingSubcategory: subcategory,
                      mediaType: resolvedMediaType
                    };
                  }
                );

                setLocalPostItems((prev) => {
                  const currentBatchIds = new Set(activeBatchItemIdsRef.current);
                  const withoutCurrentBatch = prev.filter(
                    (item) => !currentBatchIds.has(item.id)
                  );
                  return [...withoutCurrentBatch, ...streamedContentItems];
                });
                setActiveBatchStreamedCount(
                  Math.min(GENERATED_BATCH_SIZE, parsedItems.length)
                );
              }
            }

            if (event.type === "error") {
              throw new Error(event.message);
            }

            if (event.type === "done") {
              didReceiveDone = true;
              setActiveBatchStreamedCount(
                Math.min(GENERATED_BATCH_SIZE, event.items.length)
              );
              const missingCount = Math.max(
                0,
                GENERATED_BATCH_SIZE - event.items.length
              );
              if (missingCount > 0) {
                setIncompleteBatchSkeletonCount(missingCount);
                setGenerationError("sorry, an error occurred. Please retry.");
                toast.error("Sorry, an error occurred. Please retry.");
              }
              // Replace streamed items with the final set from the done event.
              const finalItems: ContentItem[] = event.items.map((item, index) => {
                const id =
                  activeBatchItemIdsRef.current[index] ??
                  `generated-${activeBatchIdRef.current}-${index}`;
                return {
                  id,
                  aspectRatio: "square" as const,
                  isFavorite: false,
                  hook: item.hook,
                  caption: item.caption ?? null,
                  body: item.body ?? null,
                  brollQuery: item.broll_query ?? null,
                  listingSubcategory: subcategory,
                  mediaType: resolvedMediaType
                };
              });

              setLocalPostItems((prev) => {
                const currentBatchIds = new Set(activeBatchItemIdsRef.current);
                const withoutCurrentBatch = prev.filter(
                  (item) => !currentBatchIds.has(item.id)
                );
                if (!options?.forceNewBatch) {
                  const existingIds = new Set(
                    withoutCurrentBatch.map((item) => item.id)
                  );
                  const unique = finalItems.filter(
                    (item) => !existingIds.has(item.id)
                  );
                  return unique.length > 0
                    ? [...withoutCurrentBatch, ...unique]
                    : withoutCurrentBatch;
                }
                return [...withoutCurrentBatch, ...finalItems];
              });
            }
          }
        }

        if (!didReceiveDone) {
          throw new Error("Stream ended before completing output.");
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          setLocalPostItems((prev) => {
            const currentBatchIds = new Set(activeBatchItemIdsRef.current);
            return prev.filter((item) => !currentBatchIds.has(item.id));
          });
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Failed to generate listing content.";
        setGenerationError(message);
        toast.error(message);
        setIncompleteBatchSkeletonCount(GENERATED_BATCH_SIZE);
        // Clean up any streamed items on error.
        setLocalPostItems((prev) => {
          const currentBatchIds = new Set(activeBatchItemIdsRef.current);
          return prev.filter((item) => !currentBatchIds.has(item.id));
        });
      } finally {
        if (activeControllerRef.current === controller) {
          activeControllerRef.current = null;
        }
        if (initialSkeletonHoldTimeoutRef.current !== null) {
          window.clearTimeout(initialSkeletonHoldTimeoutRef.current);
          initialSkeletonHoldTimeoutRef.current = null;
        }
        setHoldInitialSkeletons(false);
        setIsGenerating(false);
        setActiveBatchStreamedCount(0);
        activeBatchIdRef.current = "";
        activeBatchItemIdsRef.current = [];
      }
    },
    [activeMediaTab, createGenerationNonce, listingId]
  );

  React.useEffect(() => {
    return () => {
      if (initialSkeletonHoldTimeoutRef.current !== null) {
        window.clearTimeout(initialSkeletonHoldTimeoutRef.current);
      }
    };
  }, []);

  const activeMediaItems = React.useMemo(
    () =>
      localPostItems.filter(
        (item) =>
          item.listingSubcategory === activeSubcategory &&
          resolveContentMediaType(item) ===
            (activeMediaTab === "videos" ? "video" : "image")
      ),
    [activeMediaTab, activeSubcategory, localPostItems]
  );
  const activeCaptionItems = React.useMemo(
    () =>
      activeMediaTab === "images"
        ? activeMediaItems.filter((item) =>
            hasAnyNonSimpleOverlayTemplate(item)
          )
        : activeMediaItems,
    [activeMediaItems, activeMediaTab]
  );
  React.useEffect(() => {
    setIncompleteBatchSkeletonCount(0);
  }, [activeSubcategory, activeMediaTab]);

  const loadingCount = isGenerating
    ? holdInitialSkeletons
      ? GENERATED_BATCH_SIZE
      : Math.max(0, GENERATED_BATCH_SIZE - activeBatchStreamedCount)
    : incompleteBatchSkeletonCount;

  const activeImagePreviewItems = React.useMemo<
    ListingImagePreviewItem[]
  >(() => {
    if (activeMediaTab !== "images" || activeCaptionItems.length === 0) {
      return [];
    }

    const fallbackSortedImages = [...listingImages].sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) {
        return (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0);
      }
      const scoreDelta =
        (b.primaryScore ?? -Infinity) - (a.primaryScore ?? -Infinity);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return b.uploadedAtMs - a.uploadedAtMs;
    });

    return activeCaptionItems.map((item, index) => {
      const rankedForItem = rankListingImagesForItem(
        fallbackSortedImages,
        item
      );
      const fallbackSlides = [
        {
          id: `${item.id}-slide-fallback`,
          imageUrl:
            rankedForItem[index % rankedForItem.length]?.url ??
            rankedForItem[0]?.url ??
            null,
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
                rankedForItem[slideIndex % rankedForItem.length]?.url ??
                rankedForItem[0]?.url ??
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
  }, [activeCaptionItems, activeMediaTab, listingImages]);
  const activePreviewPlans = React.useMemo(() => {
    if (activeMediaTab !== "videos") {
      return [];
    }

    const clips: PreviewClipCandidate[] = videoItems
      .filter((item) => Boolean(item.videoUrl))
      .map((item) => ({
        id: item.id,
        category: item.category ?? null,
        durationSeconds: item.durationSeconds ?? null,
        isPriorityCategory: item.isPriorityCategory ?? false,
        searchableText: `${item.category ?? ""} ${item.alt ?? ""}`
          .toLowerCase()
          .replace(/[^\w\s]/g, " ")
      }));
    if (clips.length === 0 || activeCaptionItems.length === 0) {
      return [];
    }

    return activeCaptionItems.map((captionItem): PreviewTimelinePlan => {
      const scopedClips =
        activeSubcategory === "property_features"
          ? filterFeatureClips(clips, captionItem)
          : clips;
      return buildPreviewTimelinePlan({
        clips: scopedClips,
        listingId,
        seedKey: `${activeSubcategory}-${captionItem.id}`
      });
    });
  }, [
    activeCaptionItems,
    activeMediaTab,
    activeSubcategory,
    listingId,
    videoItems
  ]);

  React.useEffect(() => {
    if (isGenerating || activeMediaItems.length > 0) {
      return;
    }
    void generateSubcategoryContent(activeSubcategory);
  }, [
    activeMediaItems.length,
    activeSubcategory,
    generateSubcategoryContent,
    isGenerating
  ]);

  React.useEffect(() => {
    const sentinel = filterSentinelRef.current;
    if (!sentinel) {
      return;
    }

    // Find the nearest scrollable ancestor to use as the observer root.
    let root: HTMLElement | null = null;
    let ancestor: HTMLElement | null = sentinel.parentElement;
    while (ancestor) {
      const style = getComputedStyle(ancestor);
      if (style.overflowY === "auto" || style.overflowY === "scroll") {
        root = ancestor;
        break;
      }
      ancestor = ancestor.parentElement;
    }

    // A negative top rootMargin equal to the sticky offset means the
    // sentinel is considered "not intersecting" exactly when the sticky
    // bar starts sticking.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setIsFilterStickyActive(!entry.isIntersecting);
        }
      },
      { root, rootMargin: "-88px 0px 0px 0px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const updateTagScrollFade = React.useCallback(() => {
    const el = filterTagsRef.current;
    if (!el) {
      return;
    }
    const canLeft = el.scrollLeft > 1;
    const canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    const next =
      canLeft && canRight
        ? "both"
        : canLeft
          ? "left"
          : canRight
            ? "right"
            : "none";
    setTagScrollFade((prev) => (prev === next ? prev : next));
  }, []);

  React.useEffect(() => {
    const el = filterTagsRef.current;
    if (!el) {
      return;
    }
    updateTagScrollFade();
    el.addEventListener("scroll", updateTagScrollFade, { passive: true });
    const ro = new ResizeObserver(updateTagScrollFade);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateTagScrollFade);
      ro.disconnect();
    };
  }, [updateTagScrollFade]);

  const tagFadeMask = React.useMemo(() => {
    switch (tagScrollFade) {
      case "both":
        return "linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)";
      case "left":
        return "linear-gradient(to right, transparent, black 24px)";
      case "right":
        return "linear-gradient(to right, black calc(100% - 24px), transparent)";
      default:
        return undefined;
    }
  }, [tagScrollFade]);

  return (
    <>
      <ListingViewHeader
        title={title}
        className={isFilterStickyActive ? "shadow-none" : undefined}
      />
      <div ref={filterSentinelRef} className="h-0" aria-hidden />
      <div
        className={cn(
          "sticky md:top-[88px] top-[80px] z-20 w-full bg-background/90 py-6 backdrop-blur-md supports-backdrop-filter:bg-background/90",
          isFilterStickyActive ? "shadow-xs border-b border-border" : ""
        )}
      >
        <div className="mx-auto w-full max-w-[1600px] px-4 md:px-8">
          <div className="flex w-full items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 gap-2 rounded-lg px-3 text-sm font-medium"
                >
                  {activeMediaTab === "videos" ? (
                    <Clapperboard className="h-4 w-4" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  {MEDIA_TAB_LABELS[activeMediaTab]}
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem
                  onClick={() => setActiveMediaTab("images")}
                  className={cn(
                    activeMediaTab === "images" &&
                      "bg-secondary text-foreground"
                  )}
                >
                  <Camera className="h-4 w-4" />
                  Photos
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setActiveMediaTab("videos")}
                  className={cn(
                    activeMediaTab === "videos" &&
                      "bg-secondary text-foreground"
                  )}
                >
                  <Clapperboard className="h-4 w-4" />
                  Videos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="h-6 w-px bg-border/70" />
            <div
              ref={filterTagsRef}
              className="flex w-full items-center justify-start gap-2 overflow-x-auto scrollbar-hide sm:w-auto"
              style={
                tagFadeMask
                  ? { maskImage: tagFadeMask, WebkitMaskImage: tagFadeMask }
                  : undefined
              }
            >
              {LISTING_CONTENT_SUBCATEGORIES.map((subcategory) => {
                const isActive = activeSubcategory === subcategory;
                return (
                  <Button
                    key={subcategory}
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    className={cn(
                      "text-xs rounded-full font-medium whitespace-nowrap transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:border-foreground/20"
                    )}
                    onClick={() => setActiveSubcategory(subcategory)}
                  >
                    {SUBCATEGORY_LABELS[subcategory]}
                  </Button>
                );
              })}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="h-6 w-px bg-border/70" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0 rounded-full"
                    aria-label="Generation settings"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Generation settings
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          {generationError ? (
            <p className="mt-3 text-sm text-red-500">{generationError}</p>
          ) : null}
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1600px] px-4 md:px-8 pb-8 pt-8 md:pt-0">
        <section className="space-y-4">
          {activeMediaTab === "videos" &&
          (activePreviewPlans.length > 0 || isGenerating) ? (
            <ListingTimelinePreviewGrid
              plans={activePreviewPlans}
              items={videoItems}
              captionItems={activeCaptionItems}
              listingSubcategory={activeSubcategory}
              captionSubcategoryLabel={SUBCATEGORY_LABELS[activeSubcategory]}
              listingAddress={listingAddress ?? null}
              forceSimpleOverlayTemplate
              loadingCount={loadingCount}
            />
          ) : activeMediaTab === "images" &&
            (activeImagePreviewItems.length > 0 || isGenerating) ? (
            <ListingImagePreviewGrid
              items={activeImagePreviewItems}
              captionSubcategoryLabel={SUBCATEGORY_LABELS[activeSubcategory]}
              loadingCount={loadingCount}
            />
          ) : (
            <div className="rounded-xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">
              {activeMediaTab === "videos"
                ? "No reel variations yet for this subcategory."
                : "No image post drafts yet for this subcategory."}
            </div>
          )}
          <div className="mt-6 flex justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full"
                  aria-label="Generate more"
                  disabled={isGenerating}
                  onClick={() =>
                    void generateSubcategoryContent(activeSubcategory, {
                      forceNewBatch: true
                    })
                  }
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Generate more</TooltipContent>
            </Tooltip>
          </div>
        </section>
      </div>
    </>
  );
}
