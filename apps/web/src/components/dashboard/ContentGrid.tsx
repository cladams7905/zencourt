"use client";

import * as React from "react";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import { Heart, Edit, Download, Share2, Trash2 } from "lucide-react";
import Image from "next/image";

type AspectRatio = "square" | "vertical" | "horizontal";

type CarouselSlide = {
  header: string;
  content: string;
};

interface ContentItem {
  id: string;
  thumbnail?: string;
  aspectRatio?: AspectRatio;
  isFavorite?: boolean;
  alt?: string;
  hook?: string;
  hookSubheader?: string | null;
  caption?: string | null;
  body?: CarouselSlide[] | null;
  isLoading?: boolean;
}

interface ContentGridProps {
  items: ContentItem[];
  className?: string;
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
    item.hook || item.hookSubheader || item.caption || item.body?.length
  );

  if (item.isLoading) {
    return (
      <div className="break-inside-avoid relative rounded-2xl mb-6 animate-pulse">
        <div className="rounded-lg border border-border bg-secondary p-4">
          <div className="h-5 w-4/5 rounded bg-muted-foreground/20" />
          <div className="mt-3 h-4 w-2/3 rounded bg-muted-foreground/20" />
          <div className="mt-5 h-4 w-full rounded bg-muted-foreground/20" />
          <div className="mt-3 h-4 w-5/6 rounded bg-muted-foreground/20" />
          <div className="mt-3 h-4 w-3/4 rounded bg-muted-foreground/20" />
          <div className="mt-3 h-4 w-2/3 rounded bg-muted-foreground/20" />
        </div>
      </div>
    );
  }

  if (!item.thumbnail && !hasTextContent) {
    return null;
  }

  return (
    <div className="break-inside-avoid relative rounded-2xl mb-6">
      {item.thumbnail && (
        <div
          className={cn(
            "relative group rounded-lg overflow-hidden cursor-pointer",
            item.aspectRatio === "vertical" && "aspect-9/16"
          )}
        >
          {/* Content Image */}
          <Image
            src={item.thumbnail}
            alt={item.alt || "Content item"}
            className={cn(
              "w-full object-cover transition-transform duration-700 group-hover:scale-105",
              item.aspectRatio === "vertical" ? "h-full" : "h-auto"
            )}
          />

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />

          {/* Favorite Button */}
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

          {/* Action Buttons */}
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
              className="absolute top-3 right-3 h-7 w-7 rounded-full border border-border/60 bg-background/70 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Dismiss content"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {item.hook && (
            <p className="text-sm font-semibold text-foreground">{item.hook}</p>
          )}
          {item.hookSubheader && (
            <p className="mt-1 text-xs text-muted-foreground">
              {item.hookSubheader}
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
  onFavoriteToggle,
  onEdit,
  onDownload,
  onShare,
  onDelete
}: ContentGridProps) => {
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
    </div>
  );
};

export { ContentGrid, type ContentItem };
