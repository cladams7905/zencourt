"use client";

import { Calendar, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Button } from "../../../../ui/button";

type SidebarPrimarySectionProps = {
  onLinkClick?: () => void;
};

export function SidebarPrimarySection({ onLinkClick }: SidebarPrimarySectionProps) {
  return (
    <div className="flex flex-col pt-4 gap-1">
      <Link href="/" onClick={onLinkClick}>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 hover:bg-foreground/5"
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-sm font-medium">Dashboard</span>
        </Button>
      </Link>

      <Link href="/" onClick={onLinkClick}>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 hover:bg-foreground/5"
        >
          <Calendar className="h-5 w-5" />
          <span className="text-sm font-medium">Calendar</span>
        </Button>
      </Link>
    </div>
  );
}
