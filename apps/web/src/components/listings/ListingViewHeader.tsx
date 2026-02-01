"use client";

import * as React from "react";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../ui/dropdown-menu";
import { Plus, Bell } from "lucide-react";
import { useRouter } from "next/navigation";

type ListingViewHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
  action?: React.ReactNode;
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
  sticky = true,
  showCreate = true,
  showNotifications = true,
  hasNotifications = true,
  ref
}: ListingViewHeaderProps) {
  const router = useRouter();

  return (
    <header
      ref={ref}
      className={cn(
        "top-0 z-30 bg-background/90 backdrop-blur-md px-8 py-5 flex justify-between items-center border-b border-border rounded-t-xl",
        sticky ? "sticky" : "static",
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
      {action || showCreate || showNotifications ? (
        <div className="flex items-center gap-4">
          {action ? action : null}
          {showCreate ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="default" className="gap-2">
                  <Plus className="h-5 w-5" />
                  <span>Create</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 p-2">
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
                  <span className="text-sm font-medium text-foreground">
                    New Content
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Build your own social media post.
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1.5 bg-border/50" />
                <DropdownMenuItem
                  className="flex flex-col items-start gap-1 py-2"
                  onSelect={() => router.push("/listings/sync")}
                >
                  <span className="text-sm font-medium text-foreground">
                    New Listing Campaign
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Generate a social media campaign from your active property
                    listings.
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {showNotifications ? (
            <Button
              size="icon"
              variant="ghost"
              className="relative rounded-full"
            >
              <Bell className="h-5 w-5" />
              {hasNotifications && (
                <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full border-2 border-background" />
              )}
            </Button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
