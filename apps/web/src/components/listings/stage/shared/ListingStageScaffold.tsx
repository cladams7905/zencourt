import * as React from "react";
import {
  ListingStageTimeline,
  type ListingStageStep
} from "@web/src/components/listings/stage/shared";
import { cn } from "@web/src/components/ui/utils";
import { ListingStageStepHeader } from "./ListingStageStepHeader";

type ListingStageScaffoldProps = {
  steps: ListingStageStep[];
  stepTitle: string;
  stepSubtitle?: string;
  children: React.ReactNode;
  /** Wider main column for multi-column stages (categorize, review, upload). */
  wide?: boolean;
};

export function ListingStageScaffold({
  steps,
  stepTitle,
  stepSubtitle,
  children,
  wide = false
}: ListingStageScaffoldProps) {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col rounded-lg lg:px-6 pt-6">
      <section className="flex min-h-0 w-full flex-1 flex-col text-left lg:flex-row lg:items-stretch">
        <div
          className={cn(
            "w-full shrink-0 lg:flex lg:w-[260px] lg:shrink-0 lg:justify-center lg:pr-6 lg:pb-0 lg:pt-0 lg:min-h-0",
            "max-lg:flex max-lg:items-center max-lg:justify-center max-lg:pb-4"
          )}
        >
          <ListingStageTimeline steps={steps} desktopVertical />
        </div>
        <div className="h-px w-full shrink-0 bg-border/80 lg:mx-6 lg:h-auto lg:w-px lg:self-stretch" />
        <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-y-auto overscroll-y-contain">
          <div
            className={cn(
              "mx-auto flex min-h-0 w-full flex-1 flex-col",
              wide ? "max-w-5xl" : "max-w-lg"
            )}
          >
            <ListingStageStepHeader title={stepTitle} subtitle={stepSubtitle} />
            <div className="flex min-h-0 w-full flex-1 flex-col">
              {children}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
