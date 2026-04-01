"use client";

import { AlertTriangle, Check, ImageIcon, Upload, X } from "lucide-react";
import { IMAGE_UPLOAD_LIMIT, MAX_IMAGE_BYTES } from "@shared/utils/mediaUpload";
import {
  getListingImageRecommendationIssues,
  useListingUploadView
} from "@web/src/components/listings/stage/upload/domain";
import { UploadDialog } from "@web/src/components/uploads";
import {
  UploadDropzone,
  UploadRequirementsCard
} from "@web/src/components/uploads/subcomponents";
import { Badge } from "@web/src/components/ui/badge";
import { Button } from "@web/src/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@web/src/components/ui/tooltip";
import {
  ListingStageFooter,
  ListingStageShell
} from "@web/src/components/listings/stage/shared";
import { ListingUploadProcessingOverlay } from "@web/src/components/listings/stage/upload/subcomponents/ListingUploadAiProcessingPanel";
import { GalleryViewportCenteredOverlay } from "@web/src/components/listings/stage/upload/subcomponents/GalleryViewportCenteredOverlay";
import Image from "next/image";
import * as React from "react";

type ListingUploadViewProps = {
  listingId?: string;
  initialImages?: Array<{
    id: string;
    url: string;
    filename: string;
  }>;
};

function BlurredProcessingGrid({
  cells
}: {
  cells: Array<{ id: string; src: string; alt: string }>;
}) {
  const slots =
    cells.length > 0
      ? cells
      : Array.from({ length: 6 }, (_, i) => ({
          id: `placeholder-${i}`,
          src: "",
          alt: ""
        }));

  return (
    <div
      aria-hidden
      className="pointer-events-none grid grid-cols-2 gap-2 select-none blur-xs border border-border sm:grid-cols-3 lg:grid-cols-4"
    >
      {slots.map((cell, index) => (
        <div
          key={cell.id ?? `ph-${index}`}
          className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted/20"
        >
          {cell.src ? (
            <Image
              src={cell.src}
              alt={cell.alt}
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          ) : (
            <div className="h-full w-full animate-pulse bg-linear-to-br from-muted to-secondary" />
          )}
        </div>
      ))}
    </div>
  );
}

