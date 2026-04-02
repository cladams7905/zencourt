"use client";

import Link from "next/link";
import {
  Calendar,
  ChevronDown,
  Film,
  LayoutDashboard,
  Plus,
  Settings
} from "lucide-react";
import { cn } from "../../../../ui/utils";
import { Button } from "../../../../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "../../../../ui/tooltip";
import { ZencourtLogo } from "../../../../ui/zencourt-logo";
import { useViewSidebar } from "../../shared/ViewSidebarContext";
import { ListingRowSkeleton } from "../navigation/SidebarListingsSection";

const CONTENT_SKELETON_IDS = [
  "sidebar-skeleton-content-a",
  "sidebar-skeleton-content-b",
  "sidebar-skeleton-content-c",
  "sidebar-skeleton-content-d"
] as const;

const LISTINGS_SKELETON_IDS = [
  "sidebar-skeleton-listing-a",
  "sidebar-skeleton-listing-b",
  "sidebar-skeleton-listing-c"
] as const;

function UserRowPlaceholder() {
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted-foreground/10" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="h-4 w-24 animate-pulse rounded-full bg-muted-foreground/10" />
        <div className="h-3 w-16 animate-pulse rounded-full bg-muted-foreground/10" />
      </div>
    </div>
  );
}

export function SidebarSkeleton() {
  const { isMobile, isCollapsed } = useViewSidebar();

  if (isMobile) {
    return null;
  }

  if (isCollapsed) {
    return (
      <aside
        className={cn(
          "relative w-16 shrink-0 flex flex-col bg-secondary overflow-hidden",
          "transition-[width] duration-200 ease-linear"
        )}
      >
        <div className="flex h-full w-16 flex-col">
          <Link
            href="/"
            className="flex items-center justify-center pb-2 pt-5"
          >
            <ZencourtLogo className="object-contain" />
          </Link>

          <div className="px-2 pt-4">
            <div className="h-px w-full bg-border" />
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-full hover:bg-foreground/5"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Dashboard
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-full hover:bg-foreground/5"
                  >
                    <Calendar className="h-5 w-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Calendar
              </TooltipContent>
            </Tooltip>

            <div className="py-2">
              <div className="h-px w-full bg-border" />
            </div>

            <div className="space-y-0.5">
              {CONTENT_SKELETON_IDS.map((id) => (
                <ListingRowSkeleton key={id} id={id} isCollapsed />
              ))}
            </div>

            <div className="py-2">
              <div className="h-px w-full bg-border" />
            </div>

            <div className="space-y-0.5">
              {LISTINGS_SKELETON_IDS.map((id) => (
                <ListingRowSkeleton key={id} id={id} isCollapsed />
              ))}
            </div>

            <div className="py-2">
              <div className="h-px w-full bg-border" />
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/media">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-full hover:bg-foreground/5"
                  >
                    <Film className="h-5 w-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                My media
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/settings#account">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-full hover:bg-foreground/5"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Settings
              </TooltipContent>
            </Tooltip>
          </nav>

          <div className="p-2 pt-0">
            <div className="pb-2">
              <div className="h-px w-full bg-border" />
            </div>
            <div className="flex items-center justify-center py-2">
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted-foreground/10" />
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "relative w-[260px] shrink-0 flex flex-col bg-secondary overflow-hidden",
        "transition-[width] duration-200 ease-linear"
      )}
    >
      <div className="flex h-full flex-col">
        <Link
          href="/"
          className="flex items-center gap-3 px-6 pb-2 pt-5"
        >
          <ZencourtLogo className="object-contain" />
          <span className="font-header text-2xl font-semibold tracking-tight text-foreground">
            zencourt
          </span>
        </Link>

        <div className="px-4 pt-4">
          <div className="h-px w-full bg-border" />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4">
          <div className="flex flex-col gap-1 pt-4">
            <Link href="/">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 hover:bg-foreground/5"
              >
                <LayoutDashboard className="h-5 w-5" />
                <span className="text-sm font-medium">Dashboard</span>
              </Button>
            </Link>

            <Link href="/">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 hover:bg-foreground/5"
              >
                <Calendar className="h-5 w-5" />
                <span className="text-sm font-medium">Calendar</span>
              </Button>
            </Link>
          </div>

          <div className="py-4">
            <div className="h-px w-full bg-border" />
          </div>

          <div className="-mt-1 space-y-1">
            <div className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Content</span>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground"
                  aria-hidden
                >
                  <Plus className="h-3 w-3" />
                </span>
                <ChevronDown className="h-4 w-4" aria-hidden />
              </div>
            </div>
            <div className="space-y-0.5 pl-2">
              {CONTENT_SKELETON_IDS.map((id) => (
                <ListingRowSkeleton key={id} id={id} isCollapsed={false} />
              ))}
            </div>
          </div>

          <div className="py-4">
            <div className="h-px w-full bg-border" />
          </div>

          <div className="-mt-1 space-y-1">
            <div className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Listings</span>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground"
                  aria-hidden
                >
                  <Plus className="h-3 w-3" />
                </span>
                <ChevronDown className="h-4 w-4" aria-hidden />
              </div>
            </div>
            <div className="space-y-0.5 pl-2">
              {LISTINGS_SKELETON_IDS.map((id) => (
                <ListingRowSkeleton key={id} id={id} isCollapsed={false} />
              ))}
            </div>
          </div>

          <div className="py-4">
            <div className="h-px w-full bg-border" />
          </div>

          <div className="space-y-1">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Manage</span>
            </div>
            <div className="mb-4 flex flex-col gap-1">
              <Link href="/media">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 hover:bg-foreground/5"
                >
                  <Film className="h-5 w-5" />
                  <span className="text-sm font-medium">My media</span>
                </Button>
              </Link>
              <Link href="/settings#account">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 hover:bg-foreground/5"
                >
                  <Settings className="h-5 w-5" />
                  <span className="text-sm font-medium">Settings</span>
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        <div className="p-4 pt-0">
          <div className="pb-4">
            <div className="h-px w-full bg-border" />
          </div>
          <UserRowPlaceholder />
        </div>
      </div>
    </aside>
  );
}
