import { Suspense } from "react";
import { SidebarWrapper } from "@web/src/components/dashboard/SidebarWrapper";
import { SidebarSkeleton } from "@web/src/components/dashboard/SidebarSkeleton";
import { ViewSidebarProvider } from "@web/src/components/dashboard/ViewSidebarContext";
import { MobileSidebarTrigger } from "@web/src/components/dashboard/MobileSidebarTrigger";
import { MobileCreateFAB } from "@web/src/components/dashboard/MobileCreateFAB";

export default function DashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ViewSidebarProvider>
      <div className="flex h-screen overflow-hidden pt-14 md:pt-0">
        <MobileSidebarTrigger />
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarWrapper />
        </Suspense>
        <main className="flex-1 bg-secondary p-0 md:p-3 md:pl-0 overflow-x-hidden">
          <div className="md:rounded-lg bg-background md:shadow-xs md:border md:border-border h-full overflow-y-auto overflow-x-hidden">
            {children}
          </div>
        </main>
        <MobileCreateFAB />
      </div>
    </ViewSidebarProvider>
  );
}
