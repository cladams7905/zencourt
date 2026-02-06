"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "../ui/utils";
import { useViewSidebar } from "./ViewSidebarContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../ui/dropdown-menu";

export function MobileCreateFAB() {
  const { isMobile } = useViewSidebar();
  const router = useRouter();

  if (!isMobile) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "flex items-center justify-center",
            "h-14 w-14 rounded-full",
            "bg-primary text-primary-foreground",
            "shadow-lg hover:bg-primary/90",
            "transition-all duration-200",
            "md:hidden"
          )}
          aria-label="Create new"
        >
          <Plus className="h-6 w-6" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="top"
        sideOffset={8}
        className="w-72 p-2"
      >
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
            Generate a social media campaign from your active property listings.
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
