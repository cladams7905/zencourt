"use client";

import * as React from "react";
import { ViewHeader } from "../../view/ViewHeader";
import {
  IMAGE_UPLOAD_LIMIT,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_ROOM
} from "@shared/utils/mediaUpload";
import { formatBytes } from "@web/src/lib/core/formatting/bytes";
import {
  validateImageFile,
  useUploadFlow
} from "@web/src/components/listings/upload/domain";
import { useUploadDialogState } from "@web/src/components/uploads/domain/hooks";
import {
  UploadDialogActions,
  UploadDropzone,
  UploadQueueList,
  UploadTips
} from "@web/src/components/uploads/components";
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
    isDrivePickerActive,
    setIsDrivePickerActive,
    isCompressing,
    isDriveLoading,
    setIsDriveLoading,
    driveLoadingCount,
    setDriveLoadingCount,
    addFiles,
    resetDialogState,
    handleUpload,
    hasFailedUploads,
    handleRetryFailed,
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

  return (
    <>
      <ViewHeader
        title="Upload listing photos"
        subtitle="Add your listing photos below."
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-8 py-10">
        <section className="space-y-4 rounded-lg bg-background p-6">
          <p className="text-sm text-muted-foreground">
            Add images up to {formatBytes(MAX_IMAGE_BYTES)}.
          </p>

          <UploadDropzone
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            onDropFiles={(files) => {
              void addFiles(files);
            }}
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

          <UploadTips
            tipsTitle="What photos should I upload?"
            tipsItems={[
              `No more than ${IMAGE_UPLOAD_LIMIT} listing photos may be uploaded per listing.`,
              `Limit each room category to ${MAX_IMAGES_PER_ROOM} photos for video generation.`,
              "Include a wide variety well-framed shots of key rooms and exterior."
            ]}
          />

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

          <div className="flex justify-end gap-2">
            <UploadDialogActions
              hasFailedUploads={hasFailedUploads}
              onRetryFailed={handleRetryFailed}
              onCancel={resetDialogState}
              onUpload={handleUpload}
              isUploading={isUploading || isDrivePickerActive}
              hasPendingFiles={pendingFiles.length > 0}
              primaryActionLabel="Upload photos"
            />
          </div>
        </section>
      </div>
    </>
  );
}
