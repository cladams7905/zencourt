import * as React from "react";
import {
  ListingStageTimeline,
  type ListingStageStep
} from "@web/src/components/listings/stage/shared";
import { ListingStageStepHeader } from "./components/ListingStageStepHeader";

type ListingStageScaffoldProps = {
  steps: ListingStageStep[];
  stepTitle: string;
  stepSubtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function ListingStageScaffold({
  steps,
  stepTitle,
  stepSubtitle,
  children,
  footer
}: ListingStageScaffoldProps) {
  return (
    <div className="mx-auto flex h-full w-full max-w-6xl rounded-lg px-6 py-6">
      <section className="flex h-full w-full flex-col text-left lg:flex-row lg:items-stretch">
        <div className="w-full pb-6 lg:flex lg:w-[260px] lg:shrink-0 lg:justify-center lg:pr-6 lg:pb-0">
          <ListingStageTimeline steps={steps} desktopVertical />
        </div>
        <div className="h-px w-full bg-border/80 lg:mx-6 lg:h-auto lg:w-px lg:self-stretch" />
        <div className="flex w-full flex-1 flex-col">
          <div className="mx-auto flex h-full w-full max-w-lg flex-1 flex-col">
            <ListingStageStepHeader title={stepTitle} subtitle={stepSubtitle} />
            <div className="flex w-full flex-1 flex-col">{children}</div>
            {footer}
          </div>
        </div>
      </section>
    </div>
  );
}
