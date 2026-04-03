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
  UNUSED_DOCK_DROP_ZONE_ID,
  type ListingImageItem
} from "@web/src/components/listings/stage/categorize/shared";
import { CategorizeImageCard } from "./CategorizeImageCard";

type CategorizeUnusedDockProps = {
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

export function CategorizeUnusedDock({
  dockedImages,
  dragOverCategory,
  onGlobalUnusedDockDragOver,
  onGlobalUnusedDockDragLeave,
  handleDragStart,
  handleDragEnd,
  handleGlobalUnusedDockDrop
}: CategorizeUnusedDockProps) {
  const { containerRef, maskImage } = useScrollFade();
  const globalDockHighlight = dragOverCategory === UNUSED_DOCK_DROP_ZONE_ID;
  const count = dockedImages.length;
  const getInitialValue = React.useCallback(() => {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      return window.matchMedia("(min-width: 1024px)").matches
        ? "unused-dock"
        : count > 0
          ? "unused-dock"
          : "";
    }

    return count > 0 ? "unused-dock" : "";
  }, [count]);
  const [value, setValue] = React.useState<string | undefined>(() =>
    getInitialValue()
  );

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const syncValue = (matchesDesktop: boolean) => {
      setValue((current) => {
        if (matchesDesktop) {
          return "unused-dock";
        }
        if (current) {
          return current;
        }
        return count > 0 ? "unused-dock" : "";
      });
    };

    syncValue(desktopQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncValue(event.matches);
    };

    desktopQuery.addEventListener("change", handleChange);
    return () => {
      desktopQuery.removeEventListener("change", handleChange);
    };
  }, [count]);

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
                <span className="font-normal text-muted-foreground">
                  {count === 0
                    ? `${count}`
                    : `${count} photos will not be used in any videos`}
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
                      <CategorizeImageCard
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
