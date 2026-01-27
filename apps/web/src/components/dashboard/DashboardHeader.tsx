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

interface DashboardHeaderProps {
  className?: string;
  title: string;
  subtitle?: string;
  hasNotifications?: boolean;
}

const DashboardHeader = ({
  className,
  title,
  subtitle,
  hasNotifications = true
}: DashboardHeaderProps) => {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 bg-background/90 backdrop-blur-md px-8 py-5 flex justify-between items-center border-b border-border",
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

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="default" className="gap-2">
              <Plus className="h-5 w-5" />
              <span>New</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-2">
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
              <span className="text-sm font-medium text-foreground">
                Content
              </span>
              <span className="text-xs text-muted-foreground">
                Create your own social media content.
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1.5 bg-border/50" />
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
              <span className="text-sm font-medium text-foreground">
                Listing
              </span>
              <span className="text-xs text-muted-foreground">
                Generate social media campaigns from your active property
                listings.
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="icon" variant="ghost" className="relative">
          <Bell className="h-5 w-5" />
          {hasNotifications && (
            <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full border-2 border-background" />
          )}
        </Button>
      </div>
    </header>
  );
};

export { DashboardHeader };
