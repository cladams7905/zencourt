"use client";

import * as React from "react";
import { cn } from "@web/src/components/ui/utils";
import { useScrollFade } from "@web/src/components/shared/hooks/useScrollFade";
import type { ListingStageStep } from "@web/src/components/listings/stage/shared/domain/types";

type ListingStageTimelineProps = {
  steps: ListingStageStep[];
  className?: string;
  desktopVertical?: boolean;
};

export function ListingStageTimeline({
  steps,
  className,
  desktopVertical = false
}: ListingStageTimelineProps) {
  const { containerRef, maskImage } = useScrollFade();
  const activeIndex = React.useMemo(
    () =>
      Math.max(
        0,
        steps.findIndex((step) => step.active)
      ),
    [steps]
  );

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const activeNode = container.querySelector<HTMLElement>(
      `[data-timeline-index="${activeIndex}"]`
    );
    if (!activeNode) {
      return;
    }

    activeNode.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center"
    });
  }, [activeIndex, containerRef, steps.length]);

  const horizontalTimeline = (
    <div className={cn("mx-auto w-full", className)}>
      <div
        ref={containerRef}
        className="relative overflow-x-auto scrollbar-hide"
        style={
          maskImage ? { maskImage, WebkitMaskImage: maskImage } : undefined
        }
      >
        <div
          className="relative flex min-w-max items-start gap-0 py-1"
          style={{ paddingInline: "calc(50% - 85px)" }}
        >
          {steps.map((step, index) => (
            <div
              key={step.label}
              data-timeline-index={index}
              className="relative flex min-w-[170px] flex-col items-center gap-1.5"
            >
              {index > 0 ? (
                <div className="absolute right-1/2 top-[5px] h-px w-1/2 bg-border/60" />
              ) : null}
              {index < steps.length - 1 ? (
                <div className="absolute left-1/2 top-[5px] h-px w-1/2 bg-border/60" />
              ) : null}
              <div
                className={`h-2.5 w-2.5 rotate-45 rounded-xs ring-4 ring-background shadow-sm ${
                  step.completed || step.active
                    ? "bg-primary"
                    : "bg-background border border-border"
                }`}
              />
              <span
                className={`mt-1.5 max-w-[120px] text-center text-[11px] uppercase tracking-widest leading-tight whitespace-normal text-balance ${
                  step.active
                    ? "font-semibold text-foreground"
                    : "font-medium text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
              {step.sublabel ? (
                <span className="text-[10px] font-medium text-muted-foreground">
                  {step.sublabel}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (!desktopVertical) {
    return horizontalTimeline;
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="md:hidden">{horizontalTimeline}</div>
      <div className="hidden md:flex md:w-full md:justify-center">
        <div className="relative space-y-5 py-1">
          <div className="pointer-events-none absolute left-[5px] top-[10px] bottom-[5px] w-px bg-border/60" />
          {steps.map((step) => (
            <div key={step.label} className="relative flex items-center gap-4">
              <div
                className={`z-10 h-2.5 w-2.5 shrink-0 rotate-45 rounded-xs ring-4 ring-background shadow-sm ${
                  step.completed || step.active
                    ? "bg-primary"
                    : "bg-background border border-border"
                }`}
              />
              <div className="flex min-h-[28px] items-center">
                <div className="space-y-0.5">
                  <span
                    className={`block text-left text-[11px] uppercase tracking-widest leading-tight whitespace-normal text-balance ${
                      step.active
                        ? "font-semibold text-foreground"
                        : "font-medium text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.sublabel ? (
                    <span className="block text-[10px] font-medium text-muted-foreground">
                      {step.sublabel}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
