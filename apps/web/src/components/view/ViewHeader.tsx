"use client";

import * as React from "react";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
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
        "sticky top-0 z-30 bg-background/90 shadow-none backdrop-blur-md px-4 md:px-8 py-4 md:py-5 flex justify-between items-center border-b border-border md:rounded-t-xl",
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
        <Button
          size="default"
          className="gap-2"
          onClick={() => router.push("/listings/create")}
        >
          <Plus className="h-5 w-5" />
          <span>Create</span>
        </Button>

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
