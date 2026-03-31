"use client";

import * as React from "react";
import { cn } from "@web/src/components/ui/utils";

export function ListingClipManagerVideoPlayer({
  videoUrl,
  posterUrl
}: {
  videoUrl?: string | null;
  posterUrl?: string | null;
}) {
  return (
    <div className="flex min-h-0 min-w-0 justify-center max-lg:min-h-[min(52dvh,26rem)] lg:h-full">
      <div
        data-testid="clip-preview-viewport"
        className={cn(
          "relative aspect-9/16 w-full max-w-60 overflow-hidden rounded-xl bg-card shadow-sm",
          "lg:h-full lg:min-h-0 lg:w-auto lg:max-w-full"
        )}
      >
        {videoUrl ? (
          <video
            key={videoUrl}
            src={videoUrl}
            poster={posterUrl ?? undefined}
            controls
            playsInline
            className="absolute inset-0 block h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-3 text-center text-sm text-muted-foreground">
            No playable version available yet.
          </div>
        )}
      </div>
    </div>
  );
}
