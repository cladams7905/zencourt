"use client";

import * as React from "react";
import { useUser } from "@stackframe/stack";
import { useRouter } from "next/navigation";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../ui/select";
import {
  LayoutDashboard,
  Calendar,
  FileEdit,
  Heart,
  Clock,
  Archive,
  Plus,
  ChevronDown,
  Settings,
  LogOut,
  CircleQuestionMark,
  MessageCircle,
  ArrowBigUpDash,
  Film,
  LayoutList
} from "lucide-react";
import Image from "next/image";
import Logo from "../../../public/zencourt-logo.svg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";
import Link from "next/link";
import {
  addListingSidebarListener,
  type ListingSidebarUpdate
} from "@web/src/lib/listingSidebarEvents";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "../ui/sheet";
import { useViewSidebar } from "./ViewSidebarContext";
import { ViewSidebarToggle } from "./ViewSidebarToggle";

type ListingSidebarItem = {
  id: string;
  title: string | null;
  listingStage: string | null;
  lastOpenedAt?: Date | string | null;
};

interface ViewSidebarProps {
  className?: string;
  userName?: string;
  paymentPlan?: string;
  userAvatar?: string;
  listings?: ListingSidebarItem[];
}

interface SidebarContentProps extends ViewSidebarProps {
  onMobileClose?: () => void;
  isCollapsed?: boolean;
}

