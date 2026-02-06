"use client";

import * as React from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { LoadingImage } from "../ui/loading-image";
import { LoadingVideo } from "../ui/loading-video";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../ui/dialog";
import { UploadDialog } from "../uploads/UploadDialog";
import {
  ArrowRight,
  ChevronDown,
  Film,
  Image as ImageIcon,
  Upload,
  X
} from "lucide-react";
import { toast } from "sonner";
import type { DBUserMedia, UserMediaType } from "@shared/types/models";
import {
  createUserMediaRecords,
  deleteUserMedia,
  getUserMediaUploadUrls
} from "@web/src/server/actions/db/userMedia";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@shared/utils/mediaUpload";
import { ViewHeader } from "../view/ViewHeader";

interface MediaViewProps {
  userId: string;
  initialMedia?: DBUserMedia[];
}

type MediaUsageSort = "none" | "most-used" | "least-used";
const MEDIA_PAGE_SIZE = 12;

const mediaLibraryHelpLink = {
  label: "Learn more",
  href: "https://zencourt.ai/blog/how-to-create-b-roll-footage"
};

const formatUploadDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
};

const MediaCard = ({
  item,
  onDelete
}: {
  item: DBUserMedia;
  onDelete: (item: DBUserMedia) => void;
}) => {
  const typeIcon = item.type === "video" ? Film : ImageIcon;
  const TypeIcon = typeIcon;
  const aspectRatio = item.type === "video" ? "9 / 16" : "4 / 3";
  return (
    <div className="group break-inside-avoid mb-6 border border-border rounded-lg bg-card shadow-sm">
      <div className="relative overflow-hidden rounded-lg">
        <div className="relative w-full" style={{ aspectRatio }}>
          {item.type === "video" ? (
            <LoadingVideo
              videoSrc={item.url}
              thumbnailSrc={item.thumbnailUrl ?? undefined}
              thumbnailAlt="Video preview"
              className="h-full w-full"
              imageClassName="object-cover"
              videoClassName="object-cover"
              muted
              loop
              playsInline
              preload="metadata"
            />
          ) : (
            <LoadingImage
              src={item.url}
              alt="Uploaded media"
              fill
              sizes="(min-width: 1536px) 22vw, (min-width: 1280px) 26vw, (min-width: 1024px) 32vw, (min-width: 768px) 48vw, 100vw"
              className="object-cover"
            />
          )}
        </div>
        <div className="absolute inset-0 pointer-events-none bg-linear-to-t from-black/60 via-black/10 to-transparent" />

        <div className="absolute top-3 left-3 flex items-center gap-2">
          <Badge className="bg-black/20 text-white backdrop-blur-sm">
            <TypeIcon className="h-3 w-3" />
            <span className="text-[10px] uppercase tracking-wide">
              {item.type}
            </span>
          </Badge>
        </div>

        <div className="absolute top-3 right-3 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-background/70 backdrop-blur-sm hover:bg-background rounded-full"
            aria-label="Delete media"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDelete(item);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white/90 pointer-events-none">
          <span>{`Uploaded ${formatUploadDate(item.uploadedAt)}`}</span>
          <span>{`Used ${item.usageCount}x`}</span>
        </div>
      </div>
    </div>
  );
};

