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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../ui/dialog";
import { DashboardSidebar } from "../dashboard/DashboardSidebar";
import {
  Bell,
  ChevronDown,
  Film,
  Image as ImageIcon,
  Plus,
  Upload
} from "lucide-react";
import { toast } from "sonner";
import type { DBUserMedia, UserMediaType } from "@shared/types/models";
import {
  createUserMediaRecords,
  getUserMediaUploadUrls
} from "@web/src/server/actions/db/userMedia";
import {
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES
} from "@shared/utils/mediaUpload";

interface MediaViewProps {
  userId: string;
  initialMedia?: DBUserMedia[];
  userName?: string;
  paymentPlan?: string;
  userAvatar?: string;
}

type MediaUsageSort = "none" | "most-used" | "least-used";
type PendingUpload = {
  id: string;
  file: File;
  progress: number;
  status: "ready" | "uploading" | "done" | "error";
};

const MEDIA_PAGE_SIZE = 12;

const mediaLibraryHelpLink = {
  label: "Learn how to create compelling b-roll content",
  href: "https://example.com/media-library-guide"
};

const formatUploadDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
};

const MediaCard = ({ item }: { item: DBUserMedia }) => {
  const typeIcon = item.type === "video" ? Film : ImageIcon;
  const TypeIcon = typeIcon;
  const aspectRatio = item.type === "video" ? "9 / 16" : "4 / 3";
  const videoRef = React.useRef<HTMLVideoElement>(null);

  return (
    <div className="break-inside-avoid mb-6 rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="relative overflow-hidden rounded-xl">
        <div className="relative w-full" style={{ aspectRatio }}>
          {item.type === "video" ? (
            <video
              ref={videoRef}
              src={item.url}
              className="h-full w-full object-cover"
              muted
              loop
              playsInline
              preload="metadata"
              onMouseEnter={() => {
                const video = videoRef.current;
                if (video) {
                  void video.play();
                }
              }}
              onMouseLeave={() => {
                const video = videoRef.current;
                if (video) {
                  video.pause();
                  video.currentTime = 0;
                }
              }}
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
          <Badge className="bg-black/40 text-white border border-white/20">
            <TypeIcon className="h-3 w-3" />
            <span className="text-[10px] uppercase tracking-wide">
              {item.type}
            </span>
          </Badge>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white/90 pointer-events-none">
          <span>{`Uploaded ${formatUploadDate(item.uploadedAt)}`}</span>
          <span>{`Used ${item.usageCount}x`}</span>
        </div>
      </div>
    </div>
  );
};

const MediaView = ({
  userId,
  initialMedia = [],
  userName = "User",
  paymentPlan = "Free",
  userAvatar
}: MediaViewProps) => {
  const [mediaItems, setMediaItems] =
    React.useState<DBUserMedia[]>(initialMedia);
  const [selectedTypes, setSelectedTypes] = React.useState<UserMediaType[]>([
    "image",
    "video"
  ]);
  const [usageSort, setUsageSort] = React.useState<MediaUsageSort>("none");
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [pendingFiles, setPendingFiles] = React.useState<PendingUpload[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState(MEDIA_PAGE_SIZE);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
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

  const addFiles = React.useCallback((files: File[]) => {
    if (files.length === 0) {
      return;
    }

    const accepted: File[] = [];

    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        if (file.size > MAX_IMAGE_BYTES) {
          toast.error(
            `"${file.name}" exceeds the ${formatBytes(
              MAX_IMAGE_BYTES
            )} image limit.`
          );
          return;
        }
        accepted.push(file);
        return;
      }

      if (file.type.startsWith("video/")) {
        if (file.size > MAX_VIDEO_BYTES) {
          toast.error(
            `"${file.name}" exceeds the ${formatBytes(
              MAX_VIDEO_BYTES
            )} video limit.`
          );
          return;
        }
        accepted.push(file);
        return;
      }

      toast.error(`"${file.name}" is not a supported file type.`);
    });

    if (accepted.length === 0) {
      return;
    }

    setPendingFiles((prev) => {
      const existing = new Set(
        prev.map((item) => `${item.file.name}-${item.file.size}-${item.file.type}`)
      );
      const next = [...prev];
      accepted.forEach((file) => {
        const key = `${file.name}-${file.size}-${file.type}`;
        if (!existing.has(key)) {
          const id =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          next.push({ id, file, progress: 0, status: "ready" });
          existing.add(key);
        }
      });
      return next;
    });
  }, []);

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    addFiles(files);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  const updatePendingFile = (
    id: string,
    updates: Partial<{
      progress: number;
      status: "ready" | "uploading" | "done" | "error";
    }>
  ) => {
    setPendingFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const uploadFileWithProgress = async (
    uploadUrl: string,
    file: File,
    id: string
  ): Promise<boolean> => {
    updatePendingFile(id, { status: "uploading", progress: 0 });
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) {
          return;
        }
        const percent = Math.round((event.loaded / event.total) * 100);
        updatePendingFile(id, { progress: percent });
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          updatePendingFile(id, { progress: 100, status: "done" });
          resolve(true);
        } else {
          updatePendingFile(id, { status: "error" });
          resolve(false);
        }
      };
      xhr.onerror = () => {
        updatePendingFile(id, { status: "error" });
        resolve(false);
      };
      xhr.send(file);
    });
  };

  const handleUpload = async () => {
    if (pendingFiles.length === 0 || isUploading) {
      return;
    }

    setIsUploading(true);
    try {
      const fileMap = new Map<string, File>();
      const uploadRequests = pendingFiles.map((item) => {
        fileMap.set(item.id, item.file);
        return {
          id: item.id,
          fileName: item.file.name,
          fileType: item.file.type,
          fileSize: item.file.size
        };
      });

      const { uploads, failed } = await getUserMediaUploadUrls(
        userId,
        uploadRequests
      );
      const failedIds = new Set(failed.map((item) => item.id));

      if (failed.length > 0) {
        toast.error(`${failed.length} file(s) failed validation.`);
      }

      const uploadResults = await Promise.all(
        uploads.map(async (upload) => {
          const file = fileMap.get(upload.id);
          if (!file) {
            failedIds.add(upload.id);
            updatePendingFile(upload.id, { status: "error" });
            return null;
          }

          const success = await uploadFileWithProgress(
            upload.uploadUrl,
            file,
            upload.id
          );
          if (!success) {
            failedIds.add(upload.id);
            return null;
          }

          return {
            key: upload.key,
            type: upload.type
          };
        })
      );

      const successfulUploads = uploadResults.filter(
        (result): result is { key: string; type: UserMediaType } => !!result
      );

      if (successfulUploads.length > 0) {
        const created = await createUserMediaRecords(
          userId,
          successfulUploads
        );
        setMediaItems((prev) => [...created, ...prev]);
      }

      const failedUploads = uploads.filter((upload) => failedIds.has(upload.id));
      if (failedUploads.length > 0) {
        toast.error(`${failedUploads.length} file(s) failed to upload.`);
      }

      if (failedIds.size === 0) {
        setPendingFiles([]);
        setIsUploadOpen(false);
      } else {
        setPendingFiles(
          failedUploads
            .map((upload): PendingUpload | null => {
              const file = fileMap.get(upload.id);
              if (!file) {
                return null;
              }
              return {
                id: upload.id,
                file,
                progress: 0,
                status: "error"
              };
            })
            .filter(
              (item): item is PendingUpload => item !== null
            )
        );
      }
    } catch (error) {
      toast.error(
        (error as Error).message || "Failed to upload media. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

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
              Manage your own photos and b-roll assets for social media.
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
                <div className="columns-1 gap-6 sm:columns-2 xl:columns-3 2xl:columns-4">
                  {visibleBrandKitItems.map((item) => (
                    <MediaCard key={item.id} item={item} />
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
                  <div className="absolute left-6 top-0 h-24 w-40 rotate-[-8deg] z-10 overflow-hidden rounded-xl shadow-sm">
                    <LoadingImage
                      src="/media-example.jpg"
                      alt="Example b-roll 1"
                      className="h-full w-full object-cover"
                      width={160} 
                      height={96}
                    />
                  </div>
                  <div className="absolute left-14 top-2 h-24 w-40 rotate-[4deg] rounded-xl border border-border/60 bg-linear-to-br from-secondary to-secondary/50 shadow-md" />
                  <div className="absolute left-20 top-1 h-24 w-40 -rotate-2 rounded-xl border border-border bg-linear-to-br from-secondary to-secondary/50 shadow-lg" />
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

        <Dialog
          open={isUploadOpen}
          onOpenChange={(open) => {
            setIsUploadOpen(open);
            if (!open) {
              setPendingFiles([]);
              setIsDragging(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-[680px]">
            <DialogHeader>
              <DialogTitle>Upload media</DialogTitle>
              <DialogDescription>
                Add images up to {formatBytes(MAX_IMAGE_BYTES)} and videos up to{" "}
                {formatBytes(MAX_VIDEO_BYTES)}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div
                className={`rounded-xl border border-dashed px-6 py-10 text-center transition-colors ${
                  isDragging
                    ? "border-foreground/40 bg-secondary"
                    : "border-border"
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background border border-border">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Drag & drop files here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      or click to select multiple files
                    </p>
                  </div>
                  <Button size="sm" variant="outline" type="button">
                    Browse files
                  </Button>
                </div>
              </div>

              {pendingFiles.length > 0 && (
                <div className="rounded-lg border border-border/60 bg-background p-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {pendingFiles.length} file
                    {pendingFiles.length === 1 ? "" : "s"} selected
                  </div>
                  <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                    {pendingFiles.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {item.file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(item.file.size)} •{" "}
                            {item.file.type.startsWith("image/")
                              ? "Image"
                              : "Video"}
                          </p>
                        </div>
                        {item.status === "uploading" ||
                        (isUploading && item.status !== "error") ? (
                          <div className="w-24">
                            <div className="h-2 w-full rounded-full bg-muted">
                              <div
                                className="h-2 rounded-full bg-primary transition-all"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {item.status === "done"
                                ? "Uploaded"
                                : `${item.progress}%`}
                            </p>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            onClick={() =>
                              setPendingFiles((prev) =>
                                prev.filter((pending) => pending.id !== item.id)
                              )
                            }
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsUploadOpen(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || pendingFiles.length === 0}
              >
                {isUploading ? "Uploading..." : "Upload media"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export { MediaView };
