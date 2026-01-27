"use client";

import * as React from "react";
import { cn } from "./../ui/utils";
import { ViewHeader } from "./ViewHeader";
import { ProfileCompletionChecklist } from "./ProfileCompletionChecklist";
import { ScheduleCard, type ScheduledPost } from "./ScheduleCard";
import { ContentFilterBar, type ContentType } from "./ContentFilterBar";
import { ContentGrid, type ContentItem } from "./ContentGrid";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { DBListing } from "@shared/types/models";
import { toast } from "sonner";

interface DashboardViewProps {
  initialListings?: DBListing[];
  headerName?: string;
  location?: string;
  profileCompleted?: boolean;
  writingStyleCompleted?: boolean;
  mediaUploaded?: boolean;
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

const categoryMap: Record<string, string> = {
  Listings: "listing",
  "Market Insights": "market_insights",
  Educational: "educational",
  Community: "community",
  Lifestyle: "lifestyle",
  Seasonal: "seasonal"
};

const defaultAgentProfile = {
  agent_name: "Alex Rivera",
  brokerage_name: "Zencourt Realty",
  agent_title: "Realtor",
  city: "",
  state: "",
  zip_code: "",
  service_areas: "",
  writing_style_description:
    "Friendly, conversational, use occasional exclamation points and texting lingo (lol, tbh, idk, haha, soooo, wayyy)"
};

const SESSION_STORAGE_KEY = "zencourt.generatedContent";
const SESSION_TTL_MS = 60 * 60 * 1000;
const DEFAULT_GENERATED_STATE: Record<
  ContentType,
  Record<string, ContentItem[]>
> = {
  videos: {},
  posts: {},
  stories: {}
};

const GENERATED_BATCH_SIZE = 4;
const createItemId = (prefix: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const DashboardView = ({
  className,
  headerName,
  location,
  profileCompleted = false,
  writingStyleCompleted = false,
  mediaUploaded = false
}: DashboardViewProps) => {
  const [contentType, setContentType] = React.useState<ContentType>("videos");
  const [activeFilters, setActiveFilters] = React.useState<string[]>([
    "Market Insights"
  ]);
  const [existingContentItems, setExistingContentItems] = React.useState<
    ContentItem[]
  >([]);
  const [generatedContentItems, setGeneratedContentItems] = React.useState<
    Record<ContentType, Record<string, ContentItem[]>>
  >(DEFAULT_GENERATED_STATE);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generationError, setGenerationError] = React.useState<string | null>(
    null
  );
  const [hasSelectedFilter, setHasSelectedFilter] = React.useState(false);
  const streamBufferRef = React.useRef("");
  const parsedItemsRef = React.useRef<
    {
      hook: string;
      body?: { header: string; content: string }[] | null;
      caption?: string | null;
      broll_query?: string | null;
    }[]
  >([]);
  const batchBaseIndexRef = React.useRef<Record<string, number>>({});
  const generatedContentItemsRef = React.useRef(generatedContentItems);
  const activeControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) {
        return;
      }
      const parsed = JSON.parse(stored) as {
        expiresAt: number;
        data: Record<ContentType, Record<string, ContentItem[]>>;
      };
      if (!parsed?.expiresAt || parsed.expiresAt < Date.now()) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return;
      }
      if (parsed.data) {
        const normalized: Record<ContentType, Record<string, ContentItem[]>> = {
          ...DEFAULT_GENERATED_STATE
        };
        (Object.keys(parsed.data) as ContentType[]).forEach((type) => {
          normalized[type] = {};
          Object.entries(parsed.data[type] ?? {}).forEach(([key, items]) => {
            normalized[type][key] = items.filter((item) => !item.isLoading);
          });
        });
        setGeneratedContentItems(normalized);
      }
    } catch {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          expiresAt: Date.now() + SESSION_TTL_MS,
          data: generatedContentItems
        })
      );
    } catch {
      // Ignore storage errors (quota/disabled storage)
    }
  }, [generatedContentItems]);

  const handleFilterToggle = (filter: string) => {
    setActiveFilters([filter]);
    setHasSelectedFilter(true);
  };

  const handleTypeChange = (type: ContentType) => {
    setContentType(type);
    if (activeFilters.length > 0) {
      setHasSelectedFilter(true);
    }
  };

  const handleFavoriteToggle = (id: string) => {
    setExistingContentItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    );
    setGeneratedContentItems((prev) => {
      const updated: Record<ContentType, Record<string, ContentItem[]>> = {
        videos: {},
        posts: {},
        stories: {}
      };
      (Object.keys(prev) as ContentType[]).forEach((type) => {
        Object.entries(prev[type]).forEach(([key, items]) => {
          updated[type][key] = items.map((item) =>
            item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
          );
        });
      });
      return updated;
    });
  };

  const buildLoadingItems = React.useCallback(
    (offset: number) =>
      Array.from({ length: GENERATED_BATCH_SIZE }, (_, index) => ({
        id: createItemId("loading"),
        aspectRatio: "square" as const,
        isFavorite: false,
        isLoading: true
      })),
    []
  );

  const extractJsonItemsFromStream = React.useCallback((text: string) => {
    const items: {
      hook: string;
      body?: { header: string; content: string; broll_query?: string }[] | null;
      caption?: string | null;
      broll_query?: string | null;
    }[] = [];

    let arrayStarted = false;
    let inString = false;
    let escape = false;
    let braceDepth = 0;
    let objectStart = -1;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (!arrayStarted) {
        if (char === "[") {
          arrayStarted = true;
        }
        continue;
      }

      if (inString) {
        if (escape) {
          escape = false;
          continue;
        }
        if (char === "\\") {
          escape = true;
          continue;
        }
        if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === "{") {
        if (braceDepth === 0) {
          objectStart = i;
        }
        braceDepth += 1;
      } else if (char === "}") {
        braceDepth -= 1;
        if (braceDepth === 0 && objectStart >= 0) {
          const objectText = text.slice(objectStart, i + 1);
          try {
            const parsed = JSON.parse(objectText);
            if (parsed && typeof parsed === "object") {
              items.push(parsed);
            }
          } catch {
            // Ignore incomplete/invalid JSON objects
          }
          objectStart = -1;
        }
      }
    }

    return items;
  }, []);

  const estimatePartialItemProgress = React.useCallback((text: string) => {
    let arrayStarted = false;
    let inString = false;
    let escape = false;
    let braceDepth = 0;
    let objectStart = -1;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (!arrayStarted) {
        if (char === "[") {
          arrayStarted = true;
        }
        continue;
      }

      if (inString) {
        if (escape) {
          escape = false;
          continue;
        }
        if (char === "\\") {
          escape = true;
          continue;
        }
        if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === "{") {
        if (braceDepth === 0) {
          objectStart = i;
        }
        braceDepth += 1;
      } else if (char === "}") {
        braceDepth -= 1;
        if (braceDepth === 0) {
          objectStart = -1;
        }
      }
    }

    if (braceDepth <= 0 || objectStart < 0) {
      return 0;
    }

    const partial = text.slice(objectStart);
    const fieldCount =
      (/"hook"\s*:/.test(partial) ? 1 : 0) +
      (/"caption"\s*:/.test(partial) ? 1 : 0) +
      (/"body"\s*:/.test(partial) ? 1 : 0) +
      (/"broll_query"\s*:/.test(partial) ? 1 : 0);

    const rawProgress = fieldCount / 4;
    const progress = Math.max(0.1, rawProgress);
    return Math.min(0.9, progress);
  }, []);

  const generateContent = React.useCallback(
    async (category: string, controller?: AbortController) => {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
      const localController = controller ?? new AbortController();
      activeControllerRef.current = localController;
      setIsGenerating(true);
      setGenerationError(null);
      const batchBaseIndex =
        generatedContentItemsRef.current[contentType]?.[category]?.length ?? 0;
      batchBaseIndexRef.current = {
        ...batchBaseIndexRef.current,
        [category]: batchBaseIndex
      };
      setGeneratedContentItems((prev) => {
        const currentTypeMap = prev[contentType] ?? {};
        const currentItems = currentTypeMap[category] ?? [];
        return {
          ...prev,
          [contentType]: {
            ...currentTypeMap,
            [category]: [...currentItems, ...buildLoadingItems(batchBaseIndex)]
          }
        };
      });
      streamBufferRef.current = "";
      parsedItemsRef.current = [];

      const [city, rawState] =
        location?.split(",")?.map((part) => part.trim()) ?? [];
      const state = rawState?.split(" ")[0] ?? "";
      const zipMatch = location?.match(/\b\d{5}(?:-\d{4})?\b/);
      const zipCode = zipMatch?.[0] ?? "";
      const agentProfile = {
        ...defaultAgentProfile,
        agent_name: headerName || defaultAgentProfile.agent_name,
        city: city || defaultAgentProfile.city,
        state: state || defaultAgentProfile.state,
        zip_code: zipCode || defaultAgentProfile.zip_code
      };
      const filterFocus = activeFilters[0] ?? "";

      const body = {
        category,
        audience_segments: ["first_time_buyers"],
        agent_profile: agentProfile,
        content_request: {
          platform: "instagram",
          content_type: "social_post",
          focus: filterFocus
        }
      };

      try {
        console.debug("Generating content", { category, contentType });
        const response = await fetch("/api/v1/content/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: localController.signal
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(
            errorPayload?.message || "Failed to generate content"
          );
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Streaming response not available");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let didReceiveDone = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part
              .split("\n")
              .find((entry) => entry.startsWith("data:"));
            if (!line) {
              continue;
            }
            const payload = line.replace(/^data:\s*/, "");
            if (!payload) {
              continue;
            }
            const event = JSON.parse(payload) as
              | { type: "delta"; text: string }
              | {
                  type: "done";
                  items: {
                    hook: string;
                    body?:
                      | {
                          header: string;
                          content: string;
                          broll_query?: string | null;
                        }[]
                      | null;
                    caption?: string | null;
                    broll_query?: string | null;
                  }[];
                }
              | { type: "error"; message: string };

            if (event.type === "delta") {
              streamBufferRef.current += event.text;
              const parsedItems = extractJsonItemsFromStream(
                streamBufferRef.current
              );
              const partialProgress = estimatePartialItemProgress(
                streamBufferRef.current
              );
              if (parsedItems.length > parsedItemsRef.current.length) {
                const newItems = parsedItems.slice(
                  parsedItemsRef.current.length
                );
                parsedItemsRef.current = parsedItems;
                setGeneratedContentItems((prev) => {
                  const currentTypeMap = prev[contentType] ?? {};
                  const updatedCategory = [...(currentTypeMap[category] ?? [])];
                  const baseIndex = batchBaseIndexRef.current[category] ?? 0;
                  const startIndex =
                    baseIndex +
                    (parsedItemsRef.current.length - newItems.length);
                  newItems.forEach((item, idx) => {
                    const index = startIndex + idx;
                    updatedCategory[index] = {
                      id: createItemId("generated"),
                      aspectRatio: "square" as const,
                      isFavorite: false,
                      hook: item.hook,
                      caption: item.caption ?? null,
                      body: item.body ?? null,
                      brollQuery: item.broll_query ?? null
                    };
                  });
                  return {
                    ...prev,
                    [contentType]: {
                      ...currentTypeMap,
                      [category]: updatedCategory
                    }
                  };
                });
              }

              setGeneratedContentItems((prev) => {
                const currentTypeMap = prev[contentType] ?? {};
                const updatedCategory = [...(currentTypeMap[category] ?? [])];
                const baseIndex = batchBaseIndexRef.current[category] ?? 0;
                for (let i = 0; i < GENERATED_BATCH_SIZE; i += 1) {
                  const index = baseIndex + i;
                  const currentItem = updatedCategory[index];
                  if (!currentItem?.isLoading) {
                    continue;
                  }
                  if (i < parsedItemsRef.current.length) {
                    updatedCategory[index] = {
                      ...currentItem,
                      progress: 1
                    };
                    continue;
                  }
                  if (i === parsedItemsRef.current.length) {
                    updatedCategory[index] = {
                      ...currentItem,
                      progress: partialProgress
                    };
                    continue;
                  }
                  updatedCategory[index] = {
                    ...currentItem,
                    progress: 0
                  };
                }
                return {
                  ...prev,
                  [contentType]: {
                    ...currentTypeMap,
                    [category]: updatedCategory
                  }
                };
              });
            }

            if (event.type === "error") {
              throw new Error(event.message);
            }

            if (event.type === "done") {
              didReceiveDone = true;
              const generatedItems = event.items.map((item, index) => ({
                id: createItemId("generated"),
                aspectRatio: "square" as const,
                isFavorite: false,
                hook: item.hook,
                caption: item.caption ?? null,
                body: item.body ?? null,
                brollQuery: item.broll_query ?? null
              }));

              setGeneratedContentItems((prev) => {
                const currentTypeMap = prev[contentType] ?? {};
                const updatedCategory = [...(currentTypeMap[category] ?? [])];
                const baseIndex = batchBaseIndexRef.current[category] ?? 0;
                for (let i = 0; i < generatedItems.length; i += 1) {
                  updatedCategory[baseIndex + i] = generatedItems[i];
                }
                return {
                  ...prev,
                  [contentType]: {
                    ...currentTypeMap,
                    [category]: updatedCategory
                  }
                };
              });

              if (generatedItems.length < GENERATED_BATCH_SIZE) {
                setGenerationError("sorry, an error occurred. Please retry.");
                toast.error("Sorry, an error occurred. Please retry.");
                setGeneratedContentItems((prev) => {
                  const currentTypeMap = prev[contentType] ?? {};
                  const current = currentTypeMap[category] ?? [];
                  if (current.length === 0) {
                    return prev;
                  }
                  const batchStart = batchBaseIndexRef.current[category] ?? 0;
                  const batchEnd = batchStart + GENERATED_BATCH_SIZE;
                  const next = current.filter((item, index) => {
                    if (index < batchStart || index >= batchEnd) {
                      return true;
                    }
                    return !item.isLoading;
                  });
                  return {
                    ...prev,
                    [contentType]: {
                      ...currentTypeMap,
                      [category]: next
                    }
                  };
                });
              }
            }
          }
        }

        if (!didReceiveDone) {
          throw new Error("Stream ended before completing output.");
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
        const errorMessage = "sorry, an error occurred. Please retry.";
        setGenerationError(errorMessage);
        toast.error("Sorry, an error occurred. Please retry.");
        setGeneratedContentItems((prev) => {
          const currentTypeMap = prev[contentType] ?? {};
          return {
            ...prev,
            [contentType]: {
              ...currentTypeMap,
              [category]: (() => {
                const current = currentTypeMap[category] ?? [];
                if (current.length === 0) {
                  return current;
                }
                const batchStart = batchBaseIndexRef.current[category] ?? 0;
                const batchEnd = batchStart + GENERATED_BATCH_SIZE;
                return current.filter((item, index) => {
                  if (index < batchStart || index >= batchEnd) {
                    return true;
                  }
                  return !item.isLoading;
                });
              })()
            }
          };
        });
      } finally {
        if (activeControllerRef.current === localController) {
          activeControllerRef.current = null;
        }
        setIsGenerating(false);
      }
    },
    [
      activeFilters,
      buildLoadingItems,
      contentType,
      extractJsonItemsFromStream,
      headerName,
      location
    ]
  );

  React.useEffect(() => {
    generatedContentItemsRef.current = generatedContentItems;
  }, [generatedContentItems]);

  React.useEffect(() => {
    const activeFilter = activeFilters[0];
    const category = activeFilter ? categoryMap[activeFilter] : null;

    if (!hasSelectedFilter || !category) {
      return;
    }

    const existingItems =
      generatedContentItemsRef.current[contentType]?.[category] ?? [];
    const hasRealItems = existingItems.some((item) => !item.isLoading);
    if (hasRealItems) {
      return;
    }
    if (existingItems.length > 0 && !hasRealItems) {
      setGeneratedContentItems((prev) => ({
        ...prev,
        [contentType]: {
          ...prev[contentType],
          [category]: []
        }
      }));
    }

    const controller = new AbortController();
    generateContent(category, controller);

    return () => controller.abort();
  }, [activeFilters, contentType, generateContent, hasSelectedFilter]);

  const activeFilter = activeFilters[0];
  const activeCategory = activeFilter ? categoryMap[activeFilter] : null;

  return (
    <div className={cn("relative", className)}>
      <ViewHeader title={`Welcome back, ${headerName}`} />

      <div className="px-8 py-8 max-w-[1600px] mx-auto space-y-10">
        {/* Profile Completion Checklist */}
        <ProfileCompletionChecklist
          profileCompleted={profileCompleted}
          writingStyleCompleted={writingStyleCompleted}
          mediaUploaded={mediaUploaded}
        />

        {/* Upcoming Schedule Section */}
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
              onEdit={(id) => console.log("Edit", id)}
              onDownload={(id) => console.log("Download", id)}
              onShare={(id) => console.log("Share", id)}
            />
          )}

          {activeCategory &&
            (generatedContentItems[contentType]?.[activeCategory]?.length ??
              0) > 0 && (
              <div className="mt-10">
                <ContentGrid
                  items={
                    generatedContentItems[contentType]?.[activeCategory] ?? []
                  }
                  onFavoriteToggle={handleFavoriteToggle}
                  onEdit={(id) => console.log("Edit", id)}
                  onDownload={(id) => console.log("Download", id)}
                  onShare={(id) => console.log("Share", id)}
                  onDelete={(id) => {
                    setGeneratedContentItems((prev) => {
                      const current = prev[contentType]?.[activeCategory] ?? [];
                      const next = current.filter((item) => item.id !== id);
                      return {
                        ...prev,
                        [contentType]: {
                          ...prev[contentType],
                          [activeCategory]: next
                        }
                      };
                    });
                  }}
                />
              </div>
            )}
          {activeCategory && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="secondary"
                disabled={isGenerating}
                onClick={() => {
                  const controller = new AbortController();
                  generateContent(activeCategory, controller);
                }}
              >
                Generate more {contentType}
              </Button>
            </div>
          )}
        </section>

        {/* Bottom Spacing */}
        <div className="h-10" />
      </div>
    </div>
  );
};

export { DashboardView };
