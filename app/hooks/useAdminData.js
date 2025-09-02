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
  
  const data = await response.json();
  
  if (!response.ok) {
    // For users endpoint, return empty array on error to prevent filter issues
    if (url.includes('/admin/users') && data.users) {
      return data.users;
    }
    // For applications endpoint, return empty array on error
    if (url.includes('/admin/applications') && data.applications) {
      return data.applications;
    }
    // For jobs endpoint, return empty array on error  
    if (url.includes('/admin/jobs') && data.jobs) {
      return data.jobs;
    }
    
    throw new Error(
      data.error || data.message || `Failed to fetch: ${response.status} ${response.statusText}`
    );
  }
  
  return data;
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

export const useApplications = (includeArchived = false) => {
  const queryKey = includeArchived 
    ? ["admin", "applications", "includeArchived"] 
    : ["admin", "applications"];
    
  const url = includeArchived 
    ? "/api/admin/applications?includeArchived=true"
    : "/api/admin/applications";

  return useQuery({
    queryKey,
    queryFn: () => fetcher(url),
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
    // Enable background refetching to keep current data visible
    refetchOnMount: true,
    keepPreviousData: true, // Keep previous data while fetching new data
  });
};

export const useGoogleAnalytics = (timeRange = "30d") => {
  return useQuery({
    queryKey: ["admin", "google-analytics", timeRange],
    queryFn: () => fetcher(`/api/admin/analytics/google?range=${timeRange}`),
    ...commonQueryOptions,
    staleTime: 15 * 60 * 1000, // 15 minutes for Google Analytics
    refetchOnMount: true,
    keepPreviousData: true,
    retry: (failureCount, error) => {
      // Don't retry on credential errors
      if (error?.message?.includes('credentials') || error?.message?.includes('not configured')) {
        return false;
      }
      return failureCount < 2; // Retry up to 2 times for other errors
    },
  });
};

export const useDashboardStats = (options = {}) => {
  return useQuery({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: () => fetcher("/api/admin/dashboard-stats"),
    ...commonQueryOptions,
    staleTime: 15 * 60 * 1000, // 15 minutes for dashboard stats
    ...options, // Allow overriding with enabled, etc.
  });
};

export const useSystemStatus = (options = {}) => {
  return useQuery({
    queryKey: ["admin", "system-status"],
    queryFn: () => fetcher("/api/admin/system-status"),
    ...commonQueryOptions,
    staleTime: 5 * 60 * 1000, // 5 minutes for system status
    ...options, // Allow overriding with enabled, etc.
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

export const useAuditLogs = (page = 1, limit = 20, filters = {}) => {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...filters,
  });

  return useQuery({
    queryKey: ["admin", "audit-logs", page, limit, filters],
    queryFn: () => fetcher(`/api/admin/audit-logs?${queryParams}`),
    ...commonQueryOptions,
    staleTime: 5 * 60 * 1000, // 5 minutes - logs are frequently updated
  });
};

// Archive/Unarchive applications
export const useArchiveApplications = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ applicationIds, archive, reason }) => {
      const response = await fetch("/api/admin/applications/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationIds, archive, reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Archive operation failed");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate applications queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });
    },
  });
};

// Auto-archive rejected applications
export const useAutoArchive = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/applications/auto-archive", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Auto-archive failed");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate applications queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });
    },
  });
};

// Preview what would be auto-archived
export const useAutoArchivePreview = () => {
  return useQuery({
    queryKey: ["admin", "auto-archive-preview"],
    queryFn: () => fetcher("/api/admin/applications/auto-archive"),
    ...commonQueryOptions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Auto-progress applications from Applied to Reviewing
export const useAutoProgress = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/applications/auto-progress", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Auto-progress failed");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate applications queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });
    },
  });
};

