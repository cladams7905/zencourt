import { Suspense } from "react";
import { SidebarWrapper } from "@web/src/components/dashboard/SidebarWrapper";
import { SidebarSkeleton } from "@web/src/components/dashboard/SidebarSkeleton";

export default function DashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarWrapper />
      </Suspense>
      <main className="flex-1 bg-secondary p-3 pl-0 overflow-x-hidden">
        <div className="rounded-lg bg-background shadow-xs border border-border h-full overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
