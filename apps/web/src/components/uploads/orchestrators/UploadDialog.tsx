"use client";

import * as React from "react";
import { formatBytes } from "@web/src/lib/core/formatting/bytes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../ui/dialog";
import { useUploadDialogState } from "../domain/hooks";
import {
  UploadDialogActions,
  UploadDropzone,
  UploadQueueList,
  UploadTips
} from "../components";
import type {
  UploadDialogProps,
  UploadDescriptor,
  UploadRequest
} from "../shared";

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
  tipsTitle,
  tipsItems,
  fileValidator,
  getUploadUrls,
  buildRecordInput,
  onCreateRecords,
  onSuccess,
  onUploadsComplete,
  fileMetaLabel,
  thumbnailFailureMessage,
  maxFiles,
  maxImageBytes,
  compressDriveImages,
  compressOversizeImages
}: UploadDialogProps<TRecord>) {
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
  } = useUploadDialogState<TRecord>({
    open,
    onOpenChange,
    selectedLabel,
    errorMessage,
    fileValidator,
    getUploadUrls,
    buildRecordInput,
    onCreateRecords,
    onSuccess,
    onUploadsComplete,
    thumbnailFailureMessage,
    maxFiles,
    maxImageBytes,
    compressOversizeImages
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    void addFiles(files);
    event.target.value = "";
  };

  return (
    <Dialog
      open={open}
      modal
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          resetDialogState();
        }
      }}
    >
      <DialogContent
        className="sm:max-w-[680px]"
        style={isDrivePickerActive ? { pointerEvents: "none" } : undefined}
        overlayClassName={
          isDrivePickerActive ? "pointer-events-none" : undefined
        }
        onInteractOutside={(event) => {
          if (isDrivePickerActive) {
            event.preventDefault();
          }
        }}
        onEscapeKeyDown={(event) => {
          if (isDrivePickerActive) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="space-y-4">
          <UploadDropzone
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            onDropFiles={(files) => {
              void addFiles(files);
            }}
            accept={accept}
            dropTitle={dropTitle}
            dropSubtitle={dropSubtitle}
            fileInputRef={fileInputRef}
            onFileInputChange={handleFileInputChange}
            onPickerOpenChange={setIsDrivePickerActive}
            maxImageBytes={maxImageBytes}
            compressDriveImages={compressDriveImages}
            onDriveLoadingChange={setIsDriveLoading}
            onDriveLoadingCountChange={setDriveLoadingCount}
          />

          <UploadTips tipsTitle={tipsTitle} tipsItems={tipsItems} />

          <UploadQueueList
            pendingFiles={pendingFiles}
            selectedLabel={selectedLabel}
            isCompressing={isCompressing}
            isDriveLoading={isDriveLoading}
            driveLoadingCount={driveLoadingCount}
            isUploading={isUploading}
            fileMetaLabel={fileMetaLabel}
            formatBytes={formatBytes}
            onRemove={removePendingFile}
          />
        </div>
        <DialogFooter>
          <UploadDialogActions
            hasFailedUploads={hasFailedUploads}
            onRetryFailed={handleRetryFailed}
            onCancel={() => onOpenChange(false)}
            onUpload={handleUpload}
            isUploading={isUploading}
            hasPendingFiles={pendingFiles.length > 0}
            primaryActionLabel={primaryActionLabel}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { UploadDialog };
export type { UploadDescriptor, UploadRequest };