const MediaView = ({ userId, initialMedia = [] }: MediaViewProps) => {
  const [mediaItems, setMediaItems] =
    React.useState<DBUserMedia[]>(initialMedia);
  const [selectedTypes, setSelectedTypes] = React.useState<UserMediaType[]>([
    "image",
    "video"
  ]);
  const [usageSort, setUsageSort] = React.useState<MediaUsageSort>("none");
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState(MEDIA_PAGE_SIZE);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [mediaToDelete, setMediaToDelete] = React.useState<DBUserMedia | null>(
    null
  );
  const [isDeleting, setIsDeleting] = React.useState(false);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMediaItems(initialMedia);
  }, [initialMedia]);

  const filteredBrandKitItems = React.useMemo(() => {
    let nextItems = [...mediaItems];

    if (selectedTypes.length > 0) {
      nextItems = nextItems.filter((item) => selectedTypes.includes(item.type));
    }

    if (usageSort === "most-used") {
      nextItems.sort((a, b) => b.usageCount - a.usageCount);
    } else if (usageSort === "least-used") {
      nextItems.sort((a, b) => a.usageCount - b.usageCount);
    }

    return nextItems;
  }, [mediaItems, selectedTypes, usageSort]);

  React.useEffect(() => {
    setVisibleCount(MEDIA_PAGE_SIZE);
  }, [selectedTypes, usageSort, mediaItems.length]);

  React.useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) {
      return;
    }

    const hasMore = filteredBrandKitItems.length > visibleCount;
    if (!hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleCount((prev) =>
              Math.min(prev + MEDIA_PAGE_SIZE, filteredBrandKitItems.length)
            );
          }
        });
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [filteredBrandKitItems.length, visibleCount]);

  const totalImages = mediaItems.filter((item) => item.type === "image").length;
  const totalVideos = mediaItems.filter((item) => item.type === "video").length;
  const hasAnyBrandKitMedia = mediaItems.length > 0;
  const hasFilteredBrandKitMedia = filteredBrandKitItems.length > 0;
  const visibleBrandKitItems = filteredBrandKitItems.slice(0, visibleCount);
  const hasMoreBrandKit = filteredBrandKitItems.length > visibleCount;

  const handleTypeToggle = React.useCallback(
    (type: UserMediaType, checked: boolean) => {
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

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const fileValidator = (file: File) => {
    if (file.type.startsWith("image/")) {
      if (file.size > MAX_IMAGE_BYTES) {
        return {
          accepted: false,
          error: `"${file.name}" exceeds the ${formatBytes(
            MAX_IMAGE_BYTES
          )} image limit.`
        };
      }
      return { accepted: true };
    }

    if (file.type.startsWith("video/")) {
      if (file.size > MAX_VIDEO_BYTES) {
        return {
          accepted: false,
          error: `"${file.name}" exceeds the ${formatBytes(
            MAX_VIDEO_BYTES
          )} video limit.`
        };
      }
      return { accepted: true };
    }

    return {
      accepted: false,
      error: `"${file.name}" is not a supported file type.`
    };
  };

  const handleCreateRecords = async (
    records: Array<{ key: string; type: UserMediaType; thumbnailKey?: string }>
  ) => {
    const created = await createUserMediaRecords(userId, records);
    setMediaItems((prev) => [...created, ...prev]);
  };

  const handleRequestDelete = React.useCallback((item: DBUserMedia) => {
    setMediaToDelete(item);
    setIsDeleteOpen(true);
  }, []);

  const handleConfirmDelete = async () => {
    if (!mediaToDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteUserMedia(userId, mediaToDelete.id);
      setMediaItems((prev) =>
        prev.filter((item) => item.id !== mediaToDelete.id)
      );
      toast.success("Media deleted.");
      setIsDeleteOpen(false);
      setMediaToDelete(null);
    } catch (error) {
      toast.error(
        (error as Error).message || "Failed to delete media. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <ViewHeader
        title="Media Library"
        subtitle="Manage your own photos and b-roll assets for social media."
      />

      <div className="mx-auto flex max-w-[1600px] flex-col gap-10 px-8 py-8">
        <div className="rounded-lg bg-secondary border border-border px-4 py-3 max-w-3xl">
          <h2 className="text-xl font-header font-medium text-foreground">
            How to use the media library
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload interesting b-roll footage of your daily work that can be
            reused as background content across different social media posts.
          </p>
          <a
            className="mt-3 text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            href={mediaLibraryHelpLink.href}
            target="_blank"
            rel="noreferrer"
          >
            {mediaLibraryHelpLink.label}
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <section className="space-y-6">
          <div className="flex w-full flex-wrap items-center gap-3">
            <Button
              variant="default"
              className="gap-2"
              onClick={() => setIsUploadOpen(true)}
            >
              <Upload className="h-4 w-4" />
              Upload media
            </Button>
            <div className="flex w-full items-center justify-end gap-3 sm:ml-auto sm:w-auto">
              <Badge variant="secondary" className="text-xs px-2 py-1">
                {totalImages} images • {totalVideos} videos
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
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
              <div className="columns-1 gap-6 sm:columns-2 xl:columns-4 2xl:columns-4">
                {visibleBrandKitItems.map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    onDelete={handleRequestDelete}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No media matches this filter yet.
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-12 text-center">
              <div className="relative mb-6 h-24 w-56">
                <div className="absolute left-6 top-0 h-24 w-40 rotate-[-8deg] z-10 rounded-lg border border-border bg-linear-to-br from-secondary to-secondary/50 shadow-md"></div>
                <div className="absolute left-14 top-2 h-24 w-40 rotate-[4deg] rounded-lg border border-border bg-linear-to-br from-secondary to-secondary/50 shadow-md" />
                <div className="absolute left-20 top-1 h-24 w-40 -rotate-2 rounded-lg border border-border bg-linear-to-br from-secondary to-secondary/50 shadow-lg" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                You haven&apos;t added any media yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Click &quot;Upload media&quot; to get started.
              </p>
            </div>
          )}
          {hasFilteredBrandKitMedia && hasMoreBrandKit && (
            <div
              ref={loadMoreRef}
              className="flex items-center justify-center py-6 text-xs text-muted-foreground"
            >
              Loading more…
            </div>
          )}
        </section>
      </div>

      <UploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        title="Upload media"
        description={`Add images up to ${formatBytes(
          MAX_IMAGE_BYTES
        )} and videos up to ${formatBytes(MAX_VIDEO_BYTES)}.`}
        accept="image/*,video/*"
        dropTitle="Drag & drop files here"
        dropSubtitle="or click to select multiple files"
        primaryActionLabel="Upload media"
        errorMessage="Failed to upload media. Please try again."
        maxImageBytes={MAX_IMAGE_BYTES}
        compressDriveImages
        compressOversizeImages
        fileValidator={fileValidator}
        getUploadUrls={(requests) => getUserMediaUploadUrls(userId, requests)}
        buildRecordInput={({ upload, thumbnailKey }) => {
          if (!upload.type) {
            throw new Error("Missing media type.");
          }
          return {
            key: upload.key,
            type: upload.type as UserMediaType,
            thumbnailKey
          };
        }}
        onCreateRecords={handleCreateRecords}
        fileMetaLabel={(file) =>
          `${formatBytes(file.size)} • ${
            file.type.startsWith("image/") ? "Image" : "Video"
          }`
        }
        thumbnailFailureMessage={(count) =>
          `${count} video thumbnail(s) could not be generated.`
        }
      />

      <Dialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {
            setMediaToDelete(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete media?</DialogTitle>
            <DialogDescription>
              This will permanently delete the media file and remove it from
              your library.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={!mediaToDelete || isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export { MediaView };
