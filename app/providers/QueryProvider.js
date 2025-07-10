// app/providers/QueryProvider.js - FIXED VERSION
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // ✅ REPLACE WITH THIS:
        // ✅ SUPER AGGRESSIVE CACHING for instant navigation:
        defaultOptions: {
          queries: {
            staleTime: 10 * 60 * 1000, // 10 minutes before considering stale
            gcTime: 60 * 60 * 1000, // 1 hour in cache
            refetchOnMount: false, // ✅ Never refetch on component mount
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchInterval: false,
            retry: 1, // Fail fast
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
