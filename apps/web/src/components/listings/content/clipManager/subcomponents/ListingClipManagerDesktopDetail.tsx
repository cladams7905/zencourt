"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@web/src/components/ui/utils";

export function ListingClipManagerDesktopDetail({
  roomName,
  generatedAtLabel,
  durationLabel,
  isRegenerating,
  actions,
  player
}: {
  roomName?: string | null;
  generatedAtLabel: string;
  durationLabel: string;
  isRegenerating: boolean;
  actions: React.ReactNode;
  player: React.ReactNode;
}) {
  return (
    <div
      data-testid="desktop-clip-detail"
      className={cn(
        "relative grid gap-4 rounded-xl border border-border bg-background",
        "lg:min-h-0 lg:grid-rows-[minmax(0,1fr)]"
      )}
    >
      <div className="absolute inset-x-0 top-0 z-10 rounded-t-xl border-b border-border bg-background px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-medium text-foreground">
              {roomName ?? "Selected clip"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {generatedAtLabel}
            </p>
          </div>
          {isRegenerating ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <span>Regenerating</span>
              <Loader2 className="h-4 w-4 animate-spin" />
            </span>
          ) : (
            <p className="text-xs text-muted-foreground">{durationLabel}</p>
          )}
        </div>
      </div>

      <div
        className={cn(
          "grid min-h-0 min-w-0 gap-3 px-4 pb-4 pt-[88px] max-lg:min-h-min",
          "lg:h-full lg:grid-rows-[auto_minmax(0,1fr)]"
        )}
      >
        {actions}
        {player}
      </div>
    </div>
  );
}
