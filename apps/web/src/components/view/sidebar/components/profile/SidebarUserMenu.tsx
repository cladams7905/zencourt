"use client";

import {
  ArrowBigUpDash,
  ChevronDown,
  CircleQuestionMark,
  LogOut,
  MessageCircle
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../../../../ui/dropdown-menu";

type SidebarUserMenuProps = {
  collapsed?: boolean;
  userName: string;
  paymentPlan: string;
  userAvatar?: string;
  displayedEmail?: string;
  isMobile?: boolean;
  onFeedbackOpen: () => void;
  onLogout: () => void;
  onLinkClick?: () => void;
};

export function SidebarUserMenu({
  collapsed = false,
  userName,
  paymentPlan,
  userAvatar,
  displayedEmail,
  isMobile = false,
  onFeedbackOpen,
  onLogout,
  onLinkClick
}: SidebarUserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {collapsed ? (
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
        ) : (
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
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        side={collapsed ? "right" : "top"}
        sideOffset={8}
        className={collapsed ? "w-52" : isMobile ? "w-64" : "w-52"}
      >
        {displayedEmail ? (
          <div className="px-3 pb-1">
            <span className="text-xs text-muted-foreground truncate">
              {displayedEmail}
            </span>
          </div>
        ) : null}
        <DropdownMenuItem asChild className="transition-all duration-150 group">
          <Link href="/settings#billing" onClick={onLinkClick}>
            <ArrowBigUpDash className="mr-3 h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="text-sm font-medium">Upgrade plan</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1.5 bg-border/50" />
        <DropdownMenuItem
          className="transition-all duration-150 group"
          onSelect={onFeedbackOpen}
        >
          <MessageCircle className="mr-3 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="text-sm font-medium">Feedback</span>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="transition-all duration-150 group">
          <a href="mailto:team@zencourt.ai">
            <CircleQuestionMark className="mr-3 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="text-sm font-medium">Get help</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1.5 bg-border/50" />
        <DropdownMenuItem
          className="transition-all duration-150 group"
          onClick={onLogout}
        >
          <LogOut className="mr-3 h-4 w-4" />
          <span className="text-sm font-medium">Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
