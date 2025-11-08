"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

/**
 * React Query Provider Component
 *
 * Wraps the app with QueryClientProvider for data fetching and caching
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  // Create a client instance per component instance
  // This ensures server and client don't share state
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Don't refetch on window focus by default
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
            // Default stale time: 1 minute
            staleTime: 60 * 1000
          }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
