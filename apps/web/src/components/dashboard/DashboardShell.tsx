"use client";

import * as React from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";

type DashboardShellContextValue = {
  headerTitle: string;
  headerSubtitle?: string;
  setHeaderContent: (title: string, subtitle?: string) => void;
  setHeaderVisible: (visible: boolean) => void;
  headerVisible: boolean;
};

const DashboardShellContext = React.createContext<DashboardShellContextValue>({
  headerTitle: "",
  headerSubtitle: undefined,
  setHeaderContent: () => {},
  setHeaderVisible: () => {},
  headerVisible: true
});

export const useDashboardShell = () => React.useContext(DashboardShellContext);

interface DashboardShellProps {
  children: React.ReactNode;
  userName?: string;
  paymentPlan?: string;
  userAvatar?: string;
}

export function DashboardShell({
  children,
  userName,
  paymentPlan,
  userAvatar
}: DashboardShellProps) {
  const [headerTitle, setHeaderTitle] = React.useState("");
  const [headerSubtitle, setHeaderSubtitle] = React.useState<
    string | undefined
  >(undefined);
  const [headerVisible, setHeaderVisible] = React.useState(true);

  const setHeaderContent = React.useCallback(
    (title: string, subtitle?: string) => {
      setHeaderTitle(title);
      setHeaderSubtitle(subtitle);
    },
    []
  );

  return (
    <DashboardShellContext.Provider
      value={{
        headerTitle,
        headerSubtitle,
        setHeaderContent,
        headerVisible,
        setHeaderVisible
      }}
    >
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar
          userName={userName}
          paymentPlan={paymentPlan}
          userAvatar={userAvatar}
        />
        <main className="flex-1 bg-secondary p-3 pl-0 overflow-x-hidden">
          <div className="rounded-xl bg-background border border-border h-full overflow-y-auto overflow-x-hidden">
            {headerTitle && headerVisible ? (
              <DashboardHeader title={headerTitle} subtitle={headerSubtitle} />
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </DashboardShellContext.Provider>
  );
}
