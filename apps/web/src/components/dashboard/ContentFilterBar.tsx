"use client";

import * as React from "react";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import { PillTabs } from "../ui/pill-tabs";
import { ChevronDown, Settings } from "lucide-react";

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
  activeFilters = ["Market Insights"],
  onFilterToggle,
  generationCount = 5,
  generationLimit = 50,
  className
}: ContentFilterBarProps) => {
  const filters = [
    { id: "listings", label: "Listings" },
    { id: "market-insights", label: "Market Insights" },
    { id: "educational", label: "Educational" },
    { id: "community", label: "Community" },
    { id: "lifestyle", label: "Lifestyle" },
    { id: "seasonal", label: "Seasonal" }
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
              className="h-full bg-foreground rounded-full transition-all"
              style={{ width: `${generationPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Type Tabs */}
        <PillTabs
          value={activeType}
          onValueChange={onTypeChange}
          className="shrink-0"
          options={[
            { value: "videos", label: "Videos" },
            { value: "posts", label: "Posts" },
            { value: "stories", label: "Stories" }
          ]}
        />

        {/* Filter Chips */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
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
                    " text-xs font-medium whitespace-nowrap transition-all",
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
          <Button size="icon" variant="ghost" className="shrink-0">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export { ContentFilterBar, type ContentType };
