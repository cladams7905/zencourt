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

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <ListingStageViewHeader ref={headerRef} action={headerAction} />
      <div className="mx-auto flex min-h-0 w-full flex-1 flex-col bg-background pt-0 lg:pt-10">
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden px-8">
          <ListingStageScaffold
            steps={steps}
            stepTitle={copy.stepTitle}
            stepSubtitle={copy.stepSubtitle}
            wide={wide}
            footer={resolvedFooter ?? undefined}
          >
            {children}
          </ListingStageScaffold>
        </div>
      </div>
    </div>
  );
}
