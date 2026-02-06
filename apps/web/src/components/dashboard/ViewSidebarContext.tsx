"use client";

import * as React from "react";
import { useIsMobile } from "../ui/use-mobile";

const SIDEBAR_COOKIE_NAME = "view_sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type ViewSidebarContextProps = {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  isMobile: boolean;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
};

const ViewSidebarContext = React.createContext<ViewSidebarContextProps | null>(
  null
);

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return undefined;
}

function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}`;
}

interface ViewSidebarProviderProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

export function ViewSidebarProvider({
  children,
  defaultCollapsed = false
}: ViewSidebarProviderProps) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);

  // Initialize collapsed state from cookie or default
  const [isCollapsed, setIsCollapsedState] = React.useState(() => {
    const cookieValue = getCookie(SIDEBAR_COOKIE_NAME);
    if (cookieValue === "collapsed") return true;
    if (cookieValue === "expanded") return false;
    return defaultCollapsed;
  });

  // Persist collapsed state to cookie
  const setIsCollapsed = React.useCallback((collapsed: boolean) => {
    setIsCollapsedState(collapsed);
    setCookie(
      SIDEBAR_COOKIE_NAME,
      collapsed ? "collapsed" : "expanded",
      SIDEBAR_COOKIE_MAX_AGE
    );
  }, []);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((prev) => !prev);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  }, [isMobile, isCollapsed, setIsCollapsed]);

  // Keyboard shortcut: Cmd/Ctrl + B
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  // Close mobile drawer when resizing to desktop
  React.useEffect(() => {
    if (!isMobile && openMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, openMobile]);

  const contextValue = React.useMemo<ViewSidebarContextProps>(
    () => ({
      isCollapsed,
      setIsCollapsed,
      toggleSidebar,
      isMobile,
      openMobile,
      setOpenMobile
    }),
    [isCollapsed, setIsCollapsed, toggleSidebar, isMobile, openMobile]
  );

  return (
    <ViewSidebarContext.Provider value={contextValue}>
      {children}
    </ViewSidebarContext.Provider>
  );
}

export function useViewSidebar() {
  const context = React.useContext(ViewSidebarContext);
  if (!context) {
    throw new Error(
      "useViewSidebar must be used within a ViewSidebarProvider."
    );
  }
  return context;
}
