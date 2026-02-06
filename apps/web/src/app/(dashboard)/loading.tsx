"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { SidebarSkeleton } from "@web/src/components/view/SidebarSkeleton";

export default function DashboardLoading() {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 pointer-events-none">
        <div className="flex h-full w-full blur-sm">
          <SidebarSkeleton />
          <main className="flex-1 bg-secondary p-3 pl-0">
            <div className="h-full rounded-lg bg-background border border-border overflow-hidden shadow-xs">
              <div className="border-b border-border px-8 py-5">
                <div className="h-3 w-28 rounded-md bg-border/60" />
                <div className="mt-3 h-6 w-56 rounded-md bg-border/60" />
              </div>
              <div className="h-full bg-background" />
            </div>
          </main>
        </div>
      </div>

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="relative flex flex-col gap-6 items-center justify-center">
          <Image
            src="/zencourt-logo.svg"
            alt="Zencourt"
            width={48}
            height={48}
            className="object-contain"
            priority
          />
          <Loader2 size={32} className="animate-spin" />
        </div>
      </div>
    </div>
  );
}
