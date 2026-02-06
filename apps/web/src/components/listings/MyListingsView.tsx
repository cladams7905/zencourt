"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../ui/table";
import { Badge } from "../ui/badge";
import { useRouter } from "next/navigation";
import { LoadingImage } from "../ui/loading-image";
import { ViewHeader } from "../view/ViewHeader";
import { FileEdit } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

type ListingSummaryItem = {
  id: string;
  title: string | null;
  listingStage: string | null;
  lastOpenedAt: string | Date | null;
  imageCount: number;
  previewImages: string[];
};

type MyListingsViewProps = {
  initialListings: ListingSummaryItem[];
  initialHasMore: boolean;
};

const PAGE_SIZE = 10;
const MAX_LISTING_IMAGES = 20;

const resolveListingPath = (listing: {
  id: string;
  listingStage: string | null;
}) => {
  switch (listing.listingStage) {
    case "review":
      return `/listings/${listing.id}/review`;
    case "generate":
      return `/listings/${listing.id}/generate`;
    case "create":
      return `/listings/${listing.id}/create`;
    case "categorize":
    default:
      return `/listings/${listing.id}/categorize`;
  }
};

const formatDateLabel = (value?: string | Date | null) => {
  if (!value) {
    return "Never";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Never";
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

const stageLabelMap: Record<string, string> = {
  categorize: "Categorize",
  review: "Review",
  generate: "Generate",
  create: "Create"
};

const formatStageLabel = (stage?: string | null) => {
  if (!stage) return "Draft";
  return stage.charAt(0).toUpperCase() + stage.slice(1);
};

const TableRowSkeleton = () => (
  <TableRow className="h-16">
    <TableCell className="py-4">
      <div className="h-4 w-40 rounded-sm bg-muted-foreground/10" />
    </TableCell>
    <TableCell className="py-4">
      <div className="h-4 w-20 rounded-sm bg-muted-foreground/10" />
    </TableCell>
    <TableCell className="py-4">
      <div className="flex items-center gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`skeleton-image-${index}`}
            className="h-10 w-10 rounded-md bg-muted-foreground/10"
          />
        ))}
      </div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-4 w-16 rounded-sm bg-muted-foreground/10" />
    </TableCell>
  </TableRow>
);

export function MyListingsView({
  initialListings,
  initialHasMore
}: MyListingsViewProps) {
  const [listings, setListings] =
    React.useState<ListingSummaryItem[]>(initialListings);
  const [offset, setOffset] = React.useState(initialListings.length);
  const [hasMore, setHasMore] = React.useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchMoreListings = React.useCallback(async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const response = await fetch(
        `/api/v1/listings?offset=${offset}&limit=${PAGE_SIZE}`
      );
      if (!response.ok) {
        throw new Error("Failed to load more listings.");
      }
      const data = (await response.json()) as {
        items: ListingSummaryItem[];
        hasMore: boolean;
      };
      setListings((prev) => [...prev, ...data.items]);
      setOffset((prev) => prev + data.items.length);
      setHasMore(data.hasMore);
    } catch {
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, offset]);

  React.useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            fetchMoreListings();
          }
        });
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchMoreListings, hasMore]);

  return (
    <>
      <ViewHeader
        title="My listings"
        subtitle="Review and jump back into recent listing workflows."
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-8 py-10">
        <div className="rounded-lg border border-border bg-background shadow-xs">
          <Table>
            <TableHeader className="h-14">
              <TableRow>
                <TableHead className="w-[40%] rounded-tl-lg">
                  Listing name
                </TableHead>
                <TableHead>Last opened</TableHead>
                <TableHead>Uploaded images</TableHead>
                <TableHead className="rounded-tr-lg">Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No listings yet.
                  </TableCell>
                </TableRow>
              ) : (
                listings.map((listing) => {
                  const imageCount = Math.min(
                    listing.imageCount ?? 0,
                    MAX_LISTING_IMAGES
                  );
                  const previewImages = listing.previewImages ?? [];
                  const remainingCount = Math.max(
                    imageCount - previewImages.length,
                    0
                  );
                  const stageLabel =
                    stageLabelMap[listing.listingStage ?? ""] ?? "Categorize";

                  return (
                    <TableRow
                      key={listing.id}
                      className="group h-16 cursor-pointer transition-colors hover:bg-secondary/60"
                      onClick={() => router.push(resolveListingPath(listing))}
                    >
                      <TableCell className="py-4 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">
                            {listing.title?.trim() || "Untitled listing"}
                          </span>
                          {listing.listingStage !== "create" ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="muted"
                                  className="rounded-full py-1 px-1"
                                >
                                  <FileEdit className="text-muted-foreground w-[14px]! h-[14px]!" />
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent sideOffset={6}>
                                Draft ({formatStageLabel(listing.listingStage)})
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-sm text-muted-foreground">
                        {formatDateLabel(listing.lastOpenedAt ?? null)}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {previewImages.map((src, index) => (
                              <div
                                key={`${listing.id}-preview-${index}`}
                                className={
                                  index === 0
                                    ? "rounded-lg"
                                    : "-ml-1 rounded-lg border border-background transition-colors group-hover:border-secondary"
                                }
                              >
                                <LoadingImage
                                  src={src}
                                  alt="Listing preview"
                                  width={64}
                                  height={64}
                                  className="h-16 w-16 rounded-lg object-cover ring-4 ring-background transition-colors group-hover:ring-secondary"
                                  unoptimized
                                />
                              </div>
                            ))}
                          </div>
                          {remainingCount > 0 ? (
                            <Badge variant="secondary" className="text-xs">
                              +{remainingCount}
                            </Badge>
                          ) : null}
                          <Badge variant="secondary" className="text-xs">
                            {imageCount}/{MAX_LISTING_IMAGES}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-sm text-muted-foreground">
                        {stageLabel}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
              {isLoadingMore
                ? Array.from({ length: 3 }).map((_, index) => (
                    <TableRowSkeleton key={`listing-skeleton-${index}`} />
                  ))
                : null}
            </TableBody>
          </Table>
          <div ref={loadMoreRef} className="h-0" />
        </div>
      </div>
    </>
  );
}
