// app/hooks/useAdminData.js - Complete implementation
import {
  useQuery,
  useQueries,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";

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
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useApplications = () => {
  return useQuery({
    queryKey: ["admin", "applications"],
    queryFn: () => fetcher("/api/admin/applications"),
    staleTime: 2 * 60 * 1000, // 2 minutes (more dynamic data)
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => fetcher("/api/admin/users"),
    staleTime: 10 * 60 * 1000, // 10 minutes (changes less frequently)
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

export const useAnalytics = (timeRange = "30d") => {
  return useQuery({
    queryKey: ["admin", "analytics", timeRange],
    queryFn: () => fetcher(`/api/admin/analytics?range=${timeRange}`),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: () => fetcher("/api/admin/dashboard-stats"),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => fetcher("/api/admin/categories"),
    staleTime: 30 * 60 * 1000, // 30 minutes (rarely changes)
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });
};

export const useJobsSimple = () => {
  return useQuery({
    queryKey: ["admin", "jobs-simple"],
    queryFn: () => fetcher("/api/admin/jobs-simple"),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
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
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

// Specific job hook
export const useJob = (jobId) => {
  return useQuery({
    queryKey: ["admin", "job", jobId],
    queryFn: () => fetcher(`/api/admin/jobs/${jobId}`),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!jobId, // Only run if jobId exists
  });
};

// Specific user hook
export const useUser = (userId) => {
  return useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => fetcher(`/api/admin/users/${userId}`),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!userId,
  });
};

// Specific application hook
export const useApplication = (applicationId) => {
  return useQuery({
    queryKey: ["admin", "application", applicationId],
    queryFn: () => fetcher(`/api/admin/applications/${applicationId}`),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!applicationId,
  });
};

// Combined data hook for dashboard
export const useDashboardData = () => {
  return useQueries({
    queries: [
      {
        queryKey: ["admin", "dashboard-stats"],
        queryFn: () => fetcher("/api/admin/dashboard-stats"),
        staleTime: 2 * 60 * 1000,
      },
      {
        queryKey: ["admin", "applications"],
        queryFn: () => fetcher("/api/admin/applications"),
        staleTime: 2 * 60 * 1000,
      },
      {
        queryKey: ["admin", "jobs"],
        queryFn: () => fetcher("/api/admin/jobs"),
        staleTime: 5 * 60 * 1000,
      },
    ],
  });
};

// Prefetch hook - call this early to load all data
export const usePrefetchAdminData = () => {
  const queryClient = useQueryClient();

  const prefetchAll = async () => {
    const prefetchPromises = [
      // Core admin data
      queryClient.prefetchQuery({
        queryKey: ["admin", "dashboard-stats"],
        queryFn: () => fetcher("/api/admin/dashboard-stats"),
        staleTime: 2 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ["admin", "jobs"],
        queryFn: () => fetcher("/api/admin/jobs"),
        staleTime: 5 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ["admin", "applications"],
        queryFn: () => fetcher("/api/admin/applications"),
        staleTime: 2 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ["admin", "categories"],
        queryFn: () => fetcher("/api/admin/categories"),
        staleTime: 30 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ["admin", "jobs-simple"],
        queryFn: () => fetcher("/api/admin/jobs-simple"),
        staleTime: 5 * 60 * 1000,
      }),
    ];

    // Only prefetch users if we might need them (to avoid unnecessary requests)
    try {
      // Check if user has privilege to see users
      const userResponse = await fetch("/api/profile");
      if (userResponse.ok) {
        const profile = await userResponse.json();
        if (profile.privilegeLevel >= 3) {
          prefetchPromises.push(
            queryClient.prefetchQuery({
              queryKey: ["admin", "users"],
              queryFn: () => fetcher("/api/admin/users"),
              staleTime: 10 * 60 * 1000,
            })
          );
        }
      }
    } catch (error) {
      console.warn("Could not check user privileges for prefetching");
    }

    // Execute all prefetch operations
    try {
      await Promise.allSettled(prefetchPromises);
      console.log("✅ Successfully prefetched admin data");
    } catch (error) {
      console.warn("⚠️ Some prefetch operations failed:", error);
    }
  };

  const prefetchJobs = () => {
    queryClient.prefetchQuery({
      queryKey: ["admin", "jobs"],
      queryFn: () => fetcher("/api/admin/jobs"),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchApplications = () => {
    queryClient.prefetchQuery({
      queryKey: ["admin", "applications"],
      queryFn: () => fetcher("/api/admin/applications"),
      staleTime: 2 * 60 * 1000,
    });
  };

  const prefetchUsers = () => {
    queryClient.prefetchQuery({
      queryKey: ["admin", "users"],
      queryFn: () => fetcher("/api/admin/users"),
      staleTime: 10 * 60 * 1000,
    });
  };

  const prefetchAnalytics = (timeRange = "30d") => {
    queryClient.prefetchQuery({
      queryKey: ["admin", "analytics", timeRange],
      queryFn: () => fetcher(`/api/admin/analytics?range=${timeRange}`),
      staleTime: 5 * 60 * 1000,
    });
  };

  return {
    prefetchAll,
    prefetchJobs,
    prefetchApplications,
    prefetchUsers,
    prefetchAnalytics,
  };
};

// Utility hook to invalidate specific data (useful for mutations)
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

// Mutation hooks for common admin operations
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

// Hook to check if data is loading across multiple queries
export const useAdminDataStatus = () => {
  const jobs = useJobs();
  const applications = useApplications();
  const dashboardStats = useDashboardStats();

  return {
    isLoading:
      jobs.isLoading || applications.isLoading || dashboardStats.isLoading,
    isError: jobs.isError || applications.isError || dashboardStats.isError,
    errors: [jobs.error, applications.error, dashboardStats.error].filter(
      Boolean
    ),
  };
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
