"use client";

import type { ReactNode } from "react";
import { StackProvider } from "@stackframe/stack";
import { getStackClientApp } from "../../server/lib/stack/client";

interface StackAuthProviderProps {
  children: ReactNode;
}

export function StackAuthProvider({ children }: StackAuthProviderProps) {
  const stackClientApp = getStackClientApp();
  return <StackProvider app={stackClientApp}>{children}</StackProvider>;
}
