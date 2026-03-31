import * as React from "react";

type ListingStageStepHeaderProps = {
  title: string;
  subtitle?: string;
};

export function ListingStageStepHeader({ title, subtitle }: ListingStageStepHeaderProps) {
  return (
    <div className="w-full space-y-1 pb-6 lg:pb-5">
      <h2 className="mt-6 text-xl font-medium text-foreground lg:mt-0">{title}</h2>
      {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}
