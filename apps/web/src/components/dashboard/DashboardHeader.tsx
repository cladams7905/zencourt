"use client";

import * as React from "react";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Plus, Bell } from "lucide-react";

interface DashboardHeaderProps {
  className?: string;
  userName?: string;
  location?: string;
  hasNotifications?: boolean;
}

const DashboardHeader = ({
  className,
  userName = "User",
  location = "United States",
  hasNotifications = true
}: DashboardHeaderProps) => {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 bg-background/90 backdrop-blur-md px-8 py-5 flex justify-between items-center border-b border-border/50",
        className
      )}
    >
      <h1 className="text-2xl font-header font-medium text-foreground">
        Welcome back, {userName}
      </h1>

      <div className="flex items-center gap-4">
        <Button size="default" className="gap-2 rounded-full shadow-sm">
          <Plus className="h-5 w-5" />
          <span>New</span>
        </Button>

        <Badge
          variant="outline"
          className="text-sm font-medium px-3 py-1.5 bg-background"
        >
          {location}
        </Badge>

        <Button
          size="icon"
          variant="ghost"
          className="relative hover:bg-accent/20 rounded-full"
        >
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
