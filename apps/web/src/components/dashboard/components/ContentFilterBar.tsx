"use client";

import * as React from "react";
import { cn } from "../../ui/utils";
import { Button } from "../../ui/button";
import { Tabs, TabsList, TabsTrigger } from "../../ui/tabs";
import { Progress } from "../../ui/progress";
import { ChevronDown, Settings } from "lucide-react";
import {
  DASHBOARD_FILTERS,
  type DashboardContentType,
  type DashboardFilterLabel
} from "@web/src/components/dashboard/shared";

interface ContentFilterBarProps {
  activeType?: DashboardContentType;
  onTypeChange?: (type: DashboardContentType) => void;
  activeFilters?: DashboardFilterLabel[];
  onFilterToggle?: (filter: DashboardFilterLabel) => void;
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
  const generationPercentage = (generationCount / generationLimit) * 100;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Header with generation count */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-header font-medium text-foreground">
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
          <Progress className="w-28" value={generationPercentage} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Type Tabs */}
        <Tabs
          value={activeType}
          onValueChange={(value) =>
            onTypeChange?.(value as DashboardContentType)
          }
          className="shrink-0"
        >
          <TabsList className="h-fit w-fit gap-2 bg-secondary border border-border/60 p-1">
            <TabsTrigger
              value="videos"
              className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:border-border/60"
            >
              Videos
            </TabsTrigger>
            <TabsTrigger
              value="posts"
              className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:border-border/60"
            >
              Posts
            </TabsTrigger>
            <TabsTrigger
              value="stories"
              className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:border-border/60"
            >
              Stories
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filter Chips */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide max-w-full justify-end w-full sm:w-auto">
            {DASHBOARD_FILTERS.map((filter) => {
              const isActive = activeFilters.includes(filter.label);
              const isListings = filter.id === "listings";

              return (
                <Button
                  key={filter.id}
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  className={cn(
                    " text-xs rounded-full font-medium whitespace-nowrap transition-all",
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
          <Button size="icon" variant="ghost" className="shrink-0 rounded-full">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export { ContentFilterBar, type DashboardContentType as ContentType };
