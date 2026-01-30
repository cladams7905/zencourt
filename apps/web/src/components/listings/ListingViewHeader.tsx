"use client";

import * as React from "react";
import { cn } from "../ui/utils";

type ListingViewHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
  action?: React.ReactNode;
};

export function ListingViewHeader({
  title,
  subtitle,
  className,
  action
}: ListingViewHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 bg-background/90 backdrop-blur-md px-8 py-5 flex justify-between items-center border-b border-border rounded-t-xl",
        className
      )}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Listing name
        </p>
        <h1 className="text-2xl font-header font-medium text-foreground">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="flex items-center gap-4">{action}</div> : null}
    </header>
  );
}
