"use client";

import * as React from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";

type DashboardShellContextValue = {
  headerTitle: string;
  headerSubtitle?: string;
  setHeaderContent: (title: string, subtitle?: string) => void;
};

const DashboardShellContext = React.createContext<DashboardShellContextValue>({
  headerTitle: "",
  headerSubtitle: undefined,
  setHeaderContent: () => {}
});

export const useDashboardShell = () =>
  React.useContext(DashboardShellContext);

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
        setHeaderContent
      }}
    >
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar
          userName={userName}
          paymentPlan={paymentPlan}
          userAvatar={userAvatar}
        />
        <main className="flex-1 overflow-y-auto bg-background">
          {headerTitle ? (
            <DashboardHeader
              title={headerTitle}
              subtitle={headerSubtitle}
            />
          ) : null}
          {children}
        </main>
      </div>
    </DashboardShellContext.Provider>
  );
}
