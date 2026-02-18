"use client";

import { cn } from "../../../ui/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "../../../ui/sheet";
import { SidebarLayout, ViewSidebarStatic, ViewSidebarToggle } from "../components";
import { useViewSidebar } from "../shared/ViewSidebarContext";
import type { ViewSidebarProps } from "../shared";

const ViewSidebar = ({
  className,
  userName = "User",
  paymentPlan = "Free",
  userAvatar,
  listings = []
}: ViewSidebarProps) => {
  const { isMobile, isCollapsed, openMobile, setOpenMobile } = useViewSidebar();

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side="left"
          className="p-0 bg-secondary [&>button]:hidden w-[300px]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Main navigation menu</SheetDescription>
          </SheetHeader>
          <SidebarLayout
            userName={userName}
            paymentPlan={paymentPlan}
            userAvatar={userAvatar}
            listings={listings}
            onMobileClose={() => setOpenMobile(false)}
            isCollapsed={false}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        "relative shrink-0 flex flex-col bg-secondary overflow-hidden",
        "transition-[width] duration-200 ease-linear",
        isCollapsed ? "w-16" : "w-[260px]",
        className
      )}
    >
      <SidebarLayout
        userName={userName}
        paymentPlan={paymentPlan}
        userAvatar={userAvatar}
        listings={listings}
        isCollapsed={isCollapsed}
      />
      <ViewSidebarToggle />
    </aside>
  );
};

export { ViewSidebar, ViewSidebarStatic };
