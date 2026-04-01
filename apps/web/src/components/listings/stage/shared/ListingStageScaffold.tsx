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
  /** Renders at the bottom of the step-details column only (not under the timeline). */
  footer?: React.ReactNode;
};

export function ListingStageScaffold({
  steps,
  stepTitle,
  stepSubtitle,
  children,
  wide = false,
  footer
}: ListingStageScaffoldProps) {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col rounded-lg pt-6 lg:px-6 lg:pb-10">
      <section className="flex min-h-0 w-full flex-1 flex-col text-left lg:flex-row lg:items-stretch">
        <div
          className={cn(
            "w-full shrink-0 lg:flex lg:w-[260px] lg:shrink-0 lg:justify-center lg:pr-6 lg:pb-0 lg:pt-0 lg:min-h-0",
            "max-lg:flex max-lg:items-center max-lg:justify-center max-lg:pb-4"
          )}
        >
          <ListingStageTimeline steps={steps} desktopVertical />
        </div>
        <div
          className="hidden shrink-0 bg-border/80 lg:mx-6 lg:block lg:h-auto lg:w-px lg:self-stretch"
          aria-hidden
        />
        <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
            <div
              className={cn(
                "mx-auto flex min-h-0 w-full flex-1 flex-col",
                wide ? "max-w-5xl" : "max-w-lg"
              )}
            >
              <ListingStageStepHeader
                title={stepTitle}
                subtitle={stepSubtitle}
              />
              <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
                {children}
              </div>
            </div>
          </div>
          {footer ? (
            <div className={cn("shrink-0 bg-background py-2 lg:pb-0 pb-6")}>
              <div
                className={cn(
                  "mx-auto w-full max-lg:max-w-none lg:px-0",
                  wide ? "lg:max-w-5xl" : "lg:max-w-lg"
                )}
              >
                {footer}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
