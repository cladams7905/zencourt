"use client";

import * as React from "react";
import { cn } from "./../ui/utils";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { ScheduleCard, type ScheduledPost } from "./ScheduleCard";
import { ContentFilterBar, type ContentType } from "./ContentFilterBar";
import { ContentGrid, type ContentItem } from "./ContentGrid";
import { ArrowRight } from "lucide-react";
import { DBCampaign } from "@shared/types/models";

interface DashboardViewProps {
  initialCampaigns?: DBCampaign[];
  className?: string;
}

// Mock data for demonstration
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
  {
    date: "Dec 4th",
    dayLabel: "Wed",
    posts: []
  },
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
  {
    date: "Dec 7th",
    dayLabel: "Sat",
    posts: []
  }
];

const mockContentItems: ContentItem[] = [
  { id: "1", aspectRatio: "square", isFavorite: false },
  { id: "2", aspectRatio: "square", isFavorite: false },
  { id: "3", aspectRatio: "vertical", isFavorite: false },
  { id: "4", aspectRatio: "square", isFavorite: true },
  { id: "5", aspectRatio: "vertical", isFavorite: false },
  { id: "6", aspectRatio: "square", isFavorite: false },
  { id: "7", aspectRatio: "square", isFavorite: false },
  { id: "8", aspectRatio: "square", isFavorite: false }
];

const DashboardView = ({ className }: DashboardViewProps) => {
  const [contentType, setContentType] = React.useState<ContentType>("videos");
  const [activeFilters, setActiveFilters] = React.useState<string[]>([
    "Market Trends"
  ]);
  const [contentItems, setContentItems] =
    React.useState<ContentItem[]>(mockContentItems);

  const handleFilterToggle = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
  };

  const handleFavoriteToggle = (id: string) => {
    setContentItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    );
  };

  return (
    <div className={cn("flex h-screen overflow-hidden", className)}>
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-background">
        {/* Header */}
        <DashboardHeader />

        {/* Content */}
        <div className="px-8 py-8 max-w-[1600px] mx-auto space-y-10">
          {/* Upcoming Schedule Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-header font-medium text-foreground">
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

            {/* Horizontal Scroll Container */}
            <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
              {mockScheduleDays.map((day, idx) => (
                <ScheduleCard
                  key={idx}
                  date={day.date}
                  dayLabel={day.dayLabel}
                  posts={day.posts}
                  onAddClick={() => console.log("Add clicked for", day.date)}
                />
              ))}
            </div>
          </section>

          {/* Recommended Content Section */}
          <section className="flex flex-col min-h-[500px]">
            <ContentFilterBar
              activeType={contentType}
              onTypeChange={setContentType}
              activeFilters={activeFilters}
              onFilterToggle={handleFilterToggle}
              generationCount={5}
              generationLimit={50}
              className="mb-8"
            />

            <ContentGrid
              items={contentItems}
              onFavoriteToggle={handleFavoriteToggle}
              onEdit={(id) => console.log("Edit", id)}
              onDownload={(id) => console.log("Download", id)}
              onShare={(id) => console.log("Share", id)}
            />
          </section>

          {/* Bottom Spacing */}
          <div className="h-10" />
        </div>
      </main>
    </div>
  );
};

export { DashboardView };
