"use client";

import * as React from "react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@web/src/components/ui/accordion";
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

  return (
    <ListingStageShell stage="upload" wide>
      <section className="flex min-h-0 w-full flex-1 flex-col gap-3">
        <Accordion type="single" collapsible className="w-full shrink-0">
          <AccordionItem
            value="photo-tips"
            className="border border-border px-3"
          >
            <AccordionTrigger className="py-3 text-sm">
              What listing photos should I upload?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              <ul className="list-disc space-y-2 pb-1 pl-5 text-sm leading-relaxed">
                <li>
                  Add landscape orientation images at least 1080px for best
                  results.
                </li>
                <li>
                  Images should clearly show the room or feature you want to
                  highlight with good lighting and quality.
                </li>
                <li>
                  Each individual image cannot be above{" "}
                  {formatBytes(MAX_IMAGE_BYTES)}.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

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
