"use client";

import * as React from "react";
import { ListingViewHeader } from "../ListingViewHeader";
import { type ContentItem } from "../../dashboard/ContentGrid";
import { emitListingSidebarUpdate } from "@web/src/lib/listingSidebarEvents";
import { buildPreviewTimelinePlans } from "@web/src/lib/video/previewTimeline";
import { ListingTimelinePreviewGrid } from "./ListingTimelinePreviewGrid";
import { cn } from "../../ui/utils";
import { Button } from "../../ui/button";
import { toast } from "sonner";
import {
  LISTING_CONTENT_SUBCATEGORIES,
  type ListingContentSubcategory
} from "@shared/types/models";

type ListingCreateViewProps = {
  listingId: string;
  title: string;
  videoItems: ContentItem[];
  listingPostItems: ContentItem[];
};

const SUBCATEGORY_LABELS: Record<ListingContentSubcategory, string> = {
  new_listing: "New Listing",
  open_house: "Open House",
  price_change: "Price Change",
  status_update: "Status Update",
  property_features: "Property Features"
};

export function ListingCreateView({
  listingId,
  title,
  videoItems,
  listingPostItems
}: ListingCreateViewProps) {
  const [activeSubcategory, setActiveSubcategory] =
    React.useState<ListingContentSubcategory>(LISTING_CONTENT_SUBCATEGORIES[0]);
  const [localPostItems, setLocalPostItems] =
    React.useState<ContentItem[]>(listingPostItems);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generationError, setGenerationError] = React.useState<string | null>(
    null
  );

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
      setIsGenerating(true);
      setGenerationError(null);
      try {
        const response = await fetch(
          `/api/v1/listings/${listingId}/content/generate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subcategory,
              focus: SUBCATEGORY_LABELS[subcategory],
              generation_nonce: options?.forceNewBatch
                ? createGenerationNonce()
                : ""
            })
          }
        );

        const payload = (await response.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
          items?: Array<{ id: string; metadata?: Record<string, unknown> }>;
        };

        if (!response.ok || !payload.success) {
          throw new Error(
            payload.message || "Failed to generate listing post content"
          );
        }

        const generated = (payload.items ?? []).map((item) => ({
          id: item.id,
          aspectRatio: "square" as const,
          isFavorite: false,
          hook:
            typeof item.metadata?.hook === "string"
              ? item.metadata.hook
              : undefined,
          caption:
            typeof item.metadata?.caption === "string"
              ? item.metadata.caption
              : null,
          body: Array.isArray(item.metadata?.body)
            ? (item.metadata.body as ContentItem["body"])
            : null,
          brollQuery:
            typeof item.metadata?.broll_query === "string"
              ? item.metadata.broll_query
              : null,
          listingSubcategory:
            typeof item.metadata?.listingSubcategory === "string"
              ? (item.metadata.listingSubcategory as ListingContentSubcategory)
              : subcategory
        }));

        if (generated.length === 0) {
          return;
        }

        setLocalPostItems((prev) => {
          if (!options?.forceNewBatch) {
            const existingIds = new Set(prev.map((item) => item.id));
            const uniqueGenerated = generated.filter(
              (item) => !existingIds.has(item.id)
            );
            if (uniqueGenerated.length === 0) {
              return prev;
            }
            return [...uniqueGenerated, ...prev];
          }
          return [...generated, ...prev];
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to generate listing content.";
        setGenerationError(message);
        toast.error(message);
      } finally {
        setIsGenerating(false);
      }
    },
    [createGenerationNonce, listingId]
  );

  const activeCaptionItems = React.useMemo(
    () =>
      localPostItems.filter(
        (item) => item.listingSubcategory === activeSubcategory
      ),
    [activeSubcategory, localPostItems]
  );
  const activePreviewPlans = React.useMemo(() => {
    const clips = videoItems
      .filter((item) => Boolean(item.videoUrl))
      .map((item) => ({
        id: item.id,
        category: item.category ?? null,
        durationSeconds: item.durationSeconds ?? null,
        isPriorityCategory: item.isPriorityCategory ?? false
      }));
    return buildPreviewTimelinePlans(
      clips,
      listingId,
      activeCaptionItems.length,
      activeSubcategory
    );
  }, [activeCaptionItems.length, activeSubcategory, listingId, videoItems]);

  React.useEffect(() => {
    if (isGenerating || activeCaptionItems.length > 0) {
      return;
    }
    void generateSubcategoryContent(activeSubcategory);
  }, [
    activeCaptionItems.length,
    activeSubcategory,
    generateSubcategoryContent,
    isGenerating
  ]);

  return (
    <>
      <ListingViewHeader title={title} />
      <div className="mx-auto w-full max-w-[1600px] px-8 py-8">
        <section className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-header text-foreground">
              Reel previews
            </h2>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <div className="flex w-full items-center justify-end gap-2 overflow-x-auto scrollbar-hide sm:w-auto">
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
            </div>
          </div>
          {generationError ? (
            <p className="text-sm text-red-500">{generationError}</p>
          ) : null}
          {activePreviewPlans.length > 0 ? (
            <ListingTimelinePreviewGrid
              plans={activePreviewPlans}
              items={videoItems}
              captionItems={activeCaptionItems}
              captionSubcategoryLabel={SUBCATEGORY_LABELS[activeSubcategory]}
            />
          ) : (
            <div className="rounded-xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">
              {isGenerating
                ? "Generating content and reel variations..."
                : "No reel variations yet for this subcategory."}
            </div>
          )}
          <div className="mt-6 flex justify-center">
            <Button
              variant="secondary"
              disabled={isGenerating}
              onClick={() =>
                void generateSubcategoryContent(activeSubcategory, {
                  forceNewBatch: true
                })
              }
            >
              Generate More
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
