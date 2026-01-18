"use client";

import * as React from "react";
import { useUser } from "@stackframe/stack";
import { useRouter } from "next/navigation";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  LayoutDashboard,
  Calendar,
  FileEdit,
  Film,
  Heart,
  Clock,
  Archive,
  Plus,
  ChevronDown,
  Settings,
  LogOut,
  CircleQuestionMark,
  MessageCircle
} from "lucide-react";
import Image from "next/image";
import Logo from "../../../public/zencourt-logo.png";
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

interface DashboardSidebarProps {
  className?: string;
  userName?: string;
  paymentPlan?: string;
  userAvatar?: string;
}

const DashboardSidebar = ({
  className,
  userName = "User",
  paymentPlan = "Free",
  userAvatar
}: DashboardSidebarProps) => {
  const user = useUser();
  const router = useRouter();
  const [contentExpanded, setContentExpanded] = React.useState(true);
  const [listingsExpanded, setListingsExpanded] = React.useState(true);
  const [isFeedbackOpen, setIsFeedbackOpen] = React.useState(false);
  const [feedbackRating, setFeedbackRating] = React.useState<number | null>(
    null
  );
  const [feedbackMessage, setFeedbackMessage] = React.useState("");

  const handleLogout = async () => {
    await user?.signOut();
    router.push("/");
  };

  const handleFeedbackOpenChange = (open: boolean) => {
    setIsFeedbackOpen(open);
    if (!open) {
      setFeedbackRating(null);
      setFeedbackMessage("");
    }
  };

  const handleFeedbackSend = () => {
    if (!feedbackRating) {
      toast.error("Please choose a rating before sending.");
      return;
    }

    const subject = `Zencourt feedback (${feedbackRating}/5)`;
    const body = [
      `Rating: ${feedbackRating}/5`,
      "",
      "Suggestions:",
      feedbackMessage.trim() || "No additional feedback."
    ].join("\n");

    window.location.href = `mailto:team@zencourt.app?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    toast.success("Feedback ready to send.");
    handleFeedbackOpenChange(false);
  };

  return (
    <aside
      className={cn(
        "w-[260px] shrink-0 flex flex-col border-r border-border/50 bg-secondary",
        className
      )}
    >
      {/* Logo Section */}
      <div className="pt-5 pb-6 flex items-center just px-6 gap-3 border-b border-border">
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
        {/* Divider */}
        <div className="flex flex-col pt-4 gap-1">
          {/* Main Navigation */}
          <Link href={"/"}>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 hover:bg-foreground/5"
            >
              <LayoutDashboard className="h-5 w-5" />
              <span className="text-sm font-medium">Dashboard</span>
            </Button>
          </Link>

          <Link href={"/"}>
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

        {/* Divider */}
        <div className="py-4">
          <div className="h-px bg-border w-full" />
        </div>

        {/* Listings Section */}
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
                <div className="w-1.5 h-1.5 rotate-45 bg-foreground shrink-0" />
                <span className="text-sm truncate">1240 Serenity Lane</span>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 hover:bg-foreground/5"
              >
                <div className="w-1.5 h-1.5 rotate-45 bg-foreground shrink-0" />
                <span className="text-sm truncate">880 Fairview Blvd</span>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 hover:bg-foreground/5"
              >
                <div className="w-1.5 h-1.5 rotate-45 bg-foreground shrink-0" />
                <span className="text-sm truncate">Woodland Estate</span>
              </Button>
            </div>
          )}
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
      </nav>

      {/* User Profile */}
      <div className="p-6 border-t border-border/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-foreground/5 cursor-pointer transition-all duration-200 group outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
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
            align="end"
            side="top"
            sideOffset={8}
            className="w-52 bg-popover/95 backdrop-blur-xl border-border/50 shadow-2xl rounded-xl p-1.5"
          >
            <DropdownMenuItem
              className="rounded-lg px-3 py-2.5 cursor-pointer focus:bg-secondary transition-all duration-150 group"
              onSelect={() => setIsFeedbackOpen(true)}
            >
              <MessageCircle className="mr-3 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-sm font-medium">Feedback</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className="rounded-lg px-3 py-2.5 cursor-pointer focus:bg-secondary transition-all duration-150 group"
            >
              <a href="mailto:team@zencourt.app">
                <CircleQuestionMark className="mr-3 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-sm font-medium">Get help</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1.5 bg-border/50" />
            <DropdownMenuItem
              className="rounded-lg px-3 py-2.5 cursor-pointer focus:bg-secondary transition-all duration-150 group"
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
                <Label>Rating</Label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant={feedbackRating === value ? "default" : "outline"}
                      className="h-9"
                      onClick={() => setFeedbackRating(value)}
                    >
                      {value}
                    </Button>
                  ))}
                </div>
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
                disabled={!feedbackRating}
              >
                Send feedback
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </aside>
  );
};

const DashboardSidebarStatic = ({
  className,
  userName = "User",
  paymentPlan = "Free",
  userAvatar
}: DashboardSidebarProps) => {
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
      <div className="pt-5 pb-6 flex items-center just px-6 gap-3 border-b border-border/50">
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
                <div className="w-1.5 h-1.5 rotate-45 bg-foreground shrink-0" />
                <span className="text-sm truncate">1240 Serenity Lane</span>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 hover:bg-foreground/5"
              >
                <div className="w-1.5 h-1.5 rotate-45 bg-foreground shrink-0" />
                <span className="text-sm truncate">880 Fairview Blvd</span>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 hover:bg-foreground/5"
              >
                <div className="w-1.5 h-1.5 rotate-45 bg-foreground shrink-0" />
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
      <div className="p-6 border-t border-border">
        <div className="w-full flex items-center gap-3 px-2 py-2 rounded-xl bg-foreground/5 border border-border">
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

export { DashboardSidebar, DashboardSidebarStatic };
