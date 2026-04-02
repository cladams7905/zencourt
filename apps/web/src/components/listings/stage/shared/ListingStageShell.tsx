"use client";

import * as React from "react";
import { ListingStageDefaultFooter } from "@web/src/components/listings/stage/shared/ListingStageDefaultFooter";
import {
  LISTING_STAGE_LG_MAIN_GRID_CLASS,
  LISTING_STAGE_MAIN_COLUMN_CLASS,
  LISTING_STAGE_NARROW_MAX_W_CLASS,
  LISTING_STAGE_WIDE_MAX_W_CLASS,
  ListingStageScaffold
} from "@web/src/components/listings/stage/shared/ListingStageScaffold";
import { ListingStageTimeline } from "@web/src/components/listings/stage/shared/ListingStageTimeline";
import { ListingStageViewHeader } from "@web/src/components/listings/stage/shared/ListingStageViewHeader";
import { useListingStageViewContext } from "@web/src/components/listings/stage/shared/ListingStageViewContext";
import type { ListingStageStep } from "./domain/types";
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

function ListingStageTimelineColumn({
  steps,
  hasFooter
}: {
  steps: ListingStageStep[];
  hasFooter: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col border-b border-border pb-4 pt-6",
        "lg:col-start-1 lg:row-start-1 lg:h-full lg:min-h-0 lg:self-stretch",
        "lg:border-b-0 lg:border-r lg:border-border/80 lg:py-6 lg:pl-4",
        hasFooter && "lg:row-span-2"
      )}
    >
      <div className="flex w-full shrink-0 justify-center lg:hidden">
        <ListingStageTimeline steps={steps} desktopVertical />
      </div>
      <div className="hidden lg:flex lg:h-full lg:min-h-0 lg:w-full lg:flex-col">
        <div className="shrink-0">
          <ListingStageTimeline steps={steps} desktopVertical />
        </div>
        {hasFooter ? <div className="min-h-0 flex-1" aria-hidden /> : null}
      </div>
    </div>
  );
}

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

  const hasFooter = footer !== undefined || showDefaultFooter;

  const renderFooterSlot = (slotKey: string): React.ReactNode => {
    if (footer !== undefined) {
      if (React.isValidElement(footer)) {
        return React.cloneElement(footer, { key: slotKey } as never);
      }
      return footer;
    }
    if (showDefaultFooter) {
      return <ListingStageDefaultFooter key={slotKey} />;
    }
    return null;
  };

  const footerActionsRow = (slotKey: string) => (
    <div className="flex w-full flex-col items-center lg:px-6">
      <div
        className={cn(
          "flex w-full min-w-0 flex-row items-center justify-end gap-3",
          wide
            ? LISTING_STAGE_WIDE_MAX_W_CLASS
            : LISTING_STAGE_NARROW_MAX_W_CLASS
        )}
      >
        {renderFooterSlot(slotKey)}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div
        className={cn(
          "flex min-h-0 w-full min-w-0 flex-1 flex-col",
          hasFooter
            ? "max-lg:overflow-hidden lg:overflow-y-auto lg:overscroll-y-contain"
            : "overflow-y-auto overscroll-y-contain"
        )}
      >
        {!hasFooter ? (
          <ListingStageViewHeader ref={headerRef} action={headerAction} />
        ) : null}
        <div
          className={cn(
            "mx-auto flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-background",
            hasFooter && "lg:min-h-[calc(100dvh-8.5rem)]",
            hasFooter &&
              "max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col max-lg:overflow-hidden"
          )}
        >
          {hasFooter ? (
            <div
              className={cn(
                "flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col max-lg:overflow-y-auto max-lg:overscroll-y-contain",
                "lg:contents"
              )}
            >
              <ListingStageViewHeader ref={headerRef} action={headerAction} />
              <div className="flex min-h-0 w-full flex-1 flex-col max-lg:min-h-0 lg:min-h-0 lg:flex-1">
                <section
                  className={cn(
                    "grid min-h-0 w-full min-w-0 max-w-full flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)]",
                    "lg:min-h-0 lg:h-full lg:items-stretch",
                    "lg:grid-rows-[minmax(0,1fr)_auto]",
                    LISTING_STAGE_LG_MAIN_GRID_CLASS
                  )}
                >
                  <ListingStageTimelineColumn steps={steps} hasFooter />

                  <div
                    className={cn(
                      LISTING_STAGE_MAIN_COLUMN_CLASS,
                      "lg:col-start-2 lg:row-start-1",
                      "lg:min-h-0 lg:items-center lg:overflow-y-auto lg:overscroll-y-contain",
                      "max-md:pb-24"
                    )}
                  >
                    <ListingStageScaffold
                      stepTitle={copy.stepTitle}
                      stepSubtitle={copy.stepSubtitle}
                      wide={wide}
                      hasFooter
                    >
                      {children}
                    </ListingStageScaffold>
                  </div>

                  <div
                    className={cn(
                      "relative hidden min-h-0 min-w-0 flex-col border-t border-border lg:flex",
                      "px-4 py-4 lg:px-0",
                      "lg:col-start-2 lg:row-start-2 lg:static lg:z-auto"
                    )}
                  >
                    {footerActionsRow("listing-stage-footer-lg")}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <section
              className={cn(
                "grid min-h-0 w-full min-w-0 max-w-full flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)]",
                "lg:min-h-0 lg:h-full lg:items-stretch lg:grid-rows-[minmax(0,1fr)]",
                LISTING_STAGE_LG_MAIN_GRID_CLASS
              )}
            >
              <ListingStageTimelineColumn steps={steps} hasFooter={false} />

              <div
                className={cn(
                  LISTING_STAGE_MAIN_COLUMN_CLASS,
                  "lg:col-start-2 lg:row-start-1",
                  "lg:min-h-0 lg:items-center lg:overflow-y-auto lg:overscroll-y-contain"
                )}
              >
                <ListingStageScaffold
                  stepTitle={copy.stepTitle}
                  stepSubtitle={copy.stepSubtitle}
                  wide={wide}
                  hasFooter={false}
                >
                  {children}
                </ListingStageScaffold>
              </div>
            </section>
          )}

          {hasFooter ? (
            <div
              className={cn(
                "relative flex min-h-0 min-w-0 shrink-0 flex-col border-t border-border lg:hidden",
                "px-4 py-4 md:px-6",
                "max-lg:pb-[calc(1rem+env(safe-area-inset-bottom,0px))]",
                "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-50 max-md:bg-background",
                "md:max-lg:bg-background",
                "max-md:isolate"
              )}
            >
              {footerActionsRow("listing-stage-footer-max-lg")}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
