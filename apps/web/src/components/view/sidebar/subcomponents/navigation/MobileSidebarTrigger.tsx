"use client";

import * as React from "react";
import { Menu, Bell } from "lucide-react";
import Link from "next/link";
import { cn } from "../../../../ui/utils";
import { ZencourtLogo } from "../../../../ui/zencourt-logo";
import { useViewSidebar } from "../../shared/ViewSidebarContext";

interface MobileSidebarTriggerProps {
  hasNotifications?: boolean;
}

export function MobileSidebarTrigger({
  hasNotifications = true
}: MobileSidebarTriggerProps) {
  const { setOpenMobile, isMobile } = useViewSidebar();

  if (!isMobile) return null;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "flex items-center justify-between",
        "h-14 px-4",
        "bg-secondary border-b border-border",
        "md:hidden"
      )}
    >
      {/* Logo on the left */}
      <Link href="/" className="flex items-center gap-2">
        <ZencourtLogo className="object-contain" />
      </Link>

      {/* Right side: Notifications + Hamburger */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <button
          className={cn(
            "relative flex items-center justify-center",
            "h-10 w-10 rounded-lg",
            "hover:bg-foreground/5 cursor-pointer",
            "transition-colors duration-200"
          )}
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {hasNotifications && (
            <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full border-2 border-secondary" />
          )}
        </button>

        {/* Hamburger */}
        <button
          onClick={() => setOpenMobile(true)}
          className={cn(
            "flex items-center justify-center",
            "h-10 w-10 rounded-lg",
            "hover:bg-foreground/5 cursor-pointer",
            "transition-colors duration-200"
          )}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
