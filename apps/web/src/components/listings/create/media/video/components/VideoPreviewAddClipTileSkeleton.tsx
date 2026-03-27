import * as React from "react";
import { Loader2 } from "lucide-react";

const TILE_CLASS =
  "group mb-1.5 w-full max-w-[7.25rem] mx-auto break-inside-avoid overflow-hidden rounded-md bg-muted";

export function VideoPreviewAddClipTileSkeleton() {
  return (
    <div className={TILE_CLASS} aria-hidden>
      <div className="relative aspect-9/16 w-full overflow-hidden rounded-md bg-secondary animate-pulse">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/70" />
        </div>
      </div>
    </div>
  );
}