const SidebarContent = ({
  userName = "User",
  paymentPlan = "Free",
  userAvatar,
  listings = [],
  onMobileClose,
  isCollapsed = false
}: SidebarContentProps) => {
  const user = useUser();
  const router = useRouter();
  const [contentExpanded, setContentExpanded] = React.useState(true);
  const [listingsExpanded, setListingsExpanded] = React.useState(true);
  const [isFeedbackOpen, setIsFeedbackOpen] = React.useState(false);
  const [feedbackType, setFeedbackType] = React.useState("");
  const [feedbackMessage, setFeedbackMessage] = React.useState("");
  const displayedEmail = user?.primaryEmail ?? "";
  const [visibleListings, setVisibleListings] =
    React.useState<ListingSidebarItem[]>(listings);
  const [, startListingsTransition] = React.useTransition();
  const [pendingListingIds, setPendingListingIds] = React.useState(
    () => new Set<string>()
  );
  const pendingListingTimeouts = React.useRef(new Map<string, number>());
  const { isMobile } = useViewSidebar();

  const markListingPending = React.useCallback((listingId: string) => {
    const timeout = pendingListingTimeouts.current.get(listingId);
    if (timeout) {
      window.clearTimeout(timeout);
    }
    setPendingListingIds((prev) => {
      if (prev.has(listingId)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(listingId);
      return next;
    });
    const nextTimeout = window.setTimeout(() => {
      pendingListingTimeouts.current.delete(listingId);
      setPendingListingIds((prev) => {
        if (!prev.has(listingId)) {
          return prev;
        }
        const next = new Set(prev);
        next.delete(listingId);
        return next;
      });
    }, 1200);
    pendingListingTimeouts.current.set(listingId, nextTimeout);
  }, []);

  React.useEffect(
    () => () => {
      pendingListingTimeouts.current.forEach((timeout) =>
        window.clearTimeout(timeout)
      );
      pendingListingTimeouts.current.clear();
    },
    []
  );

  React.useEffect(() => {
    startListingsTransition(() => setVisibleListings(listings));
  }, [listings]);

  React.useEffect(
    () =>
      addListingSidebarListener((update: ListingSidebarUpdate) => {
        markListingPending(update.id);
        startListingsTransition(() =>
          setVisibleListings((prev) => {
            const index = prev.findIndex((item) => item.id === update.id);
            if (index === -1) {
              return [
                {
                  id: update.id,
                  title: update.title ?? null,
                  listingStage: update.listingStage ?? "categorize",
                  lastOpenedAt: update.lastOpenedAt ?? new Date().toISOString()
                },
                ...prev
              ];
            }
            const next = [...prev];
            const existing = next[index];
            next[index] = {
              ...existing,
              title: update.title !== undefined ? update.title : existing.title,
              listingStage:
                update.listingStage !== undefined
                  ? update.listingStage
                  : existing.listingStage,
              lastOpenedAt:
                update.lastOpenedAt !== undefined
                  ? update.lastOpenedAt
                  : existing.lastOpenedAt
            };
            return next;
          })
        );
      }),
    [markListingPending]
  );

  const listingItems = React.useMemo(() => {
    const normalizeTitle = (title?: string | null) =>
      title?.trim() || "Untitled listing";
    const parseTime = (value?: string | Date | null) => {
      if (!value) return 0;
      if (value instanceof Date) return value.getTime();
      const parsed = new Date(value).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    };

    return [...visibleListings]
      .map((listing) => ({
        ...listing,
        title: normalizeTitle(listing.title)
      }))
      .sort((a, b) => parseTime(b.lastOpenedAt) - parseTime(a.lastOpenedAt));
  }, [visibleListings]);

  const displayedListingItems = listingItems.slice(0, 3);
  const hasMoreListings = listingItems.length > 3;

  const formatStageLabel = (stage?: string | null) => {
    if (!stage) return "Draft";
    return stage.charAt(0).toUpperCase() + stage.slice(1);
  };

  const ListingRowSkeleton = ({ id }: { id: string }) => (
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

  const resolveListingPath = (listing: ListingSidebarItem) => {
    switch (listing.listingStage) {
      case "review":
        return `/listings/${listing.id}/review`;
      case "generate":
        return `/listings/${listing.id}/generate`;
      case "create":
        return `/listings/${listing.id}/create`;
      case "categorize":
      default:
        return `/listings/${listing.id}/categorize`;
    }
  };

  const handleLinkClick = () => {
    onMobileClose?.();
  };

  const ListingsSection = () => (
    <div className={cn("space-y-0.5", !isCollapsed && "pl-2")}>
      {displayedListingItems.length > 0 ? (
        displayedListingItems.map((listing) =>
          pendingListingIds.has(listing.id) ? (
            <ListingRowSkeleton key={listing.id} id={listing.id} />
          ) : isCollapsed ? (
            <Tooltip key={listing.id}>
              <TooltipTrigger asChild>
                <Link
                  href={resolveListingPath(listing)}
                  onClick={handleLinkClick}
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
                  `(${listing.listingStage.charAt(0).toUpperCase()}${listing.listingStage.slice(1)})`}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              key={listing.id}
              variant="ghost"
              className="w-full justify-between hover:bg-foreground/5"
              asChild
            >
              <Link
                href={resolveListingPath(listing)}
                onClick={handleLinkClick}
              >
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
                      Draft ({formatStageLabel(listing.listingStage)})
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </Link>
            </Button>
          )
        )
      ) : !isCollapsed ? (
        <div className="px-2 text-xs text-muted-foreground">
          No listings yet.
        </div>
      ) : null}
      {hasMoreListings && !isCollapsed ? (
        <Button
          variant="ghost"
          className="w-full justify-start text-xs text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href="/listings" onClick={handleLinkClick}>
            Show all
          </Link>
        </Button>
      ) : null}
    </div>
  );

  const handleLogout = async () => {
    await user?.signOut();
    router.push("/");
  };

  const handleFeedbackOpenChange = (open: boolean) => {
    setIsFeedbackOpen(open);
    if (!open) {
      setFeedbackType("");
      setFeedbackMessage("");
    }
  };

  const handleFeedbackSend = () => {
    if (!feedbackType) {
      toast.error("Please choose a suggestion type before sending.");
      return;
    }

    const subject = `Zencourt feedback (${feedbackType})`;
    const body = [
      `Type: ${feedbackType}`,
      "",
      "Suggestions:",
      feedbackMessage.trim() || "No additional feedback."
    ].join("\n");

    window.location.href = `mailto:team@zencourt.ai?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    toast.success("Feedback ready to send.");
    handleFeedbackOpenChange(false);
  };

  // Collapsed sidebar - icon only view
  if (isCollapsed) {
    return (
      <div className="flex flex-col h-full w-16">
        {/* Logo Section - icon only */}
        <Link
          href={"/"}
          onClick={handleLinkClick}
          className="pt-5 pb-2 flex items-center justify-center"
        >
          <Image
            src={Logo}
            alt="Zencourt Logo"
            width={24}
            height={24}
            className="object-contain"
          />
        </Link>

        {/* Divider */}
        <div className="px-2 pt-4">
          <div className="h-px bg-border w-full" />
        </div>

        {/* Navigation - icons only */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={"/"} onClick={handleLinkClick}>
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
              <Link href={"/"} onClick={handleLinkClick}>
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

          {/* Divider */}
          <div className="py-2">
            <div className="h-px bg-border w-full" />
          </div>

          {/* Content icons */}
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

          {/* Divider */}
          <div className="py-2">
            <div className="h-px bg-border w-full" />
          </div>

          {/* Listings icons */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/listings" onClick={handleLinkClick}>
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

          <ListingsSection />

          {/* Divider */}
          <div className="py-2">
            <div className="h-px bg-border w-full" />
          </div>

          {/* Manage icons */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/media" onClick={handleLinkClick}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full h-10 hover:bg-foreground/5"
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
              <Link href="/settings#account" onClick={handleLinkClick}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full h-10 hover:bg-foreground/5"
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

        {/* User Profile - avatar only */}
        <div className="p-2 pt-0">
          <div className="pb-2">
            <div className="h-px bg-border w-full" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center justify-center py-2 rounded-lg hover:bg-foreground/5 cursor-pointer transition-all duration-200 group outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                {userAvatar ? (
                  <Image
                    src={userAvatar}
                    alt={userName}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover border border-border group-hover:border-foreground/20 transition-colors"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center border border-border group-hover:border-foreground/20 transition-colors">
                    <span className="text-xs font-semibold text-primary-foreground">
                      {userName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              side="right"
              sideOffset={8}
              className="w-52"
            >
              {displayedEmail ? (
                <div className="px-3 pb-1">
                  <span className="text-xs text-muted-foreground truncate">
                    {displayedEmail}
                  </span>
                </div>
              ) : null}
              <DropdownMenuItem
                asChild
                className="transition-all duration-150 group"
              >
                <Link href="/settings#billing" onClick={handleLinkClick}>
                  <ArrowBigUpDash className="mr-3 h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="text-sm font-medium">Upgrade plan</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1.5 bg-border/50" />
              <DropdownMenuItem
                className="transition-all duration-150 group"
                onSelect={() => setIsFeedbackOpen(true)}
              >
                <MessageCircle className="mr-3 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-sm font-medium">Feedback</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                asChild
                className="transition-all duration-150 group"
              >
                <a href="mailto:team@zencourt.ai">
                  <CircleQuestionMark className="mr-3 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="text-sm font-medium">Get help</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1.5 bg-border/50" />
              <DropdownMenuItem
                className="transition-all duration-150 group"
                onClick={handleLogout}
              >
                <LogOut className="mr-3 h-4 w-4" />
                <span className="text-sm font-medium">Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={isFeedbackOpen} onOpenChange={handleFeedbackOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Share feedback</DialogTitle>
                <DialogDescription>
                  Tell us what we should improve or build next.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="feedback-type">Type</Label>
                  <Select value={feedbackType} onValueChange={setFeedbackType}>
                    <SelectTrigger id="feedback-type">
                      <SelectValue placeholder="Select a suggestion type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bug">Bug</SelectItem>
                      <SelectItem value="Feature request">
                        Feature request
                      </SelectItem>
                      <SelectItem value="Billing">Billing</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feedback-message">Suggestion</Label>
                  <Textarea
                    id="feedback-message"
                    placeholder="What should we do better?"
                    value={feedbackMessage}
                    onChange={(event) => setFeedbackMessage(event.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleFeedbackOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleFeedbackSend}
                  disabled={!feedbackType}
                >
                  Send feedback
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  // Expanded sidebar - full view
  return (
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <Link
        href={"/"}
        onClick={handleLinkClick}
        className={cn("pt-5 flex items-center px-6 gap-3 pb-2")}
      >
        <Image
          src={Logo}
          alt="Zencourt Logo"
          width={24}
          height={24}
          className="object-contain"
        />
        <span className="text-foreground font-header text-2xl font-semibold tracking-tight">
          zencourt
        </span>
      </Link>
      {/* Divider */}
      <div className="px-4 pt-4">
        <div className="h-px bg-border w-full" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {/* Divider */}
        <div className="flex flex-col pt-4 gap-1">
          {/* Main Navigation */}
          <Link href={"/"} onClick={handleLinkClick}>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 hover:bg-foreground/5"
            >
              <LayoutDashboard className="h-5 w-5" />
              <span className="text-sm font-medium">Dashboard</span>
            </Button>
          </Link>

          <Link href={"/"} onClick={handleLinkClick}>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 hover:bg-foreground/5"
            >
              <Calendar className="h-5 w-5" />
              <span className="text-sm font-medium">Calendar</span>
            </Button>
          </Link>
        </div>
        {/* Divider */}
        <div className="py-4">
          <div className="h-px bg-border w-full" />
        </div>

        {/* Content Section */}
        <div className="space-y-1 -mt-1">
          <div
            onClick={() => setContentExpanded(!contentExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            <span>Content</span>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 hover:bg-foreground/5"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent sideOffset={6}>New Content</TooltipContent>
              </Tooltip>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  contentExpanded && "rotate-180"
                )}
              />
            </div>
          </div>

          {contentExpanded && (
            <div className="space-y-0.5 pl-2">
              <Button
                variant="ghost"
                className="w-full justify-between hover:bg-foreground/5"
              >
                <div className="flex items-center gap-3">
                  <FileEdit className="h-4 w-4" />
                  <span className="text-sm">Drafts</span>
                </div>
                <Badge
                  variant="muted"
                  className="text-xs px-1.5 font-bold py-0 h-5"
                >
                  3
                </Badge>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-between hover:bg-foreground/5"
              >
                <div className="flex items-center gap-3">
                  <Heart className="h-4 w-4" />
                  <span className="text-sm">Favorites</span>
                </div>
                <Badge
                  variant="muted"
                  className="text-xs px-1.5 font-bold py-0 h-5"
                >
                  12
                </Badge>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-between hover:bg-foreground/5"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Scheduled</span>
                </div>
                <Badge
                  variant="muted"
                  className="text-xs px-1.5 font-bold py-0 h-5"
                >
                  5
                </Badge>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-between hover:bg-foreground/5"
              >
                <div className="flex items-center gap-3">
                  <Archive className="h-4 w-4" />
                  <span className="text-sm">Archive</span>
                </div>
                <Badge
                  variant="muted"
                  className="text-xs px-1.5 font-bold py-0 h-5"
                >
                  48
                </Badge>
              </Button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="py-4">
          <div className="h-px bg-border w-full" />
        </div>

        {/* Listings Section */}
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

          {listingsExpanded && <ListingsSection />}
        </div>

        {/* Divider */}
        <div className="py-4">
          <div className="h-px bg-border w-full" />
        </div>

        {/* Media + Settings Section */}
        <div className="space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Manage</span>
          </div>
          <div className="flex flex-col gap-1 mb-4">
            <Link href="/media" onClick={handleLinkClick}>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 hover:bg-foreground/5"
              >
                <Film className="h-5 w-5" />
                <span className="text-sm font-medium">My media</span>
              </Button>
            </Link>
            <Link href="/settings#account" onClick={handleLinkClick}>
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

      {/* User Profile */}
      <div className="p-4 pt-0">
        {/* Divider */}
        <div className="pb-4">
          <div className="h-px bg-border w-full" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-foreground/5 cursor-pointer transition-all duration-200 group outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              {userAvatar ? (
                <Image
                  src={userAvatar}
                  alt={userName}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover border border-border group-hover:border-foreground/20 transition-colors"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center border border-border group-hover:border-foreground/20 transition-colors">
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
              <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-all group-data-[state=open]:rotate-180 duration-200" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            side="top"
            sideOffset={8}
            className={isMobile ? "w-64" : "w-52"}
          >
            {displayedEmail ? (
              <div className="px-3 pb-1">
                <span className="text-xs text-muted-foreground truncate">
                  {displayedEmail}
                </span>
              </div>
            ) : null}
            <DropdownMenuItem
              asChild
              className="transition-all duration-150 group"
            >
              <Link href="/settings#billing" onClick={handleLinkClick}>
                <ArrowBigUpDash className="mr-3 h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-sm font-medium">Upgrade plan</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1.5 bg-border/50" />
            <DropdownMenuItem
              className="transition-all duration-150 group"
              onSelect={() => setIsFeedbackOpen(true)}
            >
              <MessageCircle className="mr-3 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-sm font-medium">Feedback</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className="transition-all duration-150 group"
            >
              <a href="mailto:team@zencourt.ai">
                <CircleQuestionMark className="mr-3 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-sm font-medium">Get help</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1.5 bg-border/50" />
            <DropdownMenuItem
              className="transition-all duration-150 group"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-4 w-4" />
              <span className="text-sm font-medium">Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Dialog open={isFeedbackOpen} onOpenChange={handleFeedbackOpenChange}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Share feedback</DialogTitle>
              <DialogDescription>
                Tell us what we should improve or build next.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feedback-type">Type</Label>
                <Select value={feedbackType} onValueChange={setFeedbackType}>
                  <SelectTrigger id="feedback-type">
                    <SelectValue placeholder="Select a suggestion type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bug">Bug</SelectItem>
                    <SelectItem value="Feature request">
                      Feature request
                    </SelectItem>
                    <SelectItem value="Billing">Billing</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback-message">Suggestion</Label>
                <Textarea
                  id="feedback-message"
                  placeholder="What should we do better?"
                  value={feedbackMessage}
                  onChange={(event) => setFeedbackMessage(event.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleFeedbackOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleFeedbackSend}
                disabled={!feedbackType}
              >
                Send feedback
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

const ViewSidebar = ({
  className,
  userName = "User",
  paymentPlan = "Free",
  userAvatar,
  listings = []
}: ViewSidebarProps) => {
  const { isMobile, isCollapsed, openMobile, setOpenMobile } = useViewSidebar();

  // Mobile: render as Sheet drawer
  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side="left"
          className="p-0 bg-secondary [&>button]:hidden w-[300px]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Main navigation menu</SheetDescription>
          </SheetHeader>
          <SidebarContent
            userName={userName}
            paymentPlan={paymentPlan}
            userAvatar={userAvatar}
            listings={listings}
            onMobileClose={() => setOpenMobile(false)}
            isCollapsed={false}
          />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: render as collapsible sidebar
  return (
    <aside
      className={cn(
        "relative shrink-0 flex flex-col bg-secondary overflow-hidden",
        "transition-[width] duration-200 ease-linear",
        isCollapsed ? "w-16" : "w-[260px]",
        className
      )}
    >
      <SidebarContent
        userName={userName}
        paymentPlan={paymentPlan}
        userAvatar={userAvatar}
        listings={listings}
        isCollapsed={isCollapsed}
      />
      <ViewSidebarToggle />
    </aside>
  );
};

const ViewSidebarStatic = ({
  className,
  userName = "User",
  paymentPlan = "Free",
  userAvatar
}: ViewSidebarProps) => {
  const [contentExpanded, setContentExpanded] = React.useState(true);
  const [listingsExpanded, setListingsExpanded] = React.useState(true);

  return (
    <aside
      className={cn(
        "w-[260px] shrink-0 flex flex-col border-r border-border bg-secondary",
        className
      )}
    >
      {/* Logo Section */}
      <div className={cn("pt-5 flex items-center just px-6 gap-3 pb-2")}>
        <Image
          src={Logo}
          alt="Zencourt Logo"
          width={24}
          height={24}
          className="object-contain"
        />
        <span className="text-foreground font-header text-2xl font-semibold tracking-tight">
          zencourt
        </span>
      </div>

      {/* Navigation */}
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

        <div className="space-y-1">
          <div
            onClick={() => setContentExpanded(!contentExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            <span>Content</span>
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
                  contentExpanded && "rotate-180"
                )}
              />
            </div>
          </div>

          {contentExpanded && (
            <div className="space-y-0.5 pl-2">
              <Button
                variant="ghost"
                className="w-full justify-between hover:bg-foreground/5"
              >
                <div className="flex items-center gap-3">
                  <FileEdit className="h-4 w-4" />
                  <span className="text-sm">Drafts</span>
                </div>
                <Badge variant="muted" className="text-xs px-1.5 py-0 h-5">
                  3
                </Badge>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-between hover:bg-foreground/5"
              >
                <div className="flex items-center gap-3">
                  <Heart className="h-4 w-4" />
                  <span className="text-sm">Favorites</span>
                </div>
                <Badge variant="muted" className="text-xs px-1.5 py-0 h-5">
                  12
                </Badge>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-between hover:bg-foreground/5"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Scheduled</span>
                </div>
                <Badge variant="muted" className="text-xs px-1.5 py-0 h-5">
                  5
                </Badge>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-between hover:bg-foreground/5"
              >
                <div className="flex items-center gap-3">
                  <Archive className="h-4 w-4" />
                  <span className="text-sm">Archive</span>
                </div>
                <Badge variant="muted" className="text-xs px-1.5 py-0 h-5">
                  48
                </Badge>
              </Button>
            </div>
          )}
        </div>

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

        <div className="space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Manage</span>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 hover:bg-foreground/5"
          >
            <Film className="h-5 w-5" />
            <span className="text-sm font-medium">My media</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 hover:bg-foreground/5"
          >
            <Settings className="h-5 w-5" />
            <span className="text-sm font-medium">Settings</span>
          </Button>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 pt-0">
        {/* Divider */}
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
};

export { ViewSidebar, ViewSidebarStatic };
