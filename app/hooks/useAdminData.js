// app/hooks/useAdminData.js
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";

// Generic fetcher function
const fetcher = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch: ${response.status} ${response.statusText}`
    );
  }
  return response.json();
};

// Individual hooks for each data type
export const useJobs = () => {
  return useQuery({
    queryKey: ["admin", "jobs"],
    queryFn: () => fetcher("/api/admin/jobs"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useApplications = () => {
  return useQuery({
    queryKey: ["admin", "applications"],
    queryFn: () => fetcher("/api/admin/applications"),
    staleTime: 2 * 60 * 1000, // 2 minutes (more dynamic data)
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => fetcher("/api/admin/users"),
    staleTime: 10 * 60 * 1000, // 10 minutes (changes less frequently)
  });
};

export const useAnalytics = (timeRange = "30d") => {
  return useQuery({
    queryKey: ["admin", "analytics", timeRange],
    queryFn: () => fetcher(`/api/admin/analytics?range=${timeRange}`),
    staleTime: 5 * 60 * 1000,
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: () => fetcher("/api/admin/dashboard-stats"),
    staleTime: 2 * 60 * 1000,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => fetcher("/api/admin/categories"),
    staleTime: 30 * 60 * 1000, // 30 minutes (rarely changes)
  });
};

// Prefetch hook - call this early to load all data
export const usePrefetchAdminData = () => {
  const queryClient = useQueryClient();

  const prefetchAll = () => {
    // Prefetch all the common admin data
    queryClient.prefetchQuery({
      queryKey: ["admin", "jobs"],
      queryFn: () => fetcher("/api/admin/jobs"),
      staleTime: 5 * 60 * 1000,
    });

    queryClient.prefetchQuery({
      queryKey: ["admin", "applications"],
      queryFn: () => fetcher("/api/admin/applications"),
      staleTime: 2 * 60 * 1000,
    });

    queryClient.prefetchQuery({
      queryKey: ["admin", "users"],
      queryFn: () => fetcher("/api/admin/users"),
      staleTime: 10 * 60 * 1000,
    });

    queryClient.prefetchQuery({
      queryKey: ["admin", "dashboard-stats"],
      queryFn: () => fetcher("/api/admin/dashboard-stats"),
      staleTime: 2 * 60 * 1000,
    });

    queryClient.prefetchQuery({
      queryKey: ["admin", "categories"],
      queryFn: () => fetcher("/api/admin/categories"),
      staleTime: 30 * 60 * 1000,
    });
  };

  return { prefetchAll };
};

// Utility hook to invalidate specific data (useful for mutations)
export const useInvalidateAdminData = () => {
  const queryClient = useQueryClient();

  return {
    invalidateJobs: () => queryClient.invalidateQueries(["admin", "jobs"]),
    invalidateApplications: () =>
      queryClient.invalidateQueries(["admin", "applications"]),
    invalidateUsers: () => queryClient.invalidateQueries(["admin", "users"]),
    invalidateAnalytics: () =>
      queryClient.invalidateQueries(["admin", "analytics"]),
    invalidateDashboardStats: () =>
      queryClient.invalidateQueries(["admin", "dashboard-stats"]),
    invalidateAll: () => queryClient.invalidateQueries(["admin"]),
  };
};
