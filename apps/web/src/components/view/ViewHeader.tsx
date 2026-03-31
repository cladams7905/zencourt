"use client";

import * as React from "react";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import { Plus, Bell } from "lucide-react";
import { useRouter } from "next/navigation";

interface ViewHeaderProps {
  title: string;
  subtitle?: string;
  /** Shown inline to the right of the listing name (listing view only). */
  titleAddon?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  timeline?: React.ReactNode;
  sticky?: boolean;
  listingView?: boolean;
  hideCreateButton?: boolean;
  showNotifications?: boolean;
  hasNotifications?: boolean;
}

export const ViewHeader = React.forwardRef<HTMLElement, ViewHeaderProps>(
  function ViewHeader(
    {
      title,
      subtitle,
      titleAddon,
      className,
      action,
      timeline,
      sticky = true,
      listingView = false,
      hideCreateButton = false,
      showNotifications = true,
      hasNotifications = true
    },
    ref
  ) {
    const router = useRouter();

    if (listingView) {
      const hasTimeline = Boolean(timeline);

      return (
        <header
          ref={ref}
          className={cn(
            "top-0 z-30 bg-background shadow-none backdrop-blur-md px-4 md:px-8 py-4 md:py-5 border-b border-border md:rounded-t-xl",
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
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-header font-medium text-foreground">
                  {title}
                </h1>
                <div className="ml-2 -mb-1">{titleAddon}</div>
              </div>
              {subtitle ? (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            {timeline ? timeline : null}
            <div className="flex items-center justify-end gap-4">
              {action ? action : null}
              {!hideCreateButton ? (
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
                  {hasNotifications ? (
                    <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full border-2 border-background" />
                  ) : null}
                </Button>
              ) : null}
            </div>
          </div>
        </header>
      );
    }

    return (
      <header
        ref={ref}
        className={cn(
          "top-0 z-30 bg-background/90 shadow-none backdrop-blur-md px-4 md:px-8 py-4 md:py-5 flex justify-between items-center border-b border-border md:rounded-t-xl",
          sticky ? "sticky" : "static",
          className
        )}
      >
        <div>
          <h1 className="text-2xl font-header font-medium text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="hidden md:flex items-center gap-4">
          {!hideCreateButton ? (
            <Button
              size="default"
              className="gap-2"
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
              className="relative rounded-full"
            >
              <Bell className="h-5 w-5" />
              {hasNotifications ? (
                <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full border-2 border-background" />
              ) : null}
            </Button>
          ) : null}
        </div>
      </header>
    );
  }
);
