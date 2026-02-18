"use client";

import Link from "next/link";
import { FileEdit } from "lucide-react";
import { Badge } from "../../../../ui/badge";
import { Button } from "../../../../ui/button";
import { cn } from "../../../../ui/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/tooltip";
import {
  formatListingStageLabel,
  resolveListingPath
} from "@web/src/components/listings/shared";
import type { SidebarListingDisplayItem } from "@web/src/components/view/sidebar/domain/viewModel";

type SidebarListingsSectionProps = {
  displayedListingItems: SidebarListingDisplayItem[];
  pendingListingIds: Set<string>;
  isCollapsed: boolean;
  hasMoreListings: boolean;
  onLinkClick?: () => void;
};

function ListingRowSkeleton({
  id,
  isCollapsed
}: {
  id: string;
  isCollapsed: boolean;
}) {
  return (
    <div
      key={`listing-skeleton-${id}`}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-2",
        isCollapsed ? "justify-center" : "justify-between"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-1.5 w-1.5 rotate-45 rounded-xs bg-muted-foreground/20 animate-pulse" />
        {!isCollapsed && (
          <div className="h-4 w-[150px] rounded-full bg-muted-foreground/10 animate-pulse" />
        )}
      </div>
      {!isCollapsed && (
        <div className="h-5 w-5 rounded-full bg-muted-foreground/10 animate-pulse" />
      )}
    </div>
  );
}

export function SidebarListingsSection({
  displayedListingItems,
  pendingListingIds,
  isCollapsed,
  hasMoreListings,
  onLinkClick
}: SidebarListingsSectionProps) {
  return (
    <div className={cn("space-y-0.5", !isCollapsed && "pl-2")}>
      {displayedListingItems.length > 0 ? (
        displayedListingItems.map((listing) =>
          pendingListingIds.has(listing.id) ? (
            <ListingRowSkeleton
              key={listing.id}
              id={listing.id}
              isCollapsed={isCollapsed}
            />
          ) : isCollapsed ? (
            <Tooltip key={listing.id}>
              <TooltipTrigger asChild>
                <Link
                  href={resolveListingPath(listing)}
                  onClick={onLinkClick}
                  className={cn(
                    "flex items-center justify-center w-full h-9 rounded-md",
                    "hover:bg-foreground/5 transition-colors"
                  )}
                >
                  <div
                    className={cn(
                      "w-2 h-2 rotate-45 rounded-xs shrink-0",
                      listing.listingStage === "create"
                        ? "bg-primary"
                        : "bg-muted-foreground/70"
                    )}
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {listing.title}{" "}
                {listing.listingStage &&
                  listing.listingStage !== "create" &&
                  `(${formatListingStageLabel(listing.listingStage)})`}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              key={listing.id}
              variant="ghost"
              className="w-full justify-between hover:bg-foreground/5"
              asChild
            >
              <Link href={resolveListingPath(listing)} onClick={onLinkClick}>
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rotate-45 rounded-xs shrink-0",
                      listing.listingStage === "create"
                        ? "bg-primary"
                        : "bg-muted-foreground/70"
                    )}
                  />
                  <span className="text-sm truncate">{listing.title}</span>
                </div>
                {listing.listingStage !== "create" ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="muted" className="rounded-full py-1 px-1">
                        <FileEdit className="text-muted-foreground w-[14px]! h-[14px]!" />
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>
                      Draft ({formatListingStageLabel(listing.listingStage)})
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </Link>
            </Button>
          )
        )
      ) : !isCollapsed ? (
        <div className="px-2 text-xs text-muted-foreground">No listings yet.</div>
      ) : null}
      {hasMoreListings && !isCollapsed ? (
        <Button
          variant="ghost"
          className="w-full justify-start text-xs text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href="/listings" onClick={onLinkClick}>
            Show all
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
