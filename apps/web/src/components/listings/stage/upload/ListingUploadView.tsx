"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { IMAGE_UPLOAD_LIMIT, MAX_IMAGE_BYTES } from "@shared/utils/mediaUpload";
import { formatBytes } from "@web/src/lib/core/formatting/bytes";
import {
  validateImageFile,
  useUploadFlow
} from "@web/src/components/listings/stage/upload/domain";
import { useUploadDialogState } from "@web/src/components/uploads/domain/hooks";
import {
  UploadDropzone,
  UploadQueueList
} from "@web/src/components/uploads/subcomponents";
import { ListingStageShell } from "@web/src/components/listings/stage/shared";
import { useRouter } from "next/navigation";

type ListingUploadViewProps = {
  listingId?: string;
};

export function ListingUploadView({ listingId }: ListingUploadViewProps = {}) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const {
    getUploadUrls,
    buildRecordInput,
    onCreateRecords,
    onUploadsComplete
  } = useUploadFlow({
    navigate: router.push,
    listingId
  });
  const {
    pendingFiles,
    isDragging,
    setIsDragging,
    isUploading,
    setIsDrivePickerActive,
    isCompressing,
    isDriveLoading,
    setIsDriveLoading,
    driveLoadingCount,
    setDriveLoadingCount,
    addFiles,
    removePendingFile
  } = useUploadDialogState({
    open: true,
    onOpenChange: () => {},
    selectedLabel: "photo",
    errorMessage: "Failed to upload photos. Please try again.",
    maxFiles: IMAGE_UPLOAD_LIMIT,
    maxImageBytes: MAX_IMAGE_BYTES,
    compressOversizeImages: true,
    fileValidator: validateImageFile,
    getUploadUrls,
    buildRecordInput,
    onCreateRecords,
    onUploadsComplete
  });

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    void addFiles(files);
    event.target.value = "";
  };

  const uploadRequirements = React.useMemo(
    () => [
      `Each image must be ${formatBytes(MAX_IMAGE_BYTES)} or less`,
      "Between 3 to 40 images (we'll organize them later for you)",
      "Recommended 1280x720px or larger",
      "Landscape orientation"
    ],
    []
  );

  return (
    <ListingStageShell stage="upload" wide>
      <section className="flex min-h-0 w-full flex-1 flex-col gap-3">
        <UploadDropzone
          fillContainer
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          onDropFiles={(files) => {
            void addFiles(files);
          }}
          className="lg:min-h-[380px] min-h-[260px]"
          accept="image/*"
          dropTitle="Drag & drop photos here"
          dropSubtitle="or click to select multiple images"
          fileInputRef={fileInputRef}
          onFileInputChange={handleFileInputChange}
          onPickerOpenChange={setIsDrivePickerActive}
          maxImageBytes={MAX_IMAGE_BYTES}
          compressDriveImages
          onDriveLoadingChange={setIsDriveLoading}
          onDriveLoadingCountChange={setDriveLoadingCount}
        />
        <div className="w-full shrink-0 rounded-lg border border-border bg-background/60 p-3 text-left">
          <div className="grid w-full grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {uploadRequirements.map((requirement) => (
              <div
                key={requirement}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-2.5 w-2.5" />
                </span>
                <span>{requirement}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0">
          <UploadQueueList
            pendingFiles={pendingFiles}
            selectedLabel="photo"
            isCompressing={isCompressing}
            isDriveLoading={isDriveLoading}
            driveLoadingCount={driveLoadingCount}
            isUploading={isUploading}
            fileMetaLabel={(file: File) => formatBytes(file.size)}
            formatBytes={formatBytes}
            onRemove={removePendingFile}
          />
        </div>
      </section>
    </ListingStageShell>
  );
}