// Preview what would be auto-progressed
export const useAutoProgressPreview = () => {
  return useQuery({
    queryKey: ["admin", "auto-progress-preview"],
    queryFn: () => fetcher("/api/admin/applications/auto-progress"),
    ...commonQueryOptions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useRoles = () => {
  return useQuery({
    queryKey: ["admin", "roles"],
    queryFn: async () => {
      const response = await fetcher("/api/roles");
      return response.roles; // Extract roles array from API response
    },
    ...commonQueryOptions,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useWeeklyDigestSettings = () => {
  return useQuery({
    queryKey: ["admin", "weekly-digest", "settings"],
    queryFn: () => fetcher("/api/admin/weekly-digest/settings"),
    ...commonQueryOptions,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useWeeklyDigestRecent = () => {
  return useQuery({
    queryKey: ["admin", "weekly-digest", "recent"],
    queryFn: () => fetcher("/api/admin/weekly-digest/recent"),
    ...commonQueryOptions,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useStaleApplications = (type = 'full') => {
  const queryKey = type === 'full' 
    ? ["admin", "stale-applications"]
    : ["admin", "stale-applications", type];
    
  const url = type === 'full'
    ? "/api/admin/stale-applications"
    : `/api/admin/stale-applications?type=${type}`;

  return useQuery({
    queryKey,
    queryFn: () => fetcher(url),
    ...commonQueryOptions,
    staleTime: 5 * 60 * 1000, // 5 minutes - stale data changes frequently
    refetchInterval: type === 'count' ? 5 * 60 * 1000 : false, // Auto-refresh count every 5 minutes
  });
};

export const useHireApprovalRequests = (type = 'pending') => {
  const queryKey = type === 'pending'
    ? ["admin", "hire-approvals"]
    : ["admin", "hire-approvals", type];
    
  const url = type === 'pending'
    ? "/api/admin/hire-approvals"
    : `/api/admin/hire-approvals?type=${type}`;

  return useQuery({
    queryKey,
    queryFn: () => fetcher(url),
    ...commonQueryOptions,
    staleTime: 2 * 60 * 1000, // 2 minutes - approval requests are time-sensitive
    refetchInterval: type === 'count' ? 2 * 60 * 1000 : false, // Auto-refresh count every 2 minutes
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

  // ✅ SAFE PREFETCHING: Only prefetch if not already cached or loading
  const prefetchAll = async () => {
    console.log("🚀 Safe prefetch starting...");
    
    // Check if already prefetching to prevent loops
    if (queryClient.isFetching({ queryKey: ["admin"] }) > 2) {
      console.log("🚫 Already prefetching, skipping to prevent loop");
      return;
    }

    // Check what's already cached
    const existingJobs = queryClient.getQueryData(["admin", "jobs"]);
    const existingApplications = queryClient.getQueryData(["admin", "applications"]);
    const existingUsers = queryClient.getQueryData(["admin", "users"]);
    const existingRoles = queryClient.getQueryData(["admin", "roles"]);
    const existingDashboard = queryClient.getQueryData([
      "admin",
      "dashboard-stats",
    ]);
    const existingCategories = queryClient.getQueryData([
      "admin",
      "categories",
    ]);
    const existingAnalytics = queryClient.getQueryData(["admin", "analytics", "30d"]);
    const existingSettings = queryClient.getQueryData(["admin", "settings"]);
    const existingAuditLogs = queryClient.getQueryData(["admin", "audit-logs"]);
    const existingSystemStatus = queryClient.getQueryData(["admin", "system-status"]);
    const existingWeeklyDigestSettings = queryClient.getQueryData(["admin", "weekly-digest", "settings"]);

    console.log("📊 Cache status:", {
      jobs: !!existingJobs,
      applications: !!existingApplications,
      users: !!existingUsers,
      dashboard: !!existingDashboard,
      categories: !!existingCategories,
      analytics: !!existingAnalytics,
      settings: !!existingSettings,
      auditLogs: !!existingAuditLogs,
      roles: !!existingRoles,
      systemStatus: !!existingSystemStatus,
      weeklyDigestSettings: !!existingWeeklyDigestSettings,
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

    // Prefetch analytics data (default 30d)
    if (!existingAnalytics) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ["admin", "analytics", "30d"],
          queryFn: () => fetcher("/api/admin/analytics?range=30d"),
          staleTime: 15 * 60 * 1000,
        })
      );
    }

    // Prefetch settings
    if (!existingSettings) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ["admin", "settings"],
          queryFn: () => fetcher("/api/admin/settings"),
          staleTime: 60 * 60 * 1000, // 1 hour - settings rarely change
        })
      );
    }

    // Prefetch audit logs (first page)
    if (!existingAuditLogs) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ["admin", "audit-logs"],
          queryFn: () => fetcher("/api/admin/audit-logs?page=1&limit=20"),
          staleTime: 5 * 60 * 1000, // 5 minutes - logs are frequently updated
        })
      );
    }

    // Prefetch roles
    if (!existingRoles) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ["admin", "roles"],
          queryFn: async () => {
            const response = await fetcher("/api/roles");
            return response.roles; // Extract roles array from API response
          },
          staleTime: 30 * 60 * 1000, // 30 minutes
        })
      );
    }

    // Prefetch system status
    if (!existingSystemStatus) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ["admin", "system-status"],
          queryFn: () => fetcher("/api/admin/system-status"),
          staleTime: 2 * 60 * 1000, // 2 minutes - system status changes frequently
        })
      );
    }

    // Prefetch weekly digest settings
    if (!existingWeeklyDigestSettings) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ["admin", "weekly-digest", "settings"],
          queryFn: () => fetcher("/api/admin/weekly-digest/settings"),
          staleTime: 30 * 60 * 1000, // 30 minutes
        })
      );
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
    invalidateAuditLogs: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
    invalidateRoles: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
    },
    invalidateWeeklyDigest: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "weekly-digest"] });
    },
    invalidateSystemStatus: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "system-status"] });
    },
    invalidateStaleApplications: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "stale-applications"] });
    },
    invalidateHireApprovalRequests: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "hire-approvals"] });
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
    onMutate: async ({ applicationId, status, notes }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["admin", "applications"] });
      
      // Snapshot the previous value
      const previousApplications = queryClient.getQueryData(["admin", "applications"]);
      
      // Optimistically update the cache
      queryClient.setQueryData(["admin", "applications"], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((app) =>
          app.id === applicationId ? { ...app, status, notes: notes || app.notes } : app
        );
      });

      // Also update individual application cache if it exists
      queryClient.setQueryData(
        ["admin", "application", applicationId],
        (oldData) => oldData ? { ...oldData, status, notes: notes || oldData.notes } : oldData
      );
      
      return { previousApplications };
    },
    onError: (err, variables, context) => {
      // Revert the optimistic update on error
      if (context?.previousApplications) {
        queryClient.setQueryData(["admin", "applications"], context.previousApplications);
      }
    },
    onSettled: () => {
      // Always refetch dashboard stats and stale applications to keep them in sync
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stale-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "hire-approvals"] });
    },
  });
};

