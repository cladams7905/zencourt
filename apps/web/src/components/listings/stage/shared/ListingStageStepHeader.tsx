import * as React from "react";

type ListingStageStepHeaderProps = {
  title: string;
  subtitle?: string;
};

export function ListingStageStepHeader({ title, subtitle }: ListingStageStepHeaderProps) {
  return (
    <div className="w-full space-y-1 py-6 lg:pb-5">
      <h2 className="text-xl font-medium text-foreground">{title}</h2>
      {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}
