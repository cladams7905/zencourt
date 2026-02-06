"use client";

import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "../ui/utils";
import { useViewSidebar } from "./ViewSidebarContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export function ViewSidebarToggle() {
  const { isCollapsed, toggleSidebar } = useViewSidebar();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={toggleSidebar}
          className={cn(
            isCollapsed ? "top-6 left-[50px]" : "top-6 left-[246px]",
            "fixed z-50",
            "flex items-center justify-center",
            "h-7 w-7 rounded-full",
            "bg-background border border-border shadow-sm",
            "hover:bg-secondary cursor-pointer",
            "transition-all duration-300",
            "hidden md:flex"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isCollapsed && "rotate-180"
            )}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      </TooltipContent>
    </Tooltip>
  );
}
