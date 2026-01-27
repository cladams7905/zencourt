"use client";

import * as React from "react";
import { useDashboardShell } from "./DashboardShell";

interface ViewHeaderProps {
  title: string;
  subtitle?: string;
}

export function ViewHeader({ title, subtitle }: ViewHeaderProps) {
  const { setHeaderContent } = useDashboardShell();

  React.useEffect(() => {
    setHeaderContent(title, subtitle);
  }, [setHeaderContent, subtitle, title]);

  return null;
}
