"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import type { StackClientApp } from "@stackframe/stack";

const StackProvider = dynamic(
  () => import("@stackframe/stack").then((mod) => mod.StackProvider),
  { ssr: false }
);

interface StackAuthProviderProps {
  children: ReactNode;
}

export function StackAuthProvider({ children }: StackAuthProviderProps) {
  const [stackApp, setStackApp] = useState<StackClientApp<true, string> | null>(null);

  useEffect(() => {
    let isMounted = true;
    import("../../server/lib/stack/client").then(({ stackClientApp }) => {
      if (isMounted) {
        setStackApp(stackClientApp);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (!stackApp) {
    return null;
  }

  return <StackProvider app={stackApp}>{children}</StackProvider>;
}
