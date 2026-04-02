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
   * Optional content rendered in the footer band above the action buttons.
   * Used for listing-specific docks such as unused photos.
   */
  footerAccessory?: React.ReactNode;
  /**
   * Custom footer. When omitted, a default footer is used when applicable
   * (e.g. upload stage with a listing id).
   */
  footer?: React.ReactNode;
  /**
   * When a footer is shown, false keeps the step body under the step header
   * instead of pinning it above the footer (default true).
   */
  pinStepBodyToBottom?: boolean;
  children: React.ReactNode;
  headerRef?: React.Ref<HTMLElement>;
  headerAction?: React.ReactNode;
};

/** Desktop: sticky offset under ListingStageViewHeader plus 24px breathing room. */
const LISTING_STAGE_TIMELINE_STICKY_TOP_CLASS = "lg:top-[calc(6rem+24px)]";

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
        /* Full height for border-r; sticky is on the inner desktop wrapper so it can pin (tall sticky boxes never stick). */
        "lg:col-start-1 lg:row-start-1 lg:relative lg:min-h-0 lg:h-full lg:self-stretch",
        "lg:border-b-0 lg:border-r lg:border-border/80",
        hasFooter && "lg:row-span-2"
      )}
    >
      <div className="flex w-full shrink-0 justify-center lg:hidden">
        <ListingStageTimeline steps={steps} desktopVertical />
      </div>
      <div
        className={cn(
          "hidden min-h-0 w-full flex-col justify-start lg:flex",
          "lg:sticky lg:z-20 lg:pl-4",
          LISTING_STAGE_TIMELINE_STICKY_TOP_CLASS
        )}
      >
        <div className="shrink-0">
          <ListingStageTimeline steps={steps} desktopVertical />
        </div>
      </div>
    </div>
  );
}

