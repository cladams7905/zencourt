"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { ViewSidebarStatic } from "@web/src/components/dashboard/ViewSidebar";
import { ViewHeader } from "@web/src/components/dashboard/ViewHeader";

export default function DashboardLoading() {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 pointer-events-none">
        <div className="flex h-full w-full blur-md">
          <ViewSidebarStatic userName="Alex Rivera" paymentPlan="Pro" />
          <main className="flex-1 bg-secondary p-3">
            <div className="h-full rounded-xl bg-background border border-border overflow-hidden shadow-xs">
              <ViewHeader title="Welcome back, Alex Rivera" />
              <div className="h-full bg-background" />
            </div>
          </main>
        </div>
      </div>

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <Loader2 className="absolute h-20 w-20 animate-spin text-primary" />
          <Image
            src="/zencourt-logo.svg"
            alt="Zencourt"
            width={24}
            height={24}
            className="h-6 w-6 object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
}
