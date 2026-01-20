"use client";

import * as React from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { LoadingImage } from "../ui/loading-image";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../ui/dropdown-menu";
import { DashboardSidebar } from "../dashboard/DashboardSidebar";
import {
  Bell,
  ChevronDown,
  Film,
  Image as ImageIcon,
  Play,
  Plus,
  Upload
} from "lucide-react";

interface MediaViewProps {
  userName?: string;
  paymentPlan?: string;
  userAvatar?: string;
}

type MediaType = "image" | "video";

interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  usageCount: number;
  createdAt: number;
  uploadedLabel: string;
  location: string;
  listing: string;
  duration?: string;
  aspectRatio: string;
  thumbnail: string;
}

type MediaUsageSort = "none" | "most-used" | "least-used";

const brandKitItems: MediaItem[] = [
  {
    id: "brand-1",
    title: "Agent Intro Clip",
    type: "video",
    usageCount: 8,
    createdAt: new Date("2024-02-12").getTime(),
    uploadedLabel: "Uploaded 1 day ago",
    location: "Evergreen media",
    listing: "Brand kit",
    duration: "0:15",
    aspectRatio: "9 / 16",
    thumbnail:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: "brand-2",
    title: "Neighborhood Establishing Shot",
    type: "image",
    usageCount: 5,
    createdAt: new Date("2024-02-02").getTime(),
    uploadedLabel: "Uploaded 2 weeks ago",
    location: "Evergreen media",
    listing: "Brand kit",
    aspectRatio: "3 / 2",
    thumbnail:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: "brand-3",
    title: "City Skyline Cutaway",
    type: "video",
    usageCount: 3,
    createdAt: new Date("2024-01-22").getTime(),
    uploadedLabel: "Uploaded 3 weeks ago",
    location: "Evergreen media",
    listing: "Brand kit",
    duration: "0:12",
    aspectRatio: "16 / 9",
    thumbnail:
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80"
  }
];

const mediaLibraryHelpLink = {
  label: "Learn how to create compelling b-roll content",
  href: "https://example.com/media-library-guide"
};

const MediaCard = ({ item }: { item: MediaItem }) => {
  const typeIcon = item.type === "video" ? Film : ImageIcon;
  const TypeIcon = typeIcon;

  return (
    <div className="break-inside-avoid mb-6 rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="relative overflow-hidden rounded-xl">
        <div
          className="relative w-full"
          style={{ aspectRatio: item.aspectRatio }}
        >
          <LoadingImage
            src={item.thumbnail}
            alt={item.title}
            fill
            sizes="(min-width: 1536px) 22vw, (min-width: 1280px) 26vw, (min-width: 1024px) 32vw, (min-width: 768px) 48vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/15 to-transparent" />

        <div className="absolute top-3 left-3 flex items-center gap-2">
          <Badge className="bg-black/40 text-white border border-white/20">
            <TypeIcon className="h-3 w-3" />
            <span className="text-[10px] uppercase tracking-wide">
              {item.type}
            </span>
          </Badge>
        </div>

        {item.type === "video" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-black/40">
              <Play className="h-5 w-5 text-white" />
            </div>
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white/90">
          <span>{item.duration}</span>
          <span>{`Used ${item.usageCount}x`}</span>
        </div>
      </div>
    </div>
  );
};

const MediaView = ({
  userName = "User",
  paymentPlan = "Free",
  userAvatar
}: MediaViewProps) => {
  const [selectedTypes, setSelectedTypes] = React.useState<MediaType[]>([
    "image",
    "video"
  ]);
  const [usageSort, setUsageSort] = React.useState<MediaUsageSort>("none");

  const filteredBrandKitItems = React.useMemo(() => {
    let nextItems = [...brandKitItems];

    if (selectedTypes.length > 0) {
      nextItems = nextItems.filter((item) => selectedTypes.includes(item.type));
    }

    if (usageSort === "most-used") {
      nextItems.sort((a, b) => b.usageCount - a.usageCount);
    } else if (usageSort === "least-used") {
      nextItems.sort((a, b) => a.usageCount - b.usageCount);
    }

    return nextItems;
  }, [selectedTypes, usageSort]);

  const totalImages = brandKitItems.filter((item) => item.type === "image").length;
  const totalVideos = brandKitItems.filter((item) => item.type === "video").length;
  const hasAnyBrandKitMedia = brandKitItems.length > 0;
  const hasFilteredBrandKitMedia = filteredBrandKitItems.length > 0;

  const handleTypeToggle = React.useCallback(
    (type: MediaType, checked: boolean) => {
      setSelectedTypes((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(type);
        } else {
          next.delete(type);
        }
        return Array.from(next);
      });
    },
    []
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar
        userName={userName}
        paymentPlan={paymentPlan}
        userAvatar={userAvatar}
      />

      <main className="flex-1 overflow-y-auto bg-background">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-8 py-5 backdrop-blur-md">
          <div>
            <h1 className="text-2xl font-header font-medium text-foreground">
              Media Library
            </h1>
            <p className="text-sm text-muted-foreground">
              Upload your own photos and b-roll clips for social media.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Button size="default" className="gap-2 shadow-sm">
              <Plus className="h-5 w-5" />
              <span>New</span>
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="relative"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full border-2 border-background" />
            </Button>
          </div>
        </header>

        <div className="mx-auto flex max-w-[1600px] flex-col gap-10 px-8 py-8">
          <div className="rounded-lg bg-secondary px-4 py-3 max-w-3xl">
            <p className="text-sm font-semibold text-foreground">
              How to use the media library
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload interesting b-roll footage of your daily work that can be reused as background content across different social media posts.
            </p>
            <div className="mt-3 text-sm text-muted-foreground">
              <a
                className="font-semibold text-foreground underline underline-offset-4"
                href={mediaLibraryHelpLink.href}
                target="_blank"
                rel="noreferrer"
              >
                {mediaLibraryHelpLink.label}
              </a>
            </div>
          </div>
          
          <section className="space-y-6">
            <div className="flex w-full flex-wrap items-center gap-3">
              <Button variant="default" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload media
              </Button>
              <div className="flex w-full items-center justify-end gap-3 sm:ml-auto sm:w-auto">
                <Badge variant="secondary" className="text-xs">
                  {totalImages} images • {totalVideos} videos
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-2">
                      Filter
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Type</DropdownMenuLabel>
                    <DropdownMenuCheckboxItem
                      checked={selectedTypes.includes("image")}
                      onCheckedChange={(checked) =>
                        handleTypeToggle("image", checked === true)
                      }
                    >
                      Images
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={selectedTypes.includes("video")}
                      onCheckedChange={(checked) =>
                        handleTypeToggle("video", checked === true)
                      }
                    >
                      Videos
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Usage</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={usageSort}
                      onValueChange={(value) =>
                        setUsageSort(value as MediaUsageSort)
                      }
                    >
                      <DropdownMenuRadioItem value="none">
                        Any usage
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="most-used">
                        Most used
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="least-used">
                        Least used
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {hasAnyBrandKitMedia ? (
              hasFilteredBrandKitMedia ? (
                <div className="columns-1 gap-6 sm:columns-2 xl:columns-3 2xl:columns-4">
                  {filteredBrandKitItems.map((item) => (
                    <MediaCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-sm text-muted-foreground">
                  No media matches this filter yet.
                </div>
              )
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-sm text-muted-foreground">
                Get started by clicking the &quot;Upload Media&quot; button.
              </div>
            )}

          </section>
        </div>
      </main>
    </div>
  );
};

export { MediaView };
