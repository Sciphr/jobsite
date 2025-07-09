// app/providers/QueryProvider.js
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
            gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
            // Retry failed requests up to 3 times
            retry: 3,
            // Refetch when window regains focus
            refetchOnWindowFocus: false, // Disable for admin dashboard
            // Refetch when reconnecting to internet
            refetchOnReconnect: true,
            // Show cached data while refetching in background
            refetchInterval: false,
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
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
