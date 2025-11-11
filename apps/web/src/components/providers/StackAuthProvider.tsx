"use client";

import type { ReactNode } from "react";
import { StackProvider } from "@stackframe/stack";
import { stackClientApp } from "../../server/lib/stack/client";

interface StackAuthProviderProps {
  children: ReactNode;
}

export function StackAuthProvider({ children }: StackAuthProviderProps) {
  return <StackProvider app={stackClientApp}>{children}</StackProvider>;
}
