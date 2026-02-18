"use client";

import { Button } from "../../ui/button";
import { LoadingImage } from "../../ui/loading-image";
import type { PendingUpload } from "../shared";

interface UploadQueueListProps {
  pendingFiles: PendingUpload[];
  selectedLabel: string;
  isCompressing: boolean;
  isDriveLoading: boolean;
  driveLoadingCount: number;
  isUploading: boolean;
  fileMetaLabel?: (file: File) => string;
  formatBytes: (bytes: number) => string;
  onRemove: (id: string) => void;
}

export function UploadQueueList({
  pendingFiles,
  selectedLabel,
  isCompressing,
  isDriveLoading,
  driveLoadingCount,
  isUploading,
  fileMetaLabel,
  formatBytes,
  onRemove
}: UploadQueueListProps) {
  if (
    pendingFiles.length === 0 &&
    !isCompressing &&
    !(isDriveLoading && driveLoadingCount > 0)
  ) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {pendingFiles.length} {selectedLabel}
        {pendingFiles.length === 1 ? "" : "s"} selected
      </div>
      <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
        {isCompressing || isDriveLoading
          ? Array.from(
              {
                length: Math.max(1, isDriveLoading ? driveLoadingCount : 1)
              },
              (_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="flex items-center gap-3 text-sm"
                >
                  <div className="h-10 w-10 rounded-md border border-border bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/5 rounded bg-muted animate-pulse" />
                    <div className="h-2 w-2/5 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              )
            )
          : null}
        {pendingFiles.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-md border border-border overflow-hidden bg-secondary/40 shrink-0">
                {item.previewType === "video" ? (
                  <video
                    src={item.previewUrl}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <LoadingImage
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="h-full w-full object-cover"
                    height={40}
                    width={40}
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {fileMetaLabel?.(item.file) ?? formatBytes(item.file.size)}
                </p>
              </div>
            </div>
            {item.status === "uploading" || (isUploading && item.status !== "error") ? (
              <div className="w-24">
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.status === "done" ? "Uploaded" : `${item.progress}%`}
                </p>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => onRemove(item.id)}
              >
                Remove
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
