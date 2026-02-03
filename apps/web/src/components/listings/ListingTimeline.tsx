"use client";

import * as React from "react";
import { cn } from "../ui/utils";

type ListingTimelineStep = {
  label: string;
  active?: boolean;
  completed?: boolean;
};

type ListingTimelineProps = {
  steps: ListingTimelineStep[];
  className?: string;
};

export function ListingTimeline({ steps, className }: ListingTimelineProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-between w-full max-w-[370px] mx-auto",
        className
      )}
    >
      <div className="absolute w-full top-[5px] px-8">
        <div className="h-px bg-border/60" />
      </div>
      {steps.map((step) => (
        <div key={step.label} className="flex flex-col items-center gap-1.5">
          <div
            className={`h-2.5 w-2.5 rotate-45 rounded-xs ring-4 ring-background shadow-sm ${
              step.completed || step.active
                ? "bg-primary"
                : "bg-background border border-border"
            }`}
          />
          <span
            className={`mt-1.5 text-[11px] uppercase tracking-widest ${
              step.active
                ? "font-semibold text-foreground"
                : "font-medium text-muted-foreground"
            }`}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}