export function ListingUploadView({
  listingId,
  initialImages = []
}: ListingUploadViewProps = {}) {
  const {
    phase,
    initialImages: existingImages,
    processingState,
    isInlineProcessing,
    processingLocalPreviews,
    pendingFiles,
    isDragging,
    setIsDragging,
    setIsDrivePickerActive,
    isCompressing,
    isDriveLoading,
    driveLoadingCount,
    setIsDriveLoading,
    setDriveLoadingCount,
    fileInputRef,
    handleCandidateFiles,
    handleFileInputChange,
    uploadRequirements,
    canContinue,
    handleContinue,
    handleBack,
    isUploadMoreOpen,
    setIsUploadMoreOpen,
    removePendingFile,
    naturalSizeById,
    setNaturalSizeById
  } = useListingUploadView({ listingId, initialImages });

  const totalGalleryCount = existingImages.length + pendingFiles.length;

  const processingGalleryCells = React.useMemo(() => {
    if (processingLocalPreviews.length > 0) {
      return processingLocalPreviews.map((p) => ({
        id: p.id,
        src: p.previewUrl,
        alt: p.name
      }));
    }
    if (phase === "analyzing" && processingState.batchImages.length > 0) {
      return processingState.batchImages.map((img) => ({
        id: img.id,
        src: img.url ?? "",
        alt: img.filename ?? "Listing image"
      }));
    }
    return [];
  }, [phase, processingLocalPreviews, processingState.batchImages]);

  const processingPhotoCount =
    processingLocalPreviews.length > 0
      ? processingLocalPreviews.length
      : phase === "analyzing"
        ? processingState.batchTotal
        : Math.max(pendingFiles.length, processingState.batchTotal);

  const processingGalleryBoundaryRef = React.useRef<HTMLDivElement>(null);

  return (
    <>
      <ListingStageShell
        stage="upload"
        wide
        footer={
          <ListingStageFooter
            onBack={handleBack}
            onContinue={() => void handleContinue()}
            canBack={!isInlineProcessing}
            canContinue={!isInlineProcessing && canContinue}
          />
        }
      >
        {isInlineProcessing ? (
          <div className="shrink-0 rounded-lg border border-border bg-background p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  My Listing Photos
                </div>
                <Badge variant="muted" className="text-muted-foreground">
                  <ImageIcon className="size-3" aria-hidden />
                  {processingPhotoCount}/{IMAGE_UPLOAD_LIMIT}
                </Badge>
              </div>
              <Button
                type="button"
                variant="default"
                disabled
                aria-disabled="true"
                title="Available after processing finishes"
              >
                <Upload className="h-4 w-4" />
                Upload more
              </Button>
            </div>
            <div
              ref={processingGalleryBoundaryRef}
              className="relative overflow-hidden rounded-md"
            >
              <BlurredProcessingGrid cells={processingGalleryCells} />
              <div
                className="pointer-events-none absolute inset-0 bg-background/40"
                aria-hidden
              />
              <GalleryViewportCenteredOverlay
                boundaryRef={processingGalleryBoundaryRef}
              >
                <ListingUploadProcessingOverlay
                  batchCompleted={
                    phase === "analyzing" ? processingState.batchCompleted : 0
                  }
                  batchTotal={
                    phase === "analyzing" ? processingState.batchTotal : 0
                  }
                  processingCount={
                    phase === "analyzing" ? processingState.processingCount : 0
                  }
                  title="Analyzing your listing photos with AI…"
                  isUploading={phase === "uploading"}
                />
              </GalleryViewportCenteredOverlay>
            </div>
          </div>
        ) : (
          <section className="flex min-h-0 w-full flex-1 flex-col gap-3">
            {totalGalleryCount === 0 ? (
              <UploadDropzone
                fillContainer
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                onDropFiles={(files) => {
                  void handleCandidateFiles(files);
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
            ) : null}
            {totalGalleryCount === 0 ? (
              <UploadRequirementsCard requirements={uploadRequirements} />
            ) : null}

            {existingImages.length > 0 ||
            pendingFiles.length > 0 ||
            isCompressing ||
            (isDriveLoading && driveLoadingCount > 0) ? (
              <div className="shrink-0 rounded-lg border border-border bg-background p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      My Listing Photos
                    </div>
                    <Badge variant="muted" className="text-muted-foreground">
                      <ImageIcon className="size-3" aria-hidden />
                      {totalGalleryCount}/{IMAGE_UPLOAD_LIMIT}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => setIsUploadMoreOpen(true)}
                  >
                    <Upload className="h-4 w-4" />
                    Upload more
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {pendingFiles.map((item) => {
                    const natural = naturalSizeById[item.id];
                    const recommendationIssues = natural
                      ? getListingImageRecommendationIssues(
                          natural.width,
                          natural.height
                        )
                      : [];
                    const showRecommendationWarning =
                      recommendationIssues.length > 0;

                    return (
                      <div
                        key={item.id}
                        className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted/20"
                      >
                        <Image
                          src={item.previewUrl}
                          alt={item.file.name}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                          onLoad={(event) => {
                            const img = event.currentTarget;
                            setNaturalSizeById((prev) => ({
                              ...prev,
                              [item.id]: {
                                width: img.naturalWidth,
                                height: img.naturalHeight
                              }
                            }));
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removePendingFile(item.id)}
                          className="absolute right-1 top-1 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground group-hover:pointer-events-auto group-hover:opacity-100 pointer-events-none"
                          aria-label={`Remove ${item.file.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        {showRecommendationWarning ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="absolute right-1 top-1 z-5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-amber-600 shadow-sm transition-transform duration-200 ease-out group-hover:-translate-x-7"
                                aria-label="Image does not match recommended dimensions"
                              >
                                <AlertTriangle
                                  className="h-3.5 w-3.5"
                                  aria-hidden
                                />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="w-max max-w-[200px] text-left text-pretty"
                            >
                              <div className="flex min-w-0 flex-col items-start gap-1.5">
                                {recommendationIssues.map((line, i) => (
                                  <p key={i} className="m-0 max-w-full">
                                    {line}
                                  </p>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>
                    );
                  })}
                  {existingImages.map((item) => (
                    <div
                      key={item.id}
                      className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted/20"
                    >
                      <Image
                        src={item.url}
                        alt={item.filename}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="absolute right-1 top-1 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
                            aria-label="Previously uploaded listing photo"
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Previously uploaded to this listing
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        )}
      </ListingStageShell>
      <UploadDialog
        open={isUploadMoreOpen}
        onOpenChange={setIsUploadMoreOpen}
        title="Upload more listing photos"
        accept="image/*"
        dropTitle="Drag & drop photos here"
        dropSubtitle="or click to select multiple images"
        primaryActionLabel="Upload"
        selectedLabel="photo"
        errorMessage="Failed to upload photos. Please try again."
        maxFiles={Math.max(IMAGE_UPLOAD_LIMIT - totalGalleryCount, 0)}
        maxImageBytes={MAX_IMAGE_BYTES}
        compressDriveImages={false}
        compressOversizeImages={false}
        tipsTitle="Upload requirements"
        tipsItems={uploadRequirements}
        fileValidator={(file) =>
          file.type.startsWith("image/")
            ? { accepted: true }
            : {
                accepted: false,
                error: "Only image files are supported."
              }
        }
        getUploadUrls={async () => ({ uploads: [], failed: [] })}
        buildRecordInput={async () => ({})}
        onCreateRecords={async () => {}}
        clientUploadHandler={async (files) => {
          await handleCandidateFiles(files);
        }}
      />
    </>
  );
}