export const useDeleteApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationId) => {
      const response = await fetch(`/api/admin/applications/${applicationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete application");
      }

      return response.json();
    },
    onMutate: async (applicationId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["admin", "applications"] });
      
      // Snapshot the previous value
      const previousApplications = queryClient.getQueryData(["admin", "applications"]);
      
      // Optimistically remove from cache
      queryClient.setQueryData(["admin", "applications"], (oldData) => {
        if (!oldData) return oldData;
        return oldData.filter((app) => app.id !== applicationId);
      });

      // Remove individual application cache
      queryClient.removeQueries({ queryKey: ["admin", "application", applicationId] });
      
      return { previousApplications };
    },
    onError: (err, applicationId, context) => {
      // Revert the optimistic update on error
      if (context?.previousApplications) {
        queryClient.setQueryData(["admin", "applications"], context.previousApplications);
      }
    },
    onSettled: () => {
      // Always refetch dashboard stats and stale applications to keep them in sync
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stale-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "hire-approvals"] });
    },
  });
};

// ✅ NEW: User mutation hooks
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, userData }) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update user");
      }

      return response.json();
    },
    onMutate: async ({ userId, userData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["admin", "users"] });
      
      // Snapshot the previous value
      const previousUsers = queryClient.getQueryData(["admin", "users"]);
      
      // Optimistically update the users list cache
      queryClient.setQueryData(["admin", "users"], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((user) =>
          user.id === userId ? { ...user, ...userData } : user
        );
      });

      // Also update individual user cache if it exists
      queryClient.setQueryData(
        ["admin", "user", userId],
        (oldData) => oldData ? { ...oldData, ...userData } : oldData
      );
      
      return { previousUsers };
    },
    onError: (err, variables, context) => {
      // Revert the optimistic update on error
      if (context?.previousUsers) {
        queryClient.setQueryData(["admin", "users"], context.previousUsers);
      }
    },
    onSettled: () => {
      // Always refetch dashboard stats and stale applications to keep them in sync
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stale-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "hire-approvals"] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete user");
      }

      return response.json();
    },
    onMutate: async (userId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["admin", "users"] });
      
      // Snapshot the previous value
      const previousUsers = queryClient.getQueryData(["admin", "users"]);
      
      // Optimistically remove the user from cache
      queryClient.setQueryData(["admin", "users"], (oldData) => {
        if (!oldData) return oldData;
        return oldData.filter((user) => user.id !== userId);
      });

      // Remove individual user cache
      queryClient.removeQueries({ queryKey: ["admin", "user", userId] });
      
      return { previousUsers };
    },
    onError: (err, userId, context) => {
      // Revert the optimistic update on error
      if (context?.previousUsers) {
        queryClient.setQueryData(["admin", "users"], context.previousUsers);
      }
    },
    onSettled: () => {
      // Always refetch dashboard stats and stale applications to keep them in sync
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stale-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "hire-approvals"] });
    },
  });
};

export const useDeleteInterview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (interviewId) => {
      const response = await fetch(`/api/admin/interviews/${interviewId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete interview");
      }

      return response.json();
    },
    onMutate: async (interviewId) => {
      // Cancel any outgoing refetches for interviews
      await queryClient.cancelQueries({ queryKey: ["admin", "interviews"] });
      
      // Snapshot the previous values
      const previousInterviewsData = queryClient.getQueryData(["admin", "interviews"]);
      
      // Optimistically remove the interview from cache
      queryClient.setQueryData(["admin", "interviews"], (oldData) => {
        if (!oldData?.interviews) return oldData;
        return {
          ...oldData,
          interviews: oldData.interviews.filter((interview) => interview.id !== interviewId),
          summary: {
            ...oldData.summary,
            total: Math.max(0, (oldData.summary?.total || 0) - 1)
          }
        };
      });
      
      return { previousInterviewsData };
    },
    onError: (err, interviewId, context) => {
      // Revert the optimistic update on error
      if (context?.previousInterviewsData) {
        queryClient.setQueryData(["admin", "interviews"], context.previousInterviewsData);
      }
    },
    onSettled: () => {
      // Invalidate related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["admin", "interviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-stats"] });
    },
  });
};

// Hire Approval Mutation Hooks
export const useProcessHireApproval = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, requestId, notes, changeApplicationStatus }) => {
      const response = await fetch("/api/admin/hire-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, requestId, notes, changeApplicationStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to process hire approval");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["admin", "hire-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stale-applications"] });
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
