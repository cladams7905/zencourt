"use client";

import * as React from "react";
import { ListingViewHeader } from "../ListingViewHeader";
import { ContentGrid, type ContentItem } from "../../dashboard/ContentGrid";
import { emitListingSidebarUpdate } from "@web/src/lib/listingSidebarEvents";
import type { PreviewTimelinePlan } from "@web/src/lib/video/previewTimeline";
import { ListingTimelinePreviewGrid } from "./ListingTimelinePreviewGrid";
import { Button } from "../../ui/button";
import {
  LISTING_CONTENT_SUBCATEGORIES,
  type ListingContentSubcategory
} from "@shared/types/models";
import { toast } from "sonner";

type ListingCreateViewProps = {
  listingId: string;
  title: string;
  videoItems: ContentItem[];
  listingPostItems: ContentItem[];
  previewTimelinePlans?: PreviewTimelinePlan[];
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
  listingPostItems,
  previewTimelinePlans = []
}: ListingCreateViewProps) {
  const [activeSubcategory, setActiveSubcategory] =
    React.useState<ListingContentSubcategory>(LISTING_CONTENT_SUBCATEGORIES[0]);
  const [isGeneratingPosts, setIsGeneratingPosts] = React.useState(false);
  const [localPostItems, setLocalPostItems] =
    React.useState<ContentItem[]>(listingPostItems);

  React.useEffect(() => {
    setLocalPostItems(listingPostItems);
  }, [listingPostItems]);

  React.useEffect(() => {
    emitListingSidebarUpdate({
      id: listingId,
      listingStage: "create",
      lastOpenedAt: new Date().toISOString()
    });
  }, [listingId]);

  const activePosts = React.useMemo(
    () =>
      localPostItems.filter(
        (item) => item.listingSubcategory === activeSubcategory
      ),
    [activeSubcategory, localPostItems]
  );

  const handleGeneratePosts = React.useCallback(async () => {
    setIsGeneratingPosts(true);
    try {
      const response = await fetch(
        `/api/v1/listings/${listingId}/content/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subcategory: activeSubcategory,
            focus: SUBCATEGORY_LABELS[activeSubcategory]
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
            : activeSubcategory
      }));

      if (generated.length > 0) {
        setLocalPostItems((prev) => [...generated, ...prev]);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate listing content."
      );
    } finally {
      setIsGeneratingPosts(false);
    }
  }, [activeSubcategory, listingId]);

  return (
    <>
      <ListingViewHeader title={title} />
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        {previewTimelinePlans.length > 0 ? (
          <ListingTimelinePreviewGrid plans={previewTimelinePlans} items={videoItems} />
        ) : null}
        <div className="mb-6 space-y-2">
          <h2 className="text-2xl font-header text-foreground">
            Generated clips
          </h2>
          <p className="text-sm text-muted-foreground">
            Hover over a clip to preview it. We’ll build reels from these clips
            when you’re ready.
          </p>
        </div>
        {videoItems.length > 0 ? (
          <ContentGrid items={videoItems} />
        ) : (
          <div className="rounded-xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">
            We haven’t received any clips yet. Check back in a moment.
          </div>
        )}

        <div className="mt-12 mb-6 space-y-3">
          <h2 className="text-2xl font-header text-foreground">
            Listing post content
          </h2>
          <p className="text-sm text-muted-foreground">
            Generate and review listing-focused post drafts by subcategory.
          </p>
          <div className="flex flex-wrap gap-2">
            {LISTING_CONTENT_SUBCATEGORIES.map((subcategory) => (
              <Button
                key={subcategory}
                size="sm"
                variant={
                  activeSubcategory === subcategory ? "default" : "outline"
                }
                onClick={() => setActiveSubcategory(subcategory)}
              >
                {SUBCATEGORY_LABELS[subcategory]}
              </Button>
            ))}
          </div>
          <div>
            <Button onClick={handleGeneratePosts} disabled={isGeneratingPosts}>
              {isGeneratingPosts
                ? "Generating..."
                : `Generate ${SUBCATEGORY_LABELS[activeSubcategory]}`}
            </Button>
          </div>
        </div>

        {activePosts.length > 0 ? (
          <ContentGrid items={activePosts} />
        ) : (
          <div className="rounded-xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">
            No drafts yet for {SUBCATEGORY_LABELS[activeSubcategory]}. Generate
            a batch to get started.
          </div>
        )}
      </div>
    </>
  );
}
