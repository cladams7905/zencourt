"use client";

import * as React from "react";
import { cn } from "../../ui/utils";
import { Button } from "../../ui/button";
import { Heart, Edit, Download, Share2, Trash2 } from "lucide-react";
import Image from "next/image";
import { LoadingVideo } from "../../ui/loading-video";
import type {
  DashboardContentItem,
  TextOverlayInput
} from "@web/src/components/dashboard/shared";

const FALLBACK_THUMBNAIL = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 1200'><rect width='800' height='1200' fill='#111827'/><rect x='120' y='300' width='560' height='600' rx='24' fill='#1f2937'/><text x='400' y='640' font-family='Arial, sans-serif' font-size='28' fill='#9ca3af' text-anchor='middle'>Thumbnail unavailable</text></svg>"
)}`;

type ContentItem = DashboardContentItem;

interface ContentGridProps {
  items: ContentItem[];
  className?: string;
  loadingCount?: number;
  onFavoriteToggle?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDownload?: (id: string) => void;
  onShare?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const ContentGridItem = ({
  item,
  onFavoriteToggle,
  onEdit,
  onDownload,
  onShare,
  onDelete
}: {
  item: ContentItem;
  onFavoriteToggle?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDownload?: (id: string) => void;
  onShare?: (id: string) => void;
  onDelete?: (id: string) => void;
}) => {
  const hasTextContent = Boolean(
    item.hook || item.caption || item.body?.length || item.brollQuery
  );
  const hasSlideTextOverlay = Boolean(
    item.body?.some((slide) => {
      const overlay = slide.text_overlay;
      if (!overlay) {
        return false;
      }
      return Boolean(
        overlay.headline?.trim() ||
        overlay.accent_top?.trim() ||
        overlay.accent_bottom?.trim()
      );
    })
  );

  if (!item.thumbnail && !item.videoUrl && !hasTextContent) {
    return null;
  }

  const getAspectRatio = (): string | undefined => {
    switch (item.aspectRatio) {
      case "vertical":
        return "9 / 16";
      case "square":
        return "1 / 1";
      case "horizontal":
        return "4 / 3";
      default:
        return undefined;
    }
  };

  const aspectRatioStyle = getAspectRatio();
  const shouldDimImageForOverlay = Boolean(
    item.thumbnail && !item.videoUrl && hasSlideTextOverlay
  );

  return (
    <div className="break-inside-avoid relative rounded-2xl mb-6">
      {(item.thumbnail || item.videoUrl) && (
        <div
          className={cn(
            "relative group rounded-xl shadow-xs border border-border/40 overflow-hidden cursor-pointer",
            item.aspectRatio === "vertical" && "aspect-9/16"
          )}
        >
          <div
            className="relative w-full"
            style={
              aspectRatioStyle ? { aspectRatio: aspectRatioStyle } : undefined
            }
          >
            {item.thumbnail ? (
              item.videoUrl ? (
                <LoadingVideo
                  videoSrc={item.videoUrl}
                  thumbnailSrc={item.thumbnail}
                  thumbnailAlt={item.alt || "Content item"}
                  className="h-full w-full"
                  imageClassName={cn(
                    "object-cover transition-transform duration-700 group-hover:scale-105",
                    item.aspectRatio === "vertical" ? "h-full" : "h-auto"
                  )}
                  videoClassName="object-cover"
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              ) : (
                <Image
                  src={item.thumbnail}
                  alt={item.alt || "Content item"}
                  fill
                  sizes="(min-width: 1536px) 22vw, (min-width: 1280px) 26vw, (min-width: 1024px) 32vw, (min-width: 768px) 48vw, 100vw"
                  className={cn(
                    "object-cover transition-transform duration-700 group-hover:scale-105",
                    item.aspectRatio === "vertical" ? "h-full" : "h-auto"
                  )}
                />
              )
            ) : item.videoUrl ? (
              <LoadingVideo
                videoSrc={item.videoUrl}
                thumbnailSrc={FALLBACK_THUMBNAIL}
                thumbnailAlt={item.alt || "Thumbnail unavailable"}
                className="h-full w-full"
                imageClassName={cn(
                  "object-cover transition-transform duration-700 group-hover:scale-105",
                  item.aspectRatio === "vertical" ? "h-full" : "h-auto"
                )}
                videoClassName="object-cover"
                muted
                loop
                playsInline
                preload="metadata"
              />
            ) : null}
          </div>

          {shouldDimImageForOverlay ? (
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/35 via-black/15 to-black/40" />
          ) : null}
          <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />

          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  onDelete(item.id);
                }}
                className="h-6 w-6 rounded-full backdrop-blur-md border border-background/30 bg-background/20 text-red-100 hover:bg-red-500/40 hover:border-red-200/70"
                aria-label="Dismiss content"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                onFavoriteToggle?.(item.id);
              }}
              className={cn(
                "h-6 w-6 rounded-full backdrop-blur-md border transition-all",
                item.isFavorite
                  ? "bg-primary/90 border-primary text-primary-foreground hover:bg-primary"
                  : "bg-background/20 border-background/30 text-background hover:bg-background/30 hover:border-background/70"
              )}
            >
              <Heart
                className={cn("h-3.5 w-3.5", item.isFavorite && "fill-current")}
              />
            </Button>
          </div>

          <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex gap-2 p-1.5 rounded-lg bg-black/20 backdrop-blur-sm">
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  onEdit?.(item.id);
                }}
                className="h-7 w-7 text-background hover:text-background/80 hover:bg-background/10"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  onDownload?.(item.id);
                }}
                className="h-7 w-7 text-background hover:text-background/80 hover:bg-background/10"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  onShare?.(item.id);
                }}
                className="h-7 w-7 text-background hover:text-background/80 hover:bg-background/10"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {hasTextContent && (
        <div className="group relative rounded-lg border border-border bg-background/80 p-4 shadow-sm">
          {onDelete && !item.thumbnail && (
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                onDelete(item.id);
              }}
              className="absolute top-3 right-3 h-7 w-7 rounded-full border border-border bg-background/70 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Dismiss content"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {item.hook && (
            <p className="text-sm font-semibold text-foreground">{item.hook}</p>
          )}
          {item.brollQuery && (
            <p className="mt-1 text-xs text-muted-foreground">
              B-roll: {item.brollQuery}
            </p>
          )}
          {item.caption && (
            <p className="text-xs text-muted-foreground whitespace-pre-line">
              {item.caption}
            </p>
          )}
          {item.body?.length ? (
            <div className="mt-4 space-y-3">
              {item.body.map((slide, index) => (
                <div key={`${item.id}-slide-${index}`}>
                  <p className="text-xs font-semibold text-foreground">
                    {index + 1}. {slide.header}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {slide.content}
                  </p>
                  {slide.broll_query && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      B-roll: {slide.broll_query}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

const ContentGrid = ({
  items,
  className,
  loadingCount = 0,
  onFavoriteToggle,
  onEdit,
  onDownload,
  onShare,
  onDelete
}: ContentGridProps) => {
  const skeletonCount = Math.max(0, loadingCount);

  return (
    <div className={cn("columns-2 md:columns-3 xl:columns-4 gap-6", className)}>
      {items.map((item) => (
        <ContentGridItem
          key={item.id}
          item={item}
          onFavoriteToggle={onFavoriteToggle}
          onEdit={onEdit}
          onDownload={onDownload}
          onShare={onShare}
          onDelete={onDelete}
        />
      ))}
      {Array.from({ length: skeletonCount }, (_, i) => (
        <div
          key={`skeleton-content-${i}`}
          className="break-inside-avoid relative rounded-2xl mb-6 animate-pulse"
        >
          <div className="rounded-xl bg-secondary aspect-square w-full" />
        </div>
      ))}
    </div>
  );
};

export { ContentGrid, type ContentItem, type TextOverlayInput };
