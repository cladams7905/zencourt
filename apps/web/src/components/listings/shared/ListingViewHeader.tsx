"use client";

import * as React from "react";
import { cn } from "../../ui/utils";
import { Button } from "../../ui/button";
import { Plus, Bell } from "lucide-react";
import { useRouter } from "next/navigation";

type ListingViewHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
  action?: React.ReactNode;
  timeline?: React.ReactNode;
  sticky?: boolean;
  showCreate?: boolean;
  showNotifications?: boolean;
  hasNotifications?: boolean;
  ref?: React.Ref<HTMLElement>;
};

export function ListingViewHeader({
  title,
  subtitle,
  className,
  action,
  timeline,
  sticky = true,
  showCreate = true,
  showNotifications = true,
  hasNotifications = true,
  ref
}: ListingViewHeaderProps) {
  const router = useRouter();
  const hasTimeline = Boolean(timeline);

  return (
    <header
      ref={ref}
      className={cn(
        "top-0 z-30 bg-background/90 shadow-none backdrop-blur-md px-4 md:px-8 py-4 md:py-5 border-b border-border md:rounded-t-xl",
        sticky ? "sticky" : "static",
        className
      )}
    >
      <div
        className={cn(
          "grid items-center gap-4 md:gap-6",
          hasTimeline
            ? "grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(360px,520px)_minmax(0,1fr)]"
            : "grid-cols-[minmax(0,1fr)_auto]"
        )}
      >
        <div className="space-y-1">
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
        {timeline ? timeline : null}
        <div className="flex items-center justify-end gap-4">
          {action ? action : null}
          {showCreate ? (
            <Button
              size="default"
              className="gap-2 hidden md:flex"
              onClick={() => router.push("/listings/create")}
            >
              <Plus className="h-5 w-5" />
              <span>Create</span>
            </Button>
          ) : null}
          {showNotifications ? (
            <Button
              size="icon"
              variant="ghost"
              className="relative rounded-full hidden md:flex"
            >
              <Bell className="h-5 w-5" />
              {hasNotifications && (
                <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full border-2 border-background" />
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
