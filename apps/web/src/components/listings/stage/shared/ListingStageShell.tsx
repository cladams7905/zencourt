"use client";

import * as React from "react";
import { ListingStageDefaultFooter } from "@web/src/components/listings/stage/shared/ListingStageDefaultFooter";
import { ListingStageScaffold } from "@web/src/components/listings/stage/shared/ListingStageScaffold";
import { ListingStageViewHeader } from "@web/src/components/listings/stage/shared/ListingStageViewHeader";
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
  const steps = buildListingStageFlowSteps(stage);
  const copy = getListingStageScaffoldCopy(stage);
  const resolvedFooter =
    footer !== undefined ? footer : <ListingStageDefaultFooter />;

  return (
    <div className="flex h-full min-h-full flex-col">
      <ListingStageViewHeader ref={headerRef} action={headerAction} />
      <div className="mx-auto flex min-h-0 w-full flex-1 items-stretch bg-background px-8 pb-10 pt-0 md:pt-10">
        <ListingStageScaffold
          steps={steps}
          stepTitle={copy.stepTitle}
          stepSubtitle={copy.stepSubtitle}
          footer={resolvedFooter}
          wide={wide}
        >
          {children}
        </ListingStageScaffold>
      </div>
    </div>
  );
}
