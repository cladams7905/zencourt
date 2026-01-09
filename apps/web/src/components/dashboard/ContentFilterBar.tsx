"use client";

import * as React from "react";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import { ChevronDown } from "lucide-react";

type ContentType = "videos" | "posts" | "stories";

interface ContentFilterBarProps {
  activeType?: ContentType;
  onTypeChange?: (type: ContentType) => void;
  activeFilters?: string[];
  onFilterToggle?: (filter: string) => void;
  generationCount?: number;
  generationLimit?: number;
  className?: string;
}

const ContentFilterBar = ({
  activeType = "videos",
  onTypeChange,
  activeFilters = ["Market Trends"],
  onFilterToggle,
  generationCount = 5,
  generationLimit = 50,
  className
}: ContentFilterBarProps) => {
  const filters = [
    { id: "listings", label: "Listings" },
    { id: "market-trends", label: "Market Trends" },
    { id: "seasonal", label: "Seasonal" },
    { id: "tips", label: "Tips" },
    { id: "local-events", label: "Local Events" },
    { id: "lifestyle", label: "Lifestyle" }
  ];

  const generationPercentage = (generationCount / generationLimit) * 100;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Header with generation count */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-header font-medium text-foreground">
            Your Recommended Content
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Choose assets to generate your next post
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {generationCount}/{generationLimit} weekly generations
          </span>
          <div className="w-28 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-muted-foreground/40 rounded-full transition-all"
              style={{ width: `${generationPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Type Tabs */}
        <div className="bg-secondary p-1 rounded-xl flex items-center flex-shrink-0">
          <Button
            size="sm"
            variant={activeType === "videos" ? "default" : "ghost"}
            className={cn(
              "rounded-lg px-4 py-2 transition-all",
              activeType === "videos"
                ? "bg-background text-foreground shadow-sm hover:bg-background"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onTypeChange?.("videos")}
          >
            Videos
          </Button>
          <Button
            size="sm"
            variant={activeType === "posts" ? "default" : "ghost"}
            className={cn(
              "rounded-lg px-4 py-2 transition-all",
              activeType === "posts"
                ? "bg-background text-foreground shadow-sm hover:bg-background"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onTypeChange?.("posts")}
          >
            Posts
          </Button>
          <Button
            size="sm"
            variant={activeType === "stories" ? "default" : "ghost"}
            className={cn(
              "rounded-lg px-4 py-2 transition-all",
              activeType === "stories"
                ? "bg-background text-foreground shadow-sm hover:bg-background"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onTypeChange?.("stories")}
          >
            Stories
          </Button>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide max-w-full justify-end w-full sm:w-auto">
          {filters.map((filter) => {
            const isActive = activeFilters.includes(filter.label);
            const isListings = filter.id === "listings";

            return (
              <Button
                key={filter.id}
                size="sm"
                variant={isActive ? "default" : "outline"}
                className={cn(
                  "rounded-full text-xs font-medium whitespace-nowrap transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:border-foreground/20",
                  isListings && "gap-1.5"
                )}
                onClick={() => onFilterToggle?.(filter.label)}
              >
                {filter.label}
                {isListings && <ChevronDown className="h-3 w-3" />}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export { ContentFilterBar, type ContentType };
