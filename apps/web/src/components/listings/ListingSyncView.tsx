"use client";

import * as React from "react";
import { ViewHeader } from "../dashboard/ViewHeader";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "../ui/card";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../ui/dialog";
import { Upload } from "lucide-react";
import { MAX_IMAGE_BYTES } from "@shared/utils/mediaUpload";
import {
  createUserMediaRecords,
  getUserMediaUploadUrls
} from "@web/src/server/actions/db/userMedia";

interface ListingSyncViewProps {
  userId: string;
}

type PendingUpload = {
  id: string;
  file: File;
  progress: number;
  status: "ready" | "uploading" | "done" | "error";
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

export function ListingSyncView({ userId }: ListingSyncViewProps) {
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [pendingFiles, setPendingFiles] = React.useState<PendingUpload[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const uploadFileWithProgress = async (
    uploadUrl: string,
    file: File,
    id: string
  ): Promise<boolean> => {
    setPendingFiles((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "uploading", progress: 0 } : item
      )
    );
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) {
          return;
        }
        const percent = Math.round((event.loaded / event.total) * 100);
        setPendingFiles((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, progress: percent } : item
          )
        );
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setPendingFiles((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, progress: 100, status: "done" } : item
            )
          );
          resolve(true);
        } else {
          setPendingFiles((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, status: "error" } : item
            )
          );
          resolve(false);
        }
      };
      xhr.onerror = () => {
        setPendingFiles((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: "error" } : item
          )
        );
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
            return null;
          }
          if (!file.type.startsWith("image/")) {
            failedIds.add(upload.id);
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
        (result): result is NonNullable<(typeof uploadResults)[number]> =>
          result !== null
      );

      if (successfulUploads.length > 0) {
        await createUserMediaRecords(
          userId,
          successfulUploads.map((result) => ({
            key: result.key,
            type: result.type
          }))
        );
      }

      const failedUploads = uploads.filter((upload) =>
        failedIds.has(upload.id)
      );
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
            .filter((item): item is PendingUpload => item !== null)
        );
      }
    } catch (error) {
      toast.error(
        (error as Error).message || "Failed to upload photos. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files && event.target.files.length > 0) {
      const files = Array.from(event.target.files).filter((file) =>
        file.type.startsWith("image/")
      );
      if (files.length === 0) {
        toast.error("Only image files are supported.");
        event.target.value = "";
        return;
      }
      const mapped = files.map((file) => ({
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        file,
        progress: 0,
        status: "ready" as const
      }));
      setPendingFiles((prev) => [...mapped, ...prev]);
      event.target.value = "";
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const files = Array.from(event.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/")
      );
      if (files.length === 0) {
        toast.error("Only image files are supported.");
        return;
      }
      const mapped = files.map((file) => ({
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        file,
        progress: 0,
        status: "ready" as const
      }));
      setPendingFiles((prev) => [...mapped, ...prev]);
    }
  };

  return (
    <>
      <ViewHeader
        title="Listing Campaigns"
        subtitle="Sync listings to generate social campaigns faster."
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-8 py-10">
        <section className="rounded-lg border border-border/60 bg-secondary p-6">
          <h2 className="text-xl font-header font-medium text-foreground">
            Choose how to add your listings
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start with an MLS sync or manually upload listing details to build a
            campaign.
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Sync from MLS</CardTitle>
                <Badge variant="secondary" className="">
                  Recommended
                </Badge>
              </div>
              <CardDescription>
                Connect your MLS to import active listings and generate social
                campaigns automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We will pull listing photos, price, location, and key details
                once you connect.
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Connect MLS</Button>
            </CardFooter>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle>Manual upload</CardTitle>
              <CardDescription>
                Add listing photos and details yourself to start a campaign
                right away.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Upload media, add listing highlights, and we will turn it into a
                social-ready campaign.
              </p>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsUploadOpen(true)}
              >
                Upload manually
              </Button>
            </CardFooter>
          </Card>
        </div>
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
            <DialogTitle>Upload listing photos</DialogTitle>
            <DialogDescription>
              Add images up to {formatBytes(MAX_IMAGE_BYTES)}.
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
                accept="image/*"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background border border-border">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Drag & drop photos here
                  </p>
                  <p className="text-xs text-muted-foreground">
                    or click to select multiple images
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
                  {pendingFiles.length} photo
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
                          {formatBytes(item.file.size)}
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
              {isUploading ? "Uploading..." : "Upload photos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
