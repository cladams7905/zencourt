"use client";

import * as React from "react";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import { Plus, Bell } from "lucide-react";

interface DashboardHeaderProps {
  className?: string;
  userName?: string;
  hasNotifications?: boolean;
}

const DashboardHeader = ({
  className,
  userName = "User",
  hasNotifications = true
}: DashboardHeaderProps) => {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 bg-background/90 backdrop-blur-md px-8 py-5 flex justify-between items-center border-b border-border",
        className
      )}
    >
      <h1 className="text-2xl font-header font-medium text-foreground">
        Welcome back, {userName}
      </h1>

      <div className="flex items-center gap-4">
        <Button size="default" className="gap-2 shadow-sm">
          <Plus className="h-5 w-5" />
          <span>New</span>
        </Button>

        <Button
          size="icon"
          variant="ghost"
          className="relative"
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
