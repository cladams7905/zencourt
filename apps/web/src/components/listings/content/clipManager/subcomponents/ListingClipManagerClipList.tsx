"use client";

import * as React from "react";
import { CalendarClock } from "lucide-react";
import type { ListingClipVersionItem } from "@web/src/components/listings/content/shared/types";
import { LoadingImage } from "@web/src/components/ui/loading-image";
import { cn } from "@web/src/components/ui/utils";
import { RegenerationSpinner } from "./RegenerationSpinner";

export function ListingClipManagerClipList({
  clipItems,
  selectedClipId,
  isDesktopLayout,
  onSelectClip,
  getItemThumbnail,
  getItemDuration,
  isItemRegenerating,
  formatDuration,
  formatGeneratedAt,
  renderSelectedMobileDetail
}: {
  clipItems: ListingClipVersionItem[];
  selectedClipId?: string | null;
  isDesktopLayout: boolean;
  onSelectClip: (item: ListingClipVersionItem) => void;
  getItemThumbnail: (item: ListingClipVersionItem) => string | null;
  getItemDuration: (item: ListingClipVersionItem) => number | null;
  isItemRegenerating: (item: ListingClipVersionItem) => boolean;
  formatDuration: (value?: number | null) => string;
  formatGeneratedAt: (value?: string | Date | null) => string;
  renderSelectedMobileDetail: (item: ListingClipVersionItem) => React.ReactNode;
}) {
  return (
    <div className="min-h-0 overflow-x-hidden rounded-xl border border-border bg-background lg:max-h-[calc(100vh-220px)] lg:self-start lg:overflow-y-auto">
      {clipItems.map((item) => {
        const isSelected = item.clipId === selectedClipId;
        const itemIsRegenerating = isItemRegenerating(item);
        return (
          <div
            key={item.clipId}
            className="border-b border-border last:border-b-0"
          >
            <button
              type="button"
              onClick={() => onSelectClip(item)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                isSelected && "bg-muted"
              )}
            >
              <div className="relative h-21 w-18 shrink-0 overflow-hidden rounded-lg bg-muted">
                {getItemThumbnail(item) ? (
                  <LoadingImage
                    src={getItemThumbnail(item) ?? ""}
                    alt={item.roomName}
                    fill
                    className="object-cover"
                  />
                ) : null}
                {itemIsRegenerating ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
                    <RegenerationSpinner label="Clip regeneration in progress" />
                  </div>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.roomName}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CalendarClock className="h-3 w-3" />
                  {itemIsRegenerating
                    ? "Regenerating now"
                    : formatGeneratedAt(item.currentVersion.generatedAt)}
                </p>
              </div>
              <span className="shrink-0 self-center text-xs text-muted-foreground tabular-nums">
                {formatDuration(getItemDuration(item))}
              </span>
            </button>
            {!isDesktopLayout && isSelected ? (
              <div
                data-testid={`mobile-clip-detail-${item.clipId}`}
                className="space-y-3 border-t border-border bg-background px-4 py-4"
              >
                {renderSelectedMobileDetail(item)}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
