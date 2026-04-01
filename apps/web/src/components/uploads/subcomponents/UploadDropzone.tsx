"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { Button } from "../../ui/button";
import { cn } from "../../ui/utils";
import { GoogleDriveUploadButton } from "./GoogleDriveUploadButton";

interface UploadDropzoneProps {
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
  onDropFiles: (files: File[]) => void;
  accept: string;
  dropTitle: string;
  dropSubtitle: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPickerOpenChange: (open: boolean) => void;
  maxImageBytes?: number;
  compressDriveImages?: boolean;
  onDriveLoadingChange: (loading: boolean) => void;
  onDriveLoadingCountChange: (count: number) => void;
  /** Fills parent flex area; minimal bottom padding and rounded corners (listing stage). */
  fillContainer?: boolean;
  /** Merged onto the root element (e.g. `lg:min-h-[20rem]`). */
  className?: string;
}

export function UploadDropzone({
  isDragging,
  setIsDragging,
  onDropFiles,
  accept,
  dropTitle,
  dropSubtitle,
  fileInputRef,
  onFileInputChange,
  onPickerOpenChange,
  maxImageBytes,
  compressDriveImages,
  onDriveLoadingChange,
  onDriveLoadingCountChange,
  fillContainer = false,
  className
}: UploadDropzoneProps) {
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    onDropFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div
      className={cn(
        "border border-dashed text-center",
        fillContainer
          ? "flex min-h-0 w-full flex-1 flex-col rounded-lg px-0 pt-0"
          : "rounded-lg px-6 py-10",
        isDragging ? "border-foreground/40 bg-secondary" : "border-border",
        className
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsDragging(false);
        }
      }}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={onFileInputChange}
      />
      <div
        className={cn(
          "flex flex-col items-center gap-2 space-y-2",
          fillContainer && "min-h-0 flex-1"
        )}
      >
        <div
          className={cn(
            "flex flex-col items-center gap-2 space-y-3",
            fillContainer && "flex-1 justify-center"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background border border-border">
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{dropTitle}</p>
            <p className="text-xs text-muted-foreground">{dropSubtitle}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button size="sm" variant="outline" type="button">
              Browse files
            </Button>
            <GoogleDriveUploadButton
              size="sm"
              variant="outline"
              className="gap-1"
              onFilesSelected={onDropFiles}
              accept={accept}
              onPickerOpenChange={onPickerOpenChange}
              maxImageBytes={maxImageBytes}
              compressImages={compressDriveImages}
              onLoadingChange={onDriveLoadingChange}
              onLoadingCountChange={onDriveLoadingCountChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
