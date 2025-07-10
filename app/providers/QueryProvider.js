// app/providers/QueryProvider.js - FIXED VERSION
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
            // ✅ FIXED: More aggressive caching to prevent unnecessary API calls
            staleTime: 10 * 60 * 1000, // 10 minutes - data stays fresh longer
            gcTime: 60 * 60 * 1000, // 1 hour - keep in cache longer

            // ✅ FIXED: Prevent refetching on navigation
            refetchOnMount: false, // ❌ WAS: true - this was causing refetch on page navigation
            refetchOnWindowFocus: false, // Already correctly set
            refetchOnReconnect: false, // Already correctly set

            // ✅ Keep these settings
            retry: 3,
            refetchInterval: false,
            networkMode: "online",
          },
          mutations: {
            retry: 1,
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
