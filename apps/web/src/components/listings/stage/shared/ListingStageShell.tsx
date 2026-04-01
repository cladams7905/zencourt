"use client";

import * as React from "react";
import { ListingStageDefaultFooter } from "@web/src/components/listings/stage/shared/ListingStageDefaultFooter";
import { ListingStageScaffold } from "@web/src/components/listings/stage/shared/ListingStageScaffold";
import { ListingStageViewHeader } from "@web/src/components/listings/stage/shared/ListingStageViewHeader";
import { useListingStageViewContext } from "@web/src/components/listings/stage/shared/ListingStageViewContext";
import {
  buildListingStageFlowSteps,
  getListingStageScaffoldCopy,
  type ListingStageKey
} from "@web/src/components/listings/stage/shared/domain/stageSteps";
import { cn } from "@web/src/components/ui/utils";

type ListingStageShellProps = {
  stage: ListingStageKey;
  /** Wider main column for multi-column or rich layouts. */
  wide?: boolean;
  /**
   * Custom footer. When omitted, a default footer is used when applicable
   * (e.g. upload stage with a listing id).
   */
  footer?: React.ReactNode;
  children: React.ReactNode;
  headerRef?: React.Ref<HTMLElement>;
  headerAction?: React.ReactNode;
};

export function ListingStageShell({
  stage,
  wide,
  footer,
  children,
  headerRef,
  headerAction
}: ListingStageShellProps) {
  const ctx = useListingStageViewContext();
  const steps = buildListingStageFlowSteps(stage);
  const copy = getListingStageScaffoldCopy(stage);

  const showDefaultFooter =
    footer === undefined &&
    stage === "upload" &&
    Boolean(ctx.listingId?.trim());

  const resolvedFooter =
    footer !== undefined ? (
      footer
    ) : showDefaultFooter ? (
      <ListingStageDefaultFooter />
    ) : null;

  const showFooterBar = resolvedFooter != null;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <ListingStageViewHeader ref={headerRef} action={headerAction} />
      <div className="mx-auto flex min-h-0 w-full flex-1 flex-col bg-background px-8 pt-0 lg:pt-10">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <ListingStageScaffold
            steps={steps}
            stepTitle={copy.stepTitle}
            stepSubtitle={copy.stepSubtitle}
            wide={wide}
          >
            {children}
          </ListingStageScaffold>
          {showFooterBar ? (
            <div
              className={cn(
                "shrink-0 border-t border-border bg-background pt-4 lg:border-t-0",
                "pb-[max(1rem,env(safe-area-inset-bottom))]"
              )}
            >
              <div className="mx-auto w-full max-w-6xl px-6">
                <div className="flex w-full flex-col lg:flex-row lg:items-stretch">
                  <div
                    className="hidden shrink-0 lg:block lg:w-[260px] lg:pr-6"
                    aria-hidden
                  />
                  <div
                    className="hidden w-px shrink-0 bg-transparent lg:mx-6 lg:block lg:self-stretch"
                    aria-hidden
                  />
                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <div
                      className={cn(
                        "mx-auto w-full",
                        wide ? "max-w-5xl" : "max-w-lg"
                      )}
                    >
                      {resolvedFooter}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
