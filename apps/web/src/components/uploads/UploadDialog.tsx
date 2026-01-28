"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../ui/dialog";
import { Upload } from "lucide-react";
import { GoogleDriveUploadButton } from "./GoogleDriveUploadButton";

type PendingUpload = {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: "ready" | "uploading" | "done" | "error";
};

type UploadRequest = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

type UploadFailure = {
  id: string;
};

type UploadDescriptor = {
  id: string;
  uploadUrl: string;
  key: string;
  type?: string;
  fileName?: string;
  publicUrl?: string;
  thumbnailUploadUrl?: string;
  thumbnailKey?: string;
};

type UploadDialogProps<TRecord> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  accept: string;
  dropTitle: string;
  dropSubtitle: string;
  primaryActionLabel: string;
  selectedLabel?: string;
  errorMessage?: string;
  fileValidator: (file: File) => { accepted: boolean; error?: string };
  getUploadUrls: (
    requests: UploadRequest[]
  ) => Promise<{ uploads: UploadDescriptor[]; failed: UploadFailure[] }>;
  buildRecordInput: (args: {
    upload: UploadDescriptor;
    file: File;
    thumbnailKey?: string;
    thumbnailFailed: boolean;
  }) => TRecord;
  onCreateRecords: (records: TRecord[]) => Promise<void>;
  onSuccess?: () => void;
  fileMetaLabel?: (file: File) => string;
  thumbnailFailureMessage?: (count: number) => string;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function UploadDialog<TRecord>({
  open,
  onOpenChange,
  title,
  description,
  accept,
  dropTitle,
  dropSubtitle,
  primaryActionLabel,
  selectedLabel = "file",
  errorMessage = "Failed to upload files. Please try again.",
  fileValidator,
  getUploadUrls,
  buildRecordInput,
  onCreateRecords,
  onSuccess,
  fileMetaLabel,
  thumbnailFailureMessage
}: UploadDialogProps<TRecord>) {
  const [pendingFiles, setPendingFiles] = React.useState<PendingUpload[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const revokePendingPreviews = React.useCallback((items: PendingUpload[]) => {
    items.forEach((item) => {
      if (item.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  }, []);

  const resetDialogState = React.useCallback(() => {
    setPendingFiles((prev) => {
      revokePendingPreviews(prev);
      return [];
    });
    setIsDragging(false);
  }, [revokePendingPreviews]);

  React.useEffect(() => {
    if (!open) {
      resetDialogState();
    }
  }, [open, resetDialogState]);

  const addFiles = React.useCallback(
    (files: File[]) => {
      if (files.length === 0) {
        return;
      }

      const accepted: File[] = [];

      files.forEach((file) => {
        const result = fileValidator(file);
        if (!result.accepted) {
          if (result.error) {
            toast.error(result.error);
          }
          return;
        }
        accepted.push(file);
      });

      if (accepted.length === 0) {
        return;
      }

      setPendingFiles((prev) => {
        const existing = new Set(
          prev.map(
            (item) => `${item.file.name}-${item.file.size}-${item.file.type}`
          )
        );
        const next = [...prev];
        accepted.forEach((file) => {
          const key = `${file.name}-${file.size}-${file.type}`;
          if (!existing.has(key)) {
            const id =
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            next.push({
              id,
              file,
              previewUrl: URL.createObjectURL(file),
              progress: 0,
              status: "ready"
            });
            existing.add(key);
          }
        });
        return next;
      });
    },
    [fileValidator]
  );

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
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

  const createVideoThumbnailBlob = React.useCallback(
    (file: File): Promise<Blob | null> =>
      new Promise((resolve) => {
        const video = document.createElement("video");
        const url = URL.createObjectURL(file);
        let timeoutId: number | undefined = undefined;

        const cleanup = () => {
          URL.revokeObjectURL(url);
          video.remove();
          if (timeoutId) {
            window.clearTimeout(timeoutId);
          }
        };

        const handleError = () => {
          cleanup();
          resolve(null);
        };

        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;
        video.src = url;

        video.onloadedmetadata = () => {
          const seekTime = Math.min(0.1, video.duration || 0.1);
          video.currentTime = seekTime;
        };

        video.onseeked = () => {
          const canvas = document.createElement("canvas");
          const maxWidth = 480;
          const scale = Math.min(1, maxWidth / video.videoWidth);
          const width = Math.max(1, Math.round(video.videoWidth * scale));
          const height = Math.max(1, Math.round(video.videoHeight * scale));
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            handleError();
            return;
          }
          ctx.drawImage(video, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              cleanup();
              resolve(blob);
            },
            "image/jpeg",
            0.7
          );
        };

        video.onerror = handleError;
        timeoutId = window.setTimeout(handleError, 4000);
      }),
    []
  );

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

      const { uploads, failed } = await getUploadUrls(uploadRequests);
      const failedIds = new Set(failed.map((item) => item.id));

      if (failed.length > 0) {
        toast.error(`${failed.length} file(s) failed validation.`);
      }

      type UploadResult = {
        record: TRecord;
        thumbnailFailed: boolean;
      };

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

          let thumbnailKey: string | undefined;
          let thumbnailFailed = false;
          if (upload.thumbnailUploadUrl && upload.thumbnailKey) {
            const thumbnailBlob = await createVideoThumbnailBlob(file);
            if (thumbnailBlob) {
              const thumbnailResponse = await fetch(upload.thumbnailUploadUrl, {
                method: "PUT",
                body: thumbnailBlob,
                headers: {
                  "Content-Type": "image/jpeg"
                }
              });
              if (thumbnailResponse.ok) {
                thumbnailKey = upload.thumbnailKey;
              } else {
                thumbnailFailed = true;
              }
            } else {
              thumbnailFailed = true;
            }
          }

          return {
            record: buildRecordInput({
              upload,
              file,
              thumbnailKey,
              thumbnailFailed
            }),
            thumbnailFailed
          } as UploadResult;
        })
      );

      const successfulUploads = uploadResults.filter(
        (result): result is UploadResult => result !== null
      );

      if (successfulUploads.length > 0) {
        await onCreateRecords(successfulUploads.map((result) => result.record));
      }

      const thumbnailFailures = successfulUploads.filter(
        (result) => result.thumbnailFailed
      ).length;
      if (thumbnailFailures > 0 && thumbnailFailureMessage) {
        toast.error(thumbnailFailureMessage(thumbnailFailures));
      }

      const failedUploads = uploads.filter((upload) =>
        failedIds.has(upload.id)
      );
      if (failedUploads.length > 0) {
        toast.error(`${failedUploads.length} file(s) failed to upload.`);
      }

      if (failedIds.size === 0) {
        resetDialogState();
        onOpenChange(false);
        onSuccess?.();
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
                previewUrl: URL.createObjectURL(file),
                progress: 0,
                status: "error"
              };
            })
            .filter((item): item is PendingUpload => item !== null)
        );
      }
    } catch (error) {
      toast.error((error as Error).message || errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          resetDialogState();
        }
      }}
    >
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="space-y-4">
          <div
            className={`rounded-xl border border-dashed px-6 py-10 text-center transition-colors ${
              isDragging ? "border-foreground/40 bg-secondary" : "border-border"
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
              accept={accept}
              className="hidden"
              onChange={handleFileInputChange}
            />
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background border border-border">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {dropTitle}
                </p>
                <p className="text-xs text-muted-foreground">{dropSubtitle}</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button size="sm" variant="outline" type="button">
                  Browse files
                </Button>
                <GoogleDriveUploadButton
                  size="sm"
                  variant="outline"
                  className="gap-2"
                />
              </div>
            </div>
          </div>

          {pendingFiles.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-background p-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {pendingFiles.length} {selectedLabel}
                {pendingFiles.length === 1 ? "" : "s"} selected
              </div>
              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                {pendingFiles.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-md border border-border/60 overflow-hidden bg-secondary/40 shrink-0">
                        {item.file.type.startsWith("video/") ? (
                          <video
                            src={item.previewUrl}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={item.previewUrl}
                            alt={item.file.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {item.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fileMetaLabel?.(item.file) ??
                            formatBytes(item.file.size)}
                        </p>
                      </div>
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
                        onClick={() => {
                          revokePendingPreviews([item]);
                          setPendingFiles((prev) =>
                            prev.filter((pending) => pending.id !== item.id)
                          );
                        }}
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
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || pendingFiles.length === 0}
          >
            {isUploading ? "Uploading..." : primaryActionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { UploadDialog };
export type { UploadDescriptor, UploadRequest };
