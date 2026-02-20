"use client";

import * as React from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@web/src/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@web/src/components/ui/tooltip";
import { cn } from "@web/src/components/ui/utils";
import { ViewHeader } from "@web/src/components/view/ViewHeader";
import {
  ContentFilterBar,
  ContentGrid,
  ProfileCompletionChecklist,
  ScheduleCard,
  type ContentItem
} from "@web/src/components/dashboard/components";
import {
  useDashboardContentActions,
  useDashboardContentGeneration,
  useDashboardFilters,
  useDashboardSessionCache
} from "@web/src/components/dashboard/domain";
import type { DBListing } from "@db/types/models";

interface DashboardViewProps {
  initialListings?: DBListing[];
  headerName?: string;
  location?: string;
  profileCompleted?: boolean;
  writingStyleCompleted?: boolean;
  mediaUploaded?: boolean;
  className?: string;
}

const mockScheduleDays = [
  {
    date: "Dec 2nd",
    dayLabel: "Today",
    posts: [
      {
        id: "1",
        time: "2:00 PM",
        title: "Showcase the stunning kitchen...",
        platforms: ["facebook" as const, "instagram" as const]
      },
      {
        id: "2",
        time: "4:30 PM",
        title: "Open concept layout...",
        platforms: ["facebook" as const]
      }
    ]
  },
  {
    date: "Dec 3rd",
    dayLabel: "Tomorrow",
    posts: [
      {
        id: "3",
        time: "10:00 AM",
        title: "Spacious Living Area",
        platforms: ["facebook" as const]
      }
    ]
  },
  { date: "Dec 4th", dayLabel: "Wed", posts: [] },
  {
    date: "Dec 6th",
    dayLabel: "Fri",
    posts: [
      {
        id: "4",
        time: "9:00 AM",
        title: "Open House Announce",
        platforms: ["instagram" as const]
      }
    ]
  },
  { date: "Dec 7th", dayLabel: "Sat", posts: [] }
];

export function DashboardView({
  className,
  headerName,
  location,
  profileCompleted = false,
  writingStyleCompleted = false,
  mediaUploaded = false
}: DashboardViewProps) {
  const handleNoopAction = React.useCallback(() => {}, []);
  const [existingContentItems, setExistingContentItems] = React.useState<
    ContentItem[]
  >([]);
  const { generatedContentItems, setGeneratedContentItems } =
    useDashboardSessionCache();
  const {
    contentType,
    activeFilters,
    activeFilter,
    activeCategory,
    hasSelectedFilter,
    handleFilterToggle,
    handleTypeChange
  } = useDashboardFilters();

  const {
    isGenerating,
    generationError,
    loadingCount,
    activeGeneratedItems,
    generateContent
  } = useDashboardContentGeneration({
    contentType,
    activeFilter,
    activeCategory,
    hasSelectedFilter,
    generatedContentItems,
    setGeneratedContentItems,
    headerName,
    location
  });

  const { handleFavoriteToggle, handleDeleteGeneratedItem } =
    useDashboardContentActions({
      contentType,
      activeCategory,
      setExistingContentItems,
      setGeneratedContentItems
    });

  return (
    <div className={cn("relative", className)}>
      <ViewHeader title={`Welcome back, ${headerName}`} />

      <div className="px-8 py-8 max-w-[1600px] mx-auto space-y-10">
        <ProfileCompletionChecklist
          profileCompleted={profileCompleted}
          writingStyleCompleted={writingStyleCompleted}
          mediaUploaded={mediaUploaded}
        />

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-header font-medium text-foreground">
              Upcoming Schedule
            </h2>
            <a
              href="#"
              className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              Full Calendar
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
            {mockScheduleDays.map((day, idx) => (
              <ScheduleCard
                key={idx}
                date={day.date}
                dayLabel={day.dayLabel}
                posts={day.posts}
                onAddClick={handleNoopAction}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col min-h-[500px]">
          <ContentFilterBar
            activeType={contentType}
            onTypeChange={handleTypeChange}
            activeFilters={activeFilters}
            onFilterToggle={handleFilterToggle}
            generationCount={4}
            generationLimit={50}
            className="mb-8"
          />

          {generationError && (
            <p className="mb-4 text-sm text-red-500">{generationError}</p>
          )}

          {existingContentItems.length > 0 && (
            <ContentGrid
              items={existingContentItems}
              onFavoriteToggle={handleFavoriteToggle}
              onEdit={handleNoopAction}
              onDownload={handleNoopAction}
              onShare={handleNoopAction}
            />
          )}

          {activeCategory &&
            (activeGeneratedItems.length > 0 || isGenerating) && (
              <div className="mt-10">
                <ContentGrid
                  items={activeGeneratedItems}
                  loadingCount={loadingCount}
                  onFavoriteToggle={handleFavoriteToggle}
                  onEdit={handleNoopAction}
                  onDownload={handleNoopAction}
                  onShare={handleNoopAction}
                  onDelete={handleDeleteGeneratedItem}
                />
              </div>
            )}

          {activeCategory && (
            <div className="mt-6 flex justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="rounded-full"
                    aria-label="Generate more"
                    disabled={isGenerating}
                    onClick={() => {
                      void generateContent(
                        activeCategory,
                        new AbortController()
                      );
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Generate more</TooltipContent>
              </Tooltip>
            </div>
          )}
        </section>

        <div className="h-10" />
      </div>
    </div>
  );
}
