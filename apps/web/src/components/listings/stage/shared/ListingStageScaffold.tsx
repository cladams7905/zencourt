import * as React from "react";
import { cn } from "@web/src/components/ui/utils";
import { ListingStageStepHeader } from "./ListingStageStepHeader";

/** Outer wrapper for the main column (step body + shell-level footer): horizontal padding matches across both. */
export const LISTING_STAGE_MAIN_COLUMN_CLASS =
  "min-h-0 min-w-0 flex flex-col px-4 md:px-6";

/** Desktop: timeline vs step column ≈ 1:3 (25% / 75%). */
export const LISTING_STAGE_LG_MAIN_GRID_CLASS =
  "lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]";

/** Max width for step body + footer actions (narrow / wide stages). */
export const LISTING_STAGE_NARROW_MAX_W_CLASS = "max-w-[30rem]";
export const LISTING_STAGE_WIDE_MAX_W_CLASS = "max-w-4xl";

type ListingStageScaffoldProps = {
  stepTitle: string;
  stepSubtitle?: string;
  children: React.ReactNode;
  /** Wider main column for multi-column stages (categorize, review, upload). */
  wide?: boolean;
  /**
   * Bottom padding above a flush listing footer; `mt-auto` pins the body to the
   * column bottom so spacing isn’t lost to flex-1 growth.
   */
  hasFooter?: boolean;
};

/**
 * Step title + body only. Timeline and footer are composed in {@link ListingStageShell}
 * so the footer can span the full width of the main column (page width minus timeline).
 */
export function ListingStageScaffold({
  stepTitle,
  stepSubtitle,
  children,
  wide = false,
  hasFooter = false
}: ListingStageScaffoldProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 w-full min-w-0 flex-1 flex-col",
        wide ? LISTING_STAGE_WIDE_MAX_W_CLASS : LISTING_STAGE_NARROW_MAX_W_CLASS
      )}
    >
      <ListingStageStepHeader title={stepTitle} subtitle={stepSubtitle} />
      {hasFooter ? (
        <div className="mt-auto w-full min-w-0 pb-6">{children}</div>
      ) : (
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
          {children}
        </div>
      )}
    </div>
  );
}
