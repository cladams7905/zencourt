import * as React from "react";
import { Loader2 } from "lucide-react";

export function ImagePreviewSkeletonCard() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-secondary animate-pulse">
      <div className="aspect-square w-full" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/70" />
      </div>
    </div>
  );
}
