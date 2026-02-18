"use client";

import { Film, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "../../../../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/tooltip";

type SidebarManageSectionProps = {
  collapsed?: boolean;
  onLinkClick?: () => void;
};

export function SidebarManageSection({
  collapsed = false,
  onLinkClick
}: SidebarManageSectionProps) {
  if (collapsed) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/media" onClick={onLinkClick}>
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
            <Link href="/settings#account" onClick={onLinkClick}>
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
      </>
    );
  }

  return (
    <div className="space-y-1">
      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <span>Manage</span>
      </div>
      <div className="flex flex-col gap-1 mb-4">
        <Link href="/media" onClick={onLinkClick}>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 hover:bg-foreground/5"
          >
            <Film className="h-5 w-5" />
            <span className="text-sm font-medium">My media</span>
          </Button>
        </Link>
        <Link href="/settings#account" onClick={onLinkClick}>
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
  );
}
