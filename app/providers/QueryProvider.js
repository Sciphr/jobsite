// app/providers/QueryProvider.js - Fixed configuration
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Keep data fresh for 5 minutes before considering it stale
            staleTime: 5 * 60 * 1000, // 5 minutes
            // Keep data in cache for 30 minutes after it becomes inactive
            gcTime: 30 * 60 * 1000, // 30 minutes
            // Retry failed requests up to 3 times
            retry: 3,
            // CRITICAL: Disable automatic refetching on navigation
            refetchOnWindowFocus: false,
            refetchOnReconnect: false, // Disable for admin dashboard
            refetchOnMount: true, // Only refetch if data is stale
            // Don't refetch interval
            refetchInterval: false,
            // Network mode - online only (prevents unnecessary calls)
            networkMode: "online",
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
            // Network mode for mutations
            networkMode: "online",
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}
