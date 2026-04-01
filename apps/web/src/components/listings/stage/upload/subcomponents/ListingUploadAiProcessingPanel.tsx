"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";
import { Progress } from "@web/src/components/ui/progress";

type ProcessingImage = {
  id: string;
  url?: string | null;
  filename?: string | null;
  analysisStatus?: string | null;
};

type ListingUploadAiProcessingPanelProps = {
  images: ProcessingImage[];
  batchCompleted: number;
  batchTotal: number;
  title?: string;
  subtitle?: string;
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
  title = "Analyzing your listing photos with AI",
  subtitle = "We’re organizing the batch you just uploaded so the categorize step opens already sorted.",
  isUploading = false
}: ListingUploadAiProcessingPanelProps) {
  const progress = batchTotal > 0 ? (batchCompleted / batchTotal) * 100 : 0;
  const visibleImages: Array<ProcessingImage | null> =
    images.length > 0
      ? images.slice(0, Math.max(6, images.length))
      : Array.from({ length: 6 }, () => null);
  const isInitialLoading = batchTotal > 0 && images.length === 0;

  return (
    <div className="relative flex min-h-[520px] w-full overflow-hidden rounded-3xl border border-border bg-muted/20">
      <div className="grid flex-1 grid-cols-2 gap-3 p-4 md:grid-cols-3">
        {(isInitialLoading ? visibleImages : visibleImages).map(
          (image, index) => (
            <div
              key={image?.id ?? `placeholder-${index}`}
              className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-secondary/70"
            >
              {image?.url ? (
                <img
                  src={image.url}
                  alt={image.filename ?? "Listing image"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full animate-pulse bg-gradient-to-br from-muted to-secondary" />
              )}
              {image ? (
                <div className="absolute right-2 top-2 rounded-full bg-background/90 p-1 shadow-sm">
                  {getStatusIcon(image.analysisStatus)}
                </div>
              ) : null}
            </div>
          )
        )}
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-background/45 p-6 backdrop-blur-md">
        <div className="w-full max-w-xl rounded-3xl border border-border bg-background/90 p-6 shadow-xl">
          <div className="mb-5 flex items-center gap-3 text-primary">
            <div className="rounded-full bg-primary/10 p-2">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {isUploading ? "Uploading" : "AI processing"}
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-header text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="mt-6 space-y-3">
            <Progress value={progress} />
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {batchTotal > 0
                  ? `${batchCompleted}/${batchTotal} images processed`
                  : "Preparing your upload batch"}
              </span>
              <span className="font-medium text-foreground">
                {batchTotal > 0 ? `${Math.round(progress)}%` : "Working..."}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
