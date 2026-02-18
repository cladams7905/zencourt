"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Calendar,
  Plus,
  ChevronDown
} from "lucide-react";
import Image from "next/image";
import { cn } from "../../../../ui/utils";
import { Button } from "../../../../ui/button";
import {
  SidebarBrandHeader,
  SidebarContentSection,
  SidebarManageSection
} from "..";
import type { ViewSidebarProps } from "../../shared";

export function ViewSidebarStatic({
  className,
  userName = "User",
  paymentPlan = "Free",
  userAvatar
}: ViewSidebarProps) {
  const [contentExpanded, setContentExpanded] = React.useState(true);
  const [listingsExpanded, setListingsExpanded] = React.useState(true);

  return (
    <aside
      className={cn(
        "w-[260px] shrink-0 flex flex-col border-r border-border bg-secondary",
        className
      )}
    >
      <SidebarBrandHeader />

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <div className="flex flex-col pt-4 gap-1">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 hover:bg-foreground/5"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-sm font-medium">Dashboard</span>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start gap-3 hover:bg-foreground/5"
          >
            <Calendar className="h-5 w-5" />
            <span className="text-sm font-medium">Calendar</span>
          </Button>
        </div>
        <div className="py-4">
          <div className="h-px bg-border w-full" />
        </div>

        <SidebarContentSection
          expanded={contentExpanded}
          onToggle={() => setContentExpanded((prev) => !prev)}
        />

        <div className="py-4">
          <div className="h-px bg-border w-full" />
        </div>

        <div className="space-y-1">
          <div
            onClick={() => setListingsExpanded(!listingsExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            <span>Listings</span>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 hover:bg-foreground/5"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  listingsExpanded && "rotate-180"
                )}
              />
            </div>
          </div>

          {listingsExpanded && (
            <div className="space-y-0.5 pl-2">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 hover:bg-foreground/5"
              >
                <div className="w-1.5 h-1.5 rotate-45 rounded-xs bg-foreground shrink-0" />
                <span className="text-sm truncate">1240 Serenity Lane</span>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 hover:bg-foreground/5"
              >
                <div className="w-1.5 h-1.5 rotate-45 rounded-xs bg-foreground shrink-0" />
                <span className="text-sm truncate">880 Fairview Blvd</span>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 hover:bg-foreground/5"
              >
                <div className="w-1.5 h-1.5 rotate-45 rounded-xs bg-foreground shrink-0" />
                <span className="text-sm truncate">Woodland Estate</span>
              </Button>
            </div>
          )}
        </div>

        <div className="py-4">
          <div className="h-px bg-border w-full" />
        </div>

        <SidebarManageSection />
      </nav>

      <div className="p-4 pt-0">
        <div className="pb-4">
          <div className="h-px bg-border w-full" />
        </div>
        <div className="w-full flex items-center gap-3 px-2 py-2 rounded-lg bg-foreground/5 border border-border">
          {userAvatar ? (
            <Image
              src={userAvatar}
              alt={userName}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center border border-border">
              <span className="text-sm font-semibold text-primary-foreground">
                {userName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
            </div>
          )}
          <div className="flex flex-col min-w-0 flex-1 text-left">
            <span className="text-sm font-semibold text-foreground truncate">
              {userName}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {paymentPlan} Plan
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </aside>
  );
}
