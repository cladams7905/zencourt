"use client";

import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@web/src/components/ui/accordion";
import { cn } from "@web/src/components/ui/utils";
import { useScrollFade } from "@web/src/components/shared/hooks/useScrollFade";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@web/src/components/ui/tooltip";
import {
  UNUSED_DOCK_DROP_ZONE_ID,
  type ListingImageItem
} from "@web/src/components/listings/stage/plan/shared";
import { PlanImageCard } from "./PlanImageCard";

type PlanUnusedDockProps = {
  dockedImages: ListingImageItem[];
  dragOverCategory: string | null;
  onGlobalUnusedDockDragOver: () => void;
  onGlobalUnusedDockDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  handleDragStart: (
    imageId: string
  ) => (event: React.DragEvent<HTMLDivElement>) => void;
  handleDragEnd: () => void;
  handleGlobalUnusedDockDrop: (
    event: React.DragEvent<HTMLDivElement>
  ) => void | Promise<void>;
};

export function PlanUnusedDock({
  dockedImages,
  dragOverCategory,
  onGlobalUnusedDockDragOver,
  onGlobalUnusedDockDragLeave,
  handleDragStart,
  handleDragEnd,
  handleGlobalUnusedDockDrop
}: PlanUnusedDockProps) {
  const { containerRef, maskImage } = useScrollFade();
  const globalDockHighlight = dragOverCategory === UNUSED_DOCK_DROP_ZONE_ID;
  const count = dockedImages.length;
  const [value, setValue] = React.useState<string>("");
  const unusedPhotosSummary =
    count === 0 ? `${count}` : `${count} photos will not be used in any videos`;

  React.useEffect(() => {
    if (dragOverCategory !== UNUSED_DOCK_DROP_ZONE_ID) {
      return;
    }
    setValue("unused-dock");
  }, [dragOverCategory]);

  return (
    <div className="w-full min-w-0">
      <div
        className={cn(
          "w-full rounded-lg border border-dashed px-2 py-1 transition-colors",
          globalDockHighlight
            ? "border-foreground/40 bg-secondary"
            : "border-border/80 bg-muted/15"
        )}
        onDragOver={(event) => {
          event.preventDefault();
          onGlobalUnusedDockDragOver();
        }}
        onDragLeave={onGlobalUnusedDockDragLeave}
        onDrop={handleGlobalUnusedDockDrop}
      >
        <Accordion
          type="single"
          collapsible
          className="w-full"
          value={value}
          onValueChange={(nextValue) => setValue(nextValue || "")}
        >
          <AccordionItem value="unused-dock" className="border-0 shadow-none!">
            <AccordionTrigger className="min-h-10 gap-2 py-2 text-xs font-medium hover:no-underline sm:text-sm">
              <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left sm:flex-row sm:items-baseline sm:gap-2">
                <span>Unused photos</span>
                <span className="flex items-center gap-1.5 font-normal text-muted-foreground">
                  <span>{unusedPhotosSummary}</span>
                  {count > 0 ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label="Unused photo ranking info"
                          className="inline-flex size-4 items-center justify-center rounded-full border border-border bg-background shadow-sm text-[10px] font-semibold text-muted-foreground transition-colors hover:border-border hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter" && event.key !== " ") {
                              return;
                            }

                            event.preventDefault();
                            event.stopPropagation();
                          }}
                        >
                          ?
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        sideOffset={8}
                        className="max-w-64"
                      >
                        We use an AI ranking algorithm to determine which photos
                        would make the best starting video scenes for each
                        property. Any unused photos can still be added as video
                        scenes if preferred.
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="py-2">
              {count === 0 ? (
                <p className="px-1 pb-1 text-[11px] leading-relaxed text-muted-foreground">
                  Drag photos here to remove them as a video starting frame.
                </p>
              ) : (
                <div
                  ref={containerRef}
                  className="relative overflow-x-auto [scrollbar-gutter:stable_both-edges]"
                  style={
                    maskImage
                      ? { maskImage, WebkitMaskImage: maskImage }
                      : undefined
                  }
                >
                  <div className="flex min-h-0 min-w-min items-stretch gap-2 py-0.5">
                    {dockedImages.map((image) => (
                      <PlanImageCard
                        key={image.id}
                        image={image}
                        size="row"
                        visualVariant="muted"
                        handleDragStart={handleDragStart}
                        handleDragEnd={handleDragEnd}
                      />
                    ))}
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
