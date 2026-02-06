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

interface ViewHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  hasNotifications?: boolean;
}

export function ViewHeader({
  title,
  subtitle,
  className,
  hasNotifications = true
}: ViewHeaderProps) {
  const router = useRouter();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 bg-background/90 shadow-xs backdrop-blur-md px-4 md:px-8 py-4 md:py-5 flex justify-between items-center border-b border-border md:rounded-t-xl",
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

        <Button size="icon" variant="ghost" className="relative rounded-full">
          <Bell className="h-5 w-5" />
          {hasNotifications && (
            <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full border-2 border-background" />
          )}
        </Button>
      </div>
    </header>
  );
}