export function ListingStageShell({
  stage,
  wide,
  footerAccessory,
  footer,
  pinStepBodyToBottom = true,
  children,
  headerRef,
  headerAction
}: ListingStageShellProps) {
  const scrollViewportRef = React.useRef<HTMLDivElement>(null);
  const headerMeasureRef = React.useRef<HTMLElement | null>(null);
  const footerMeasureRef = React.useRef<HTMLDivElement | null>(null);
  const [viewportMinHeightPx, setViewportMinHeightPx] = React.useState<
    number | null
  >(null);
  const [contentMinHeightPx, setContentMinHeightPx] = React.useState<
    number | null
  >(null);
  React.useLayoutEffect(() => {
    const viewportEl = scrollViewportRef.current;
    if (!viewportEl) return;

    const updateViewportMinHeight = () => {
      const viewportHeight = Math.floor(
        viewportEl.getBoundingClientRect().height
      );
      const headerHeight = Math.floor(
        headerMeasureRef.current?.getBoundingClientRect().height ?? 0
      );
      const footerHeight = Math.floor(
        footerMeasureRef.current?.getBoundingClientRect().height ?? 0
      );
      const nextHeight = viewportHeight;
      const nextContentHeight = Math.max(
        0,
        viewportHeight - headerHeight - footerHeight
      );
      setViewportMinHeightPx((prev) =>
        prev === nextHeight ? prev : nextHeight
      );
      setContentMinHeightPx((prev) =>
        prev === nextContentHeight ? prev : nextContentHeight
      );
    };

    updateViewportMinHeight();

    const canObserveResize = typeof ResizeObserver !== "undefined";
    const resizeObserver = canObserveResize
      ? new ResizeObserver(updateViewportMinHeight)
      : null;
    resizeObserver?.observe(viewportEl);
    if (headerMeasureRef.current) {
      resizeObserver?.observe(headerMeasureRef.current);
    }
    if (footerMeasureRef.current) {
      resizeObserver?.observe(footerMeasureRef.current);
    }
    window.addEventListener("resize", updateViewportMinHeight);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateViewportMinHeight);
    };
  }, []);

  const setHeaderRefs = React.useCallback(
    (node: HTMLElement | null) => {
      headerMeasureRef.current = node;
      if (!headerRef) return;
      if (typeof headerRef === "function") {
        headerRef(node);
        return;
      }
      (headerRef as React.MutableRefObject<HTMLElement | null>).current = node;
    },
    [headerRef]
  );

  const ctx = useListingStageViewContext();
  const steps = buildListingStageFlowSteps(stage);
  const copy = getListingStageScaffoldCopy(stage);

  const showDefaultFooter =
    footer === undefined &&
    stage === "upload" &&
    Boolean(ctx.listingId?.trim());

  const hasFooter = footer !== undefined || showDefaultFooter;
  const hasFooterDesktopGridRowsClass =
    stage === "address"
      ? "lg:grid-rows-[minmax(0,1fr)_auto]"
      : "lg:grid-rows-[minmax(0,auto)_auto]";
  const footerMaxWidthClass = wide
    ? LISTING_STAGE_WIDE_MAX_W_CLASS
    : LISTING_STAGE_NARROW_MAX_W_CLASS;

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
          footerMaxWidthClass
        )}
      >
        {renderFooterSlot(slotKey)}
      </div>
    </div>
  );

  const footerAccessoryRow = () =>
    footerAccessory ? (
      <div className="flex w-full flex-col items-center lg:px-6">
        <div className={cn("w-full min-w-0", footerMaxWidthClass)}>
          {footerAccessory}
        </div>
      </div>
    ) : null;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div
        ref={scrollViewportRef}
        data-slot="listing-stage-scroll-viewport"
        className={cn(
          "flex min-h-0 w-full min-w-0 flex-1 flex-col",
          "overflow-y-auto overscroll-y-contain"
        )}
      >
        <div
          style={
            viewportMinHeightPx === null
              ? undefined
              : { minHeight: `${viewportMinHeightPx}px` }
          }
          className={cn(
            "mx-auto flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-background",
            /* lg: single scroll surface — step body passes under sticky header/footer (frosted blur). */
            "lg:h-auto lg:flex-none",
            hasFooter &&
              "max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col max-lg:overflow-hidden"
          )}
        >
          {hasFooter ? (
            <div
              data-slot="listing-stage-mobile-scroll-surface"
              className={cn(
                "flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col max-lg:overflow-y-auto max-lg:overscroll-y-contain",
                "lg:contents"
              )}
            >
              <ListingStageViewHeader
                ref={setHeaderRefs}
                action={headerAction}
              />
              <div
                data-slot="listing-stage-mobile-scroll-viewport"
                className={cn(
                  "flex min-h-0 w-full flex-1 flex-col max-lg:min-h-0",
                  "lg:h-auto lg:min-h-0"
                )}
              >
                <section
                  style={
                    contentMinHeightPx === null
                      ? undefined
                      : { minHeight: `${contentMinHeightPx}px` }
                  }
                  className={cn(
                    "grid min-h-0 w-full min-w-0 max-w-full grid-cols-1 grid-rows-[auto_minmax(0,1fr)]",
                    "max-lg:min-h-0",
                    "lg:h-auto lg:items-stretch",
                    hasFooterDesktopGridRowsClass,
                    LISTING_STAGE_LG_MAIN_GRID_CLASS
                  )}
                >
                  <ListingStageTimelineColumn steps={steps} hasFooter />

                  <div
                    className={cn(
                      LISTING_STAGE_MAIN_COLUMN_CLASS,
                      "lg:col-start-2 lg:row-start-1",
                      "items-center",
                      "lg:min-h-0 lg:overflow-visible"
                    )}
                  >
                    <ListingStageScaffold
                      stepTitle={copy.stepTitle}
                      stepSubtitle={copy.stepSubtitle}
                      wide={wide}
                      hasFooter
                      pinStepBodyToBottom={pinStepBodyToBottom}
                    >
                      {children}
                    </ListingStageScaffold>
                  </div>

                  <div
                    className={cn(
                      "relative hidden min-h-0 min-w-0 shrink-0 flex-col border-t border-border lg:flex",
                      "px-4 pt-4 py-3 lg:px-0",
                      "lg:sticky lg:bottom-0 lg:z-30",
                      "lg:border-border/80 lg:bg-background/90 lg:backdrop-blur-md lg:supports-backdrop-filter:bg-background/90",
                      "lg:col-start-2 lg:col-end-3 lg:row-start-2"
                    )}
                  >
                    {footerAccessoryRow()}
                    {footerAccessory ? (
                      <div
                        className="my-3 h-px w-full shrink-0 bg-border/80"
                        aria-hidden
                      />
                    ) : null}
                    {footerActionsRow("listing-stage-footer-lg")}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <>
              <ListingStageViewHeader
                ref={setHeaderRefs}
                action={headerAction}
              />
              <section
                style={
                  contentMinHeightPx === null
                    ? undefined
                    : { minHeight: `${contentMinHeightPx}px` }
                }
                className={cn(
                  "grid min-h-0 w-full min-w-0 max-w-full grid-cols-1 grid-rows-[auto_minmax(0,1fr)]",
                  "max-lg:flex-1 max-lg:min-h-0",
                  "lg:h-auto lg:items-stretch lg:flex-none",
                  "lg:grid-rows-[minmax(0,auto)]",
                  LISTING_STAGE_LG_MAIN_GRID_CLASS
                )}
              >
                <ListingStageTimelineColumn steps={steps} hasFooter={false} />

                <div
                  className={cn(
                    LISTING_STAGE_MAIN_COLUMN_CLASS,
                    "lg:col-start-2 lg:row-start-1",
                    "items-center",
                    "lg:min-h-0 lg:overflow-visible"
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
            </>
          )}

          {hasFooter ? (
            <div
              data-slot="listing-stage-mobile-footer"
              ref={footerMeasureRef}
              className={cn(
                "relative flex min-h-0 min-w-0 shrink-0 flex-col border-t border-border lg:hidden",
                footerAccessory
                  ? "bg-background/90 px-4 pt-3 backdrop-blur-md supports-backdrop-filter:bg-background/90 md:px-6"
                  : "bg-background/90 px-4 py-4 backdrop-blur-md supports-backdrop-filter:bg-background/90 md:px-6",
                "max-lg:pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
              )}
            >
              {footerAccessory ? (
                <>
                  {footerAccessoryRow()}
                  <div
                    className={cn(
                      "my-3 h-px shrink-0 bg-border/80",
                      /* max-md: footer is fixed full-bleed; w-full + -mx fails in flex — span viewport */
                      "max-md:relative max-md:left-1/2 max-md:w-screen max-md:max-w-none max-md:-translate-x-1/2",
                      /* md–lg: break out of footer px-6 only */
                      "md:left-auto md:w-[calc(100%+3rem)] md:translate-x-0 md:-mx-6"
                    )}
                    aria-hidden
                  />
                </>
              ) : null}
              {footerActionsRow("listing-stage-footer-max-lg")}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
