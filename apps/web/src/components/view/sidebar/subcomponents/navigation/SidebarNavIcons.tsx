"use client";

import { Archive, Calendar, Clock, FileEdit, Heart, LayoutDashboard, LayoutList } from "lucide-react";
import Link from "next/link";
import { Button } from "../../../../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/tooltip";
import type { SidebarListingDisplayItem } from "@web/src/components/view/sidebar/domain/viewModel";
import { SidebarListingsSection } from "./SidebarListingsSection";
import { SidebarManageSection } from "./SidebarManageSection";

type SidebarNavIconsProps = {
  displayedListingItems: SidebarListingDisplayItem[];
  pendingListingIds: Set<string>;
  hasMoreListings: boolean;
  onLinkClick?: () => void;
};

export function SidebarNavIcons({
  displayedListingItems,
  pendingListingIds,
  hasMoreListings,
  onLinkClick
}: SidebarNavIconsProps) {
  return (
    <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={"/"} onClick={onLinkClick}>
            <Button
              variant="ghost"
              size="icon"
              className="w-full h-10 hover:bg-foreground/5"
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
          <Link href={"/"} onClick={onLinkClick}>
            <Button
              variant="ghost"
              size="icon"
              className="w-full h-10 hover:bg-foreground/5"
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
        <div className="h-px bg-border w-full" />
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-10 hover:bg-foreground/5"
          >
            <FileEdit className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          Drafts
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-10 hover:bg-foreground/5"
          >
            <Heart className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          Favorites
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-10 hover:bg-foreground/5"
          >
            <Clock className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          Scheduled
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-10 hover:bg-foreground/5"
          >
            <Archive className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          Archive
        </TooltipContent>
      </Tooltip>

      <div className="py-2">
        <div className="h-px bg-border w-full" />
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/listings" onClick={onLinkClick}>
            <Button
              variant="ghost"
              size="icon"
              className="w-full h-10 hover:bg-foreground/5"
            >
              <LayoutList className="h-5 w-5" />
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          All Listings
        </TooltipContent>
      </Tooltip>

      <SidebarListingsSection
        displayedListingItems={displayedListingItems}
        pendingListingIds={pendingListingIds}
        isCollapsed
        hasMoreListings={hasMoreListings}
        onLinkClick={onLinkClick}
      />

      <div className="py-2">
        <div className="h-px bg-border w-full" />
      </div>

      <SidebarManageSection collapsed onLinkClick={onLinkClick} />
    </nav>
  );
}
