"use client";

import * as React from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Progress } from "@web/src/components/ui/progress";
import { LoadingImage } from "@web/src/components/ui/loading-image";

export type ListingProcessingImage = {
  id: string;
  url?: string | null;
  filename?: string | null;
  analysisStatus?: string | null;
};

type ProcessingOverlayProps = {
  batchCompleted: number;
  batchTotal: number;
  /** Main status line above the progress bar (in the overlay). */
  title?: string;
  isUploading?: boolean;
};

export function ListingUploadProcessingOverlay({
  batchCompleted,
  batchTotal,
  title,
  isUploading = false
}: ProcessingOverlayProps) {
  const progress = batchTotal > 0 ? (batchCompleted / batchTotal) * 100 : 0;
  const label =
    title ??
    (isUploading
      ? "Uploading your listing photos…"
      : "Analyzing your listing photos with AI…");

  const countLabel =
    batchTotal > 0
      ? `${batchCompleted}/${batchTotal} images processed`
      : isUploading
        ? "Preparing your upload…"
        : "Preparing…";

  return (
    <div className="w-full max-w-xl bg-background/70 border border-border backdrop-blur-sm shadow-lg py-3 rounded-xl space-y-3 px-6">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">{label}</p>
        {!isUploading ? (
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin text-primary"
            aria-hidden
          />
        ) : null}
      </div>
      <Progress
        value={batchTotal > 0 ? progress : 0}
        className="h-2 border-0 bg-muted/70"
      />
      <p className="text-sm tabular-nums text-foreground">{countLabel}</p>
    </div>
  );
}

type ListingUploadAiProcessingPanelProps = {
  images: ListingProcessingImage[];
  batchCompleted: number;
  batchTotal: number;
  /** Main status line above the progress bar (in the overlay). */
  title?: string;
  isUploading?: boolean;
};

function getStatusIcon(status?: string | null) {
  if (status === "complete") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  }
  if (status === "failed") {
    return <XCircle className="h-4 w-4 text-destructive" />;
  }
  return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
}

export function ListingUploadAiProcessingPanel({
  images,
  batchCompleted,
  batchTotal,
  title,
  isUploading = false
}: ListingUploadAiProcessingPanelProps) {
  const visibleSlots: Array<ListingProcessingImage | null> =
    images.length > 0
      ? images.slice(0, Math.max(6, images.length))
      : Array.from({ length: 6 }, () => null);

  return (
    <div className="relative flex min-h-[520px] w-full overflow-hidden rounded-3xl bg-muted/20">
      <div className="grid flex-1 grid-cols-2 gap-3 p-4 md:grid-cols-3">
        {visibleSlots.map((image, index) => (
          <div
            key={image?.id ?? `placeholder-${index}`}
            className="relative aspect-4/3 overflow-hidden rounded-2xl border border-border/60 bg-secondary/70"
          >
            {image?.url ? (
              <LoadingImage
                src={image.url}
                alt={image.filename ?? "Listing image"}
                fill
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full animate-pulse bg-linear-to-br from-muted to-secondary" />
            )}
            {image ? (
              <div className="absolute right-2 top-2 rounded-full bg-background/90 p-1 shadow-sm">
                {getStatusIcon(image.analysisStatus)}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-background/45 p-6 backdrop-blur-md">
        <ListingUploadProcessingOverlay
          batchCompleted={batchCompleted}
          batchTotal={batchTotal}
          title={title}
          isUploading={isUploading}
        />
      </div>
    </div>
  );
}
