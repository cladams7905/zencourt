"use client";

import Link from "next/link";
import { cn } from "../../../../ui/utils";
import { ZencourtLogo } from "../../../../ui/zencourt-logo";

type SidebarBrandHeaderProps = {
  collapsed?: boolean;
  onLinkClick?: () => void;
};

export function SidebarBrandHeader({
  collapsed = false,
  onLinkClick
}: SidebarBrandHeaderProps) {
  if (collapsed) {
    return (
      <Link
        href={"/"}
        onClick={onLinkClick}
        className="pt-5 pb-2 flex items-center justify-center"
      >
        <ZencourtLogo className="object-contain" />
      </Link>
    );
  }

  return (
    <Link
      href={"/"}
      onClick={onLinkClick}
      className={cn("pt-5 flex items-center px-6 gap-3 pb-2")}
    >
      <ZencourtLogo className="object-contain" />
      <span className="text-foreground font-header text-2xl font-semibold tracking-tight">
        zencourt
      </span>
    </Link>
  );
}
