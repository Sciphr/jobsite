// app/hooks/useAdminData.js - FIXED to prevent unnecessary refetches
import {
  useQuery,
  useQueries,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";

// Generic fetcher function
const fetcher = async (url) => {
  console.log(`🔄 API Call: ${url}`); // Add logging to track actual calls
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch: ${response.status} ${response.statusText}`
    );
  }
  return response.json();
};

// ✅ FIXED: More aggressive caching to prevent refetches
const commonQueryOptions = {
  staleTime: 30 * 60 * 1000, // ✅ 30 minutes (increased from 15)
  gcTime: 2 * 60 * 60 * 1000, // ✅ 2 hours
  refetchOnWindowFocus: false,
  refetchOnMount: false, // ✅ KEY FIX: Never refetch on component mount
  refetchOnReconnect: false, // ✅ Prevent refetch on reconnect
  refetchInterval: false, // ✅ Disable polling
  networkMode: "online",
};

// Individual hooks with optimized cache settings
export const useJobs = () => {
  return useQuery({
    queryKey: ["admin", "jobs"],
    queryFn: () => fetcher("/api/admin/jobs"),
    ...commonQueryOptions,
    staleTime: 20 * 60 * 1000, // 20 minutes for jobs (they change less frequently)
  });
};

export const useApplications = () => {
  return useQuery({
    queryKey: ["admin", "applications"],
    queryFn: () => fetcher("/api/admin/applications"),
    ...commonQueryOptions,
    staleTime: 10 * 60 * 1000, // 10 minutes for applications (more dynamic)
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => fetcher("/api/admin/users"),
    ...commonQueryOptions,
    staleTime: 45 * 60 * 1000, // 45 minutes for users (rarely change)
  });
};

export const useAnalytics = (timeRange = "30d") => {
  return useQuery({
    queryKey: ["admin", "analytics", timeRange],
    queryFn: () => fetcher(`/api/admin/analytics?range=${timeRange}`),
    ...commonQueryOptions,
    staleTime: 15 * 60 * 1000, // 15 minutes for analytics
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: () => fetcher("/api/admin/dashboard-stats"),
    ...commonQueryOptions,
    staleTime: 15 * 60 * 1000, // 15 minutes for dashboard stats
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => fetcher("/api/admin/categories"),
    ...commonQueryOptions,
    staleTime: 60 * 60 * 1000, // 1 hour - categories rarely change
  });
};

export const useJobsSimple = () => {
  return useQuery({
    queryKey: ["admin", "jobs-simple"],
    queryFn: () => fetcher("/api/admin/jobs-simple"),
    ...commonQueryOptions,
    staleTime: 20 * 60 * 1000, // 20 minutes
  });
};

export const useSettings = (category = null) => {
  const queryKey = category
    ? ["admin", "settings", category]
    : ["admin", "settings"];

  const url = category
    ? `/api/admin/settings?category=${category}`
    : "/api/admin/settings";

  return useQuery({
    queryKey,
    queryFn: () => fetcher(url),
    ...commonQueryOptions,
    staleTime: 60 * 60 * 1000, // 1 hour - settings rarely change
  });
};

// Specific item hooks with conditional fetching
export const useJob = (jobId) => {
  return useQuery({
    queryKey: ["admin", "job", jobId],
    queryFn: () => fetcher(`/api/admin/jobs/${jobId}`),
    ...commonQueryOptions,
    enabled: !!jobId, // Only run if jobId exists
    staleTime: 20 * 60 * 1000, // 20 minutes
  });
};

export const useUser = (userId) => {
  return useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => fetcher(`/api/admin/users/${userId}`),
    ...commonQueryOptions,
    enabled: !!userId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useApplication = (applicationId) => {
  return useQuery({
    queryKey: ["admin", "application", applicationId],
    queryFn: () => fetcher(`/api/admin/applications/${applicationId}`),
    ...commonQueryOptions,
    enabled: !!applicationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// ✅ FIXED: Improved prefetch strategy
export const usePrefetchAdminData = () => {
  const queryClient = useQueryClient();

  // ✅ RESTORE FAST NAVIGATION - Replace prefetchAll in useAdminData.js:
  const prefetchAll = async () => {
    console.log("🚀 Starting aggressive prefetch for fast navigation...");

    // Check what's already cached
    const existingJobs = queryClient.getQueryData(["admin", "jobs"]);
    const existingApplications = queryClient.getQueryData([
      "admin",
      "applications",
    ]);
    const existingUsers = queryClient.getQueryData(["admin", "users"]);
    const existingDashboard = queryClient.getQueryData([
      "admin",
      "dashboard-stats",
    ]);
    const existingCategories = queryClient.getQueryData([
      "admin",
      "categories",
    ]);

    console.log("📊 Cache status:", {
      jobs: !!existingJobs,
      applications: !!existingApplications,
      users: !!existingUsers,
      dashboard: !!existingDashboard,
      categories: !!existingCategories,
    });

    const prefetchPromises = [];

    // Always prefetch essential data that's needed everywhere
    if (!existingDashboard) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ["admin", "dashboard-stats"],
          queryFn: () => fetcher("/api/admin/dashboard-stats"),
          staleTime: 15 * 60 * 1000,
        })
      );
    }

    if (!existingCategories) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ["admin", "categories"],
          queryFn: () => fetcher("/api/admin/categories"),
          staleTime: 60 * 60 * 1000,
        })
      );
    }

    // Prefetch main data sets for fast navigation
    if (!existingJobs) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ["admin", "jobs"],
          queryFn: () => fetcher("/api/admin/jobs"),
          staleTime: 20 * 60 * 1000,
        })
      );
    }

    if (!existingApplications) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ["admin", "applications"],
          queryFn: () => fetcher("/api/admin/applications"),
          staleTime: 10 * 60 * 1000,
        })
      );
    }

    // Only prefetch users if we might need them (check session from context if available)
    if (!existingUsers) {
      try {
        // Use the session from next-auth instead of API call
        // This will be available in the hook context
        prefetchPromises.push(
          queryClient.prefetchQuery({
            queryKey: ["admin", "users"],
            queryFn: () => fetcher("/api/admin/users"),
            staleTime: 45 * 60 * 1000,
          })
        );
      } catch (error) {
        console.log("👤 Skipping users prefetch");
      }
    }

    // Prefetch jobs-simple for dropdowns
    if (!queryClient.getQueryData(["admin", "jobs-simple"])) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ["admin", "jobs-simple"],
          queryFn: () => fetcher("/api/admin/jobs-simple"),
          staleTime: 20 * 60 * 1000,
        })
      );
    }

    if (prefetchPromises.length > 0) {
      console.log(
        `🚀 Prefetching ${prefetchPromises.length} data sets for instant navigation`
      );
      try {
        await Promise.allSettled(prefetchPromises);
        console.log("✅ All data prefetched - navigation should be instant!");
      } catch (error) {
        console.warn("⚠️ Some prefetch operations failed:", error);
      }
    } else {
      console.log("✅ All data already cached - navigation is instant!");
    }
  };

  // More targeted prefetch functions
  const prefetchJobs = () => {
    if (!queryClient.getQueryData(["admin", "jobs"])) {
      queryClient.prefetchQuery({
        queryKey: ["admin", "jobs"],
        queryFn: () => fetcher("/api/admin/jobs"),
        staleTime: 20 * 60 * 1000,
      });
    }
  };

  const prefetchApplications = () => {
    if (!queryClient.getQueryData(["admin", "applications"])) {
      queryClient.prefetchQuery({
        queryKey: ["admin", "applications"],
        queryFn: () => fetcher("/api/admin/applications"),
        staleTime: 10 * 60 * 1000,
      });
    }
  };

  const prefetchUsers = () => {
    if (!queryClient.getQueryData(["admin", "users"])) {
      queryClient.prefetchQuery({
        queryKey: ["admin", "users"],
        queryFn: () => fetcher("/api/admin/users"),
        staleTime: 45 * 60 * 1000,
      });
    }
  };

  const prefetchAnalytics = (timeRange = "30d") => {
    if (!queryClient.getQueryData(["admin", "analytics", timeRange])) {
      queryClient.prefetchQuery({
        queryKey: ["admin", "analytics", timeRange],
        queryFn: () => fetcher(`/api/admin/analytics?range=${timeRange}`),
        staleTime: 15 * 60 * 1000,
      });
    }
  };

  return {
    prefetchAll,
    prefetchJobs,
    prefetchApplications,
    prefetchUsers,
    prefetchAnalytics,
  };
};

// ✅ Enhanced cache debugging
export const useAdminDataStatus = () => {
  const queryClient = useQueryClient();
  const jobs = useJobs();
  const applications = useApplications();
  const dashboardStats = useDashboardStats();

  // Debug cache status
  const cacheStatus = {
    jobs: {
      isFetching: jobs.isFetching,
      isLoading: jobs.isLoading,
      dataUpdatedAt: jobs.dataUpdatedAt,
      isCached: !!queryClient.getQueryData(["admin", "jobs"]),
    },
    applications: {
      isFetching: applications.isFetching,
      isLoading: applications.isLoading,
      dataUpdatedAt: applications.dataUpdatedAt,
      isCached: !!queryClient.getQueryData(["admin", "applications"]),
    },
    dashboardStats: {
      isFetching: dashboardStats.isFetching,
      isLoading: dashboardStats.isLoading,
      dataUpdatedAt: dashboardStats.dataUpdatedAt,
      isCached: !!queryClient.getQueryData(["admin", "dashboard-stats"]),
    },
  };

  // Log cache status in development
  if (process.env.NODE_ENV === "development") {
    console.log("📊 Admin Data Cache Status:", cacheStatus);
  }

  return {
    isLoading:
      jobs.isLoading || applications.isLoading || dashboardStats.isLoading,
    isFetching:
      jobs.isFetching || applications.isFetching || dashboardStats.isFetching,
    isError: jobs.isError || applications.isError || dashboardStats.isError,
    errors: [jobs.error, applications.error, dashboardStats.error].filter(
      Boolean
    ),
    cacheStatus,
  };
};

// Rest of the hooks remain the same...
export const useInvalidateAdminData = () => {
  const queryClient = useQueryClient();

  return {
    invalidateJobs: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs-simple"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-stats"] });
    },
    invalidateApplications: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-stats"] });
    },
    invalidateUsers: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-stats"] });
    },
    invalidateAnalytics: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
    },
    invalidateSettings: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    invalidateCategories: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    invalidateDashboardStats: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-stats"] });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    // Invalidate specific items
    invalidateJob: (jobId) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "job", jobId] });
    },
    invalidateUser: (userId) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] });
    },
    invalidateApplication: (applicationId) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "application", applicationId],
      });
    },
  };
};

// Mutation hooks remain the same...
export const useCreateJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobData) => {
      const response = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create job");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs-simple"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-stats"] });
    },
  });
};

export const useUpdateJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, jobData }) => {
      const response = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update job");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Update the specific job in cache
      queryClient.setQueryData(["admin", "job", variables.jobId], data);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs-simple"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-stats"] });
    },
  });
};

export const useDeleteJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId) => {
      const response = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete job");
      }

      return response.json();
    },
    onSuccess: (data, jobId) => {
      // Remove the job from all relevant caches
      queryClient.removeQueries({ queryKey: ["admin", "job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs-simple"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });
    },
  });
};

export const useUpdateApplicationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationId, status, notes }) => {
      const response = await fetch(`/api/admin/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update application");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Update the specific application in cache
      queryClient.setQueryData(
        ["admin", "application", variables.applicationId],
        data
      );

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
    },
  });
};

// Hook for getting cached data without triggering fetch
export const useCachedAdminData = () => {
  const queryClient = useQueryClient();

  return {
    getCachedJobs: () => queryClient.getQueryData(["admin", "jobs"]),
    getCachedApplications: () =>
      queryClient.getQueryData(["admin", "applications"]),
    getCachedUsers: () => queryClient.getQueryData(["admin", "users"]),
    getCachedDashboardStats: () =>
      queryClient.getQueryData(["admin", "dashboard-stats"]),
    getCachedJob: (jobId) => queryClient.getQueryData(["admin", "job", jobId]),
    getCachedUser: (userId) =>
      queryClient.getQueryData(["admin", "user", userId]),
    getCachedApplication: (applicationId) =>
      queryClient.getQueryData(["admin", "application", applicationId]),
  };
};
