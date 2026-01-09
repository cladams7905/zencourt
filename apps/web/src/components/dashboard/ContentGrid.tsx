"use client";

import * as React from "react";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import { Heart, Edit, Download, Share2 } from "lucide-react";

type AspectRatio = "square" | "vertical" | "horizontal";

interface ContentItem {
  id: string;
  thumbnail?: string;
  aspectRatio?: AspectRatio;
  isFavorite?: boolean;
  alt?: string;
}

interface ContentGridProps {
  items: ContentItem[];
  className?: string;
  onFavoriteToggle?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDownload?: (id: string) => void;
  onShare?: (id: string) => void;
}

const ContentGridItem = ({
  item,
  onFavoriteToggle,
  onEdit,
  onDownload,
  onShare,
}: {
  item: ContentItem;
  onFavoriteToggle?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDownload?: (id: string) => void;
  onShare?: (id: string) => void;
}) => {
  const aspectClasses = {
    square: "",
    vertical: "aspect-[9/16]",
    horizontal: "",
  };

  return (
    <div className="break-inside-avoid relative rounded-2xl mb-6">
      <div
        className={cn(
          "relative group rounded-xl overflow-hidden cursor-pointer",
          item.aspectRatio === "vertical" && "aspect-[9/16]"
        )}
      >
        {/* Content Image/Placeholder */}
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.alt || "Content item"}
            className={cn(
              "w-full object-cover transition-transform duration-700 group-hover:scale-105",
              item.aspectRatio === "vertical" ? "h-full" : "h-auto"
            )}
          />
        ) : (
          <div
            className={cn(
              "w-full bg-gradient-to-br from-accent/30 via-accent/10 to-secondary transition-transform duration-700 group-hover:scale-105",
              item.aspectRatio === "vertical" ? "h-full" : "aspect-[4/3]"
            )}
          />
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />

        {/* Favorite Button */}
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
          <div className="flex gap-2 p-1.5 rounded-md bg-black/20 backdrop-blur-sm">
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
}: ContentGridProps) => {
  return (
    <div
      className={cn(
        "columns-2 md:columns-3 lg:columns-4 gap-6",
        className
      )}
    >
      {items.map((item) => (
        <ContentGridItem
          key={item.id}
          item={item}
          onFavoriteToggle={onFavoriteToggle}
          onEdit={onEdit}
          onDownload={onDownload}
          onShare={onShare}
        />
      ))}
    </div>
  );
};

export { ContentGrid, type ContentItem };
