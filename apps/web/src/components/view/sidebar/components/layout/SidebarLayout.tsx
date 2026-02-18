"use client";

import * as React from "react";
import { useUser } from "@stackframe/stack";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown } from "lucide-react";
import { cn } from "../../../../ui/utils";
import { Button } from "../../../../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "../../../../ui/tooltip";
import {
  SidebarBrandHeader,
  SidebarContentSection,
  SidebarFeedbackDialog,
  SidebarListingsSection,
  SidebarManageSection,
  SidebarNavIcons,
  SidebarPrimarySection,
  SidebarUserMenu
} from "..";
import { useSidebarFeedback, useSidebarListings } from "../../domain/hooks";
import { useViewSidebar } from "../../shared/ViewSidebarContext";
import type { SidebarLayoutProps } from "../../shared";

export function SidebarLayout({
  userName = "User",
  paymentPlan = "Free",
  userAvatar,
  listings = [],
  onMobileClose,
  isCollapsed = false
}: SidebarLayoutProps) {
  const user = useUser();
  const router = useRouter();
  const [contentExpanded, setContentExpanded] = React.useState(true);
  const [listingsExpanded, setListingsExpanded] = React.useState(true);
  const displayedEmail = user?.primaryEmail ?? "";
  const {
    isFeedbackOpen,
    feedbackType,
    feedbackMessage,
    setIsFeedbackOpen,
    setFeedbackType,
    setFeedbackMessage,
    handleFeedbackOpenChange,
    handleFeedbackSend
  } = useSidebarFeedback();
  const { displayedListingItems, hasMoreListings, pendingListingIds } =
    useSidebarListings(listings);
  const { isMobile } = useViewSidebar();

  const handleLinkClick = () => {
    onMobileClose?.();
  };

  const handleLogout = async () => {
    await user?.signOut();
    router.push("/");
  };

  if (isCollapsed) {
    return (
      <div className="flex flex-col h-full w-16">
        <SidebarBrandHeader collapsed onLinkClick={handleLinkClick} />

        <div className="px-2 pt-4">
          <div className="h-px bg-border w-full" />
        </div>

        <SidebarNavIcons
          displayedListingItems={displayedListingItems}
          pendingListingIds={pendingListingIds}
          hasMoreListings={hasMoreListings}
          onLinkClick={handleLinkClick}
        />

        <div className="p-2 pt-0">
          <div className="pb-2">
            <div className="h-px bg-border w-full" />
          </div>
          <SidebarUserMenu
            collapsed
            userName={userName}
            paymentPlan={paymentPlan}
            userAvatar={userAvatar}
            displayedEmail={displayedEmail}
            onFeedbackOpen={() => setIsFeedbackOpen(true)}
            onLogout={handleLogout}
            onLinkClick={handleLinkClick}
          />
          <SidebarFeedbackDialog
            open={isFeedbackOpen}
            feedbackType={feedbackType}
            feedbackMessage={feedbackMessage}
            onOpenChange={handleFeedbackOpenChange}
            onFeedbackTypeChange={setFeedbackType}
            onFeedbackMessageChange={setFeedbackMessage}
            onSend={handleFeedbackSend}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <SidebarBrandHeader onLinkClick={handleLinkClick} />
      <div className="px-4 pt-4">
        <div className="h-px bg-border w-full" />
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <SidebarPrimarySection onLinkClick={handleLinkClick} />
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

        <div className="space-y-1 -mt-1">
          <div
            onClick={() => setListingsExpanded(!listingsExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            <span>Listings</span>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 hover:bg-foreground/5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMobileClose?.();
                      router.push("/listings/sync");
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent sideOffset={6}>
                  New Listing Campaign
                </TooltipContent>
              </Tooltip>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  listingsExpanded && "rotate-180"
                )}
              />
            </div>
          </div>

          {listingsExpanded && (
            <SidebarListingsSection
              displayedListingItems={displayedListingItems}
              pendingListingIds={pendingListingIds}
              isCollapsed={false}
              hasMoreListings={hasMoreListings}
              onLinkClick={handleLinkClick}
            />
          )}
        </div>

        <div className="py-4">
          <div className="h-px bg-border w-full" />
        </div>

        <SidebarManageSection onLinkClick={handleLinkClick} />
      </nav>

      <div className="p-4 pt-0">
        <div className="pb-4">
          <div className="h-px bg-border w-full" />
        </div>
        <SidebarUserMenu
          userName={userName}
          paymentPlan={paymentPlan}
          userAvatar={userAvatar}
          displayedEmail={displayedEmail}
          isMobile={isMobile}
          onFeedbackOpen={() => setIsFeedbackOpen(true)}
          onLogout={handleLogout}
          onLinkClick={handleLinkClick}
        />
        <SidebarFeedbackDialog
          open={isFeedbackOpen}
          feedbackType={feedbackType}
          feedbackMessage={feedbackMessage}
          onOpenChange={handleFeedbackOpenChange}
          onFeedbackTypeChange={setFeedbackType}
          onFeedbackMessageChange={setFeedbackMessage}
          onSend={handleFeedbackSend}
        />
      </div>
    </div>
  );
}
