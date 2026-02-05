"use client";

import * as React from "react";
import { ListingViewHeader } from "../ListingViewHeader";
import { ContentGrid, type ContentItem } from "../../dashboard/ContentGrid";
import { emitListingSidebarUpdate } from "@web/src/lib/listingSidebarEvents";

type ListingCreateViewProps = {
  listingId: string;
  title: string;
  items: ContentItem[];
};

export function ListingCreateView({
  listingId,
  title,
  items
}: ListingCreateViewProps) {
  React.useEffect(() => {
    emitListingSidebarUpdate({
      id: listingId,
      listingStage: "create",
      lastOpenedAt: new Date().toISOString()
    });
  }, [listingId]);

  return (
    <>
      <ListingViewHeader title={title} />
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-6 space-y-2">
          <h2 className="text-2xl font-header text-foreground">
            Generated clips
          </h2>
          <p className="text-sm text-muted-foreground">
            Hover over a clip to preview it. We’ll build reels from these clips
            when you’re ready.
          </p>
        </div>
        {items.length > 0 ? (
          <ContentGrid items={items} />
        ) : (
          <div className="rounded-xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">
            We haven’t received any clips yet. Check back in a moment.
          </div>
        )}
      </div>
    </>
  );
}
