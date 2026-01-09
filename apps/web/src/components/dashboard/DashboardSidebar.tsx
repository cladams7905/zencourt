"use client";

import * as React from "react";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  LayoutDashboard,
  Calendar,
  FileEdit,
  Heart,
  Clock,
  Archive,
  Plus,
  ChevronDown
} from "lucide-react";
import Image from "next/image";
import Logo from "../../../public/zencourt-logo.svg";

interface DashboardSidebarProps {
  className?: string;
  userName?: string;
  userRole?: string;
  userAvatar?: string;
}

const DashboardSidebar = ({
  className,
  userName = "Carter Adams",
  userRole = "Pro Agent",
  userAvatar
}: DashboardSidebarProps) => {
  const [contentExpanded, setContentExpanded] = React.useState(true);
  const [campaignsExpanded, setCampaignsExpanded] = React.useState(true);

  return (
    <aside
      className={cn(
        "w-[260px] shrink-0 bg-accent/40 text-foreground flex flex-col border-r border-border",
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
        <span className="text-foreground font-spartan text-2xl font-semibold tracking-tight">
          zencourt
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {/* Divider */}
        <div className="pt-4"></div>
        {/* Main Navigation */}
        <Button variant="ghost" className="w-full justify-start gap-3">
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-sm font-medium">Dashboard</span>
        </Button>

        <Button variant="ghost" className="w-full justify-start gap-3">
          <Calendar className="h-5 w-5" />
          <span className="text-sm font-medium">Calendar</span>
        </Button>

        {/* Divider */}
        <div className="py-4">
          <div className="h-px bg-border w-full" />
        </div>

        {/* Content Section */}
        <div className="space-y-1">
          <button
            onClick={() => setContentExpanded(!contentExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            <span>Content</span>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 hover:bg-accent/20"
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
          </button>

          {contentExpanded && (
            <div className="space-y-0.5 pl-2">
              <Button
                variant="ghost"
                className="w-full justify-between text-muted-foreground hover:text-foreground hover:bg-accent/10"
              >
                <div className="flex items-center gap-3">
                  <FileEdit className="h-4 w-4" />
                  <span className="text-sm">Drafts</span>
                </div>
                <Badge variant="white" className="text-xs px-1.5 py-0 h-5">
                  3
                </Badge>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-between text-muted-foreground hover:text-foreground hover:bg-accent/10"
              >
                <div className="flex items-center gap-3">
                  <Heart className="h-4 w-4" />
                  <span className="text-sm">Favorites</span>
                </div>
                <Badge variant="white" className="text-xs px-1.5 py-0 h-5">
                  12
                </Badge>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-between text-muted-foreground hover:text-foreground hover:bg-accent/10"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Scheduled</span>
                </div>
                <Badge variant="white" className="text-xs px-1.5 py-0 h-5">
                  5
                </Badge>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-between text-muted-foreground hover:text-foreground hover:bg-accent/10"
              >
                <div className="flex items-center gap-3">
                  <Archive className="h-4 w-4" />
                  <span className="text-sm">Archive</span>
                </div>
                <Badge variant="white" className="text-xs px-1.5 py-0 h-5">
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

        {/* Campaigns Section */}
        <div className="space-y-1">
          <button
            onClick={() => setCampaignsExpanded(!campaignsExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            <span>Campaigns</span>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 hover:bg-accent/20"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  campaignsExpanded && "rotate-180"
                )}
              />
            </div>
          </button>

          {campaignsExpanded && (
            <div className="space-y-0.5 pl-2">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-accent/10"
              >
                <div className="w-1.5 h-1.5 rotate-45 bg-foreground shrink-0" />
                <span className="text-sm truncate">1240 Serenity Lane</span>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-accent/10"
              >
                <div className="w-1.5 h-1.5 rotate-45 bg-foreground shrink-0" />
                <span className="text-sm truncate">880 Fairview Blvd</span>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-accent/10"
              >
                <div className="w-1.5 h-1.5 rotate-45 bg-foreground shrink-0" />
                <span className="text-sm truncate">Woodland Estate</span>
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-6 border-t border-border/50">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-accent/10 cursor-pointer transition-colors">
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              className="h-10 w-10 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center border border-border">
              <span className="text-sm font-semibold text-accent-foreground">
                {userName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">
              {userName}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {userRole}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export { DashboardSidebar };
