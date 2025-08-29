// app/hooks/usePublicJobsData.js
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

const fetcher = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

// Common query options for public data with aggressive caching
const publicQueryOptions = {
  staleTime: 15 * 60 * 1000, // 15 minutes - data stays fresh
  gcTime: 60 * 60 * 1000, // 1 hour - keep in cache
  refetchOnWindowFocus: false, // Don't refetch when window gains focus
  refetchOnMount: false, // Don't refetch on component mount if data exists
  refetchOnReconnect: true, // Do refetch when connection is restored
  refetchInterval: false, // No periodic refetching
  retry: 1, // Only retry once on failure
  networkMode: "online",
};

// Jobs list with filter options - main jobs page data
export const usePublicJobs = () => {
  return useQuery({
    queryKey: ["public", "jobs"],
    queryFn: () => fetcher("/api/jobs"),
    ...publicQueryOptions,
    staleTime: 10 * 60 * 1000, // 10 minutes - jobs can change more frequently
  });
};

// Individual job hook with cache-first approach
export const usePublicJob = (slug, options = {}) => {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ["public", "job", slug],
    queryFn: async () => {
      // First try to find job in jobs list cache
      const jobsData = queryClient.getQueryData(["public", "jobs"]);
      if (jobsData?.jobs) {
        const cachedJob = jobsData.jobs.find(job => job.slug === slug);
        if (cachedJob) {
          console.log("🎯 Using cached job data for:", slug);
          return cachedJob;
        }
      }
      
      // If not in cache, fetch individual job
      console.log("🔄 Fetching individual job:", slug);
      return fetcher(`/api/jobs/${slug}`);
    },
    ...publicQueryOptions,
    enabled: !!slug,
    staleTime: 20 * 60 * 1000, // 20 minutes - individual jobs change less
    ...options, // Allow overriding options (for SSR data)
  });
};

// User-specific job data hooks (only for authenticated users)
export const useSavedJobStatus = (jobId) => {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: ["user", "saved-jobs", jobId],
    queryFn: () => fetcher(`/api/saved-jobs?jobId=${jobId}`),
    ...publicQueryOptions,
    enabled: !!session?.user?.id && !!jobId,
    staleTime: 30 * 60 * 1000, // 30 minutes - saved status doesn't change often
  });
};

export const useApplicationStatus = (jobId) => {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: ["user", "application-status", jobId],
    queryFn: () => fetcher(`/api/applications/check?jobId=${jobId}`),
    ...publicQueryOptions,
    enabled: !!session?.user?.id && !!jobId,
    staleTime: 5 * 60 * 1000, // 5 minutes - application status can change
  });
};

// Prefetch hook for job details
export const usePrefetchJob = () => {
  const queryClient = useQueryClient();
  
  return (slug) => {
    queryClient.prefetchQuery({
      queryKey: ["public", "job", slug],
      queryFn: () => {
        // Check cache first, only fetch if not available
        const jobsData = queryClient.getQueryData(["public", "jobs"]);
        if (jobsData?.jobs) {
          const cachedJob = jobsData.jobs.find(job => job.slug === slug);
          if (cachedJob) {
            return Promise.resolve(cachedJob);
          }
        }
        return fetcher(`/api/jobs/${slug}`);
      },
      ...publicQueryOptions,
      staleTime: 20 * 60 * 1000,
    });
  };
};

// Optimistic save/unsave job mutation
export const useSaveJobMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ jobId, action }) => {
      const response = await fetch("/api/saved-jobs", {
        method: action === "save" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update saved job");
      }
      return response.json();
    },
    
    // Optimistic update for immediate UI feedback
    onMutate: async ({ jobId, action }) => {
      await queryClient.cancelQueries({ queryKey: ["user", "saved-jobs", jobId] });
      
      const previousData = queryClient.getQueryData(["user", "saved-jobs", jobId]);
      
      queryClient.setQueryData(["user", "saved-jobs", jobId], {
        isSaved: action === "save",
      });
      
      return { previousData };
    },
    
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["user", "saved-jobs", variables.jobId],
          context.previousData
        );
      }
    },
    
    onSettled: (data, error, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: ["user", "saved-jobs", variables.jobId] 
      });
    },
  });
};

// Get all saved jobs for user
export const useSavedJobs = () => {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: ["user", "saved-jobs"],
    queryFn: () => fetcher("/api/saved-jobs"),
    ...publicQueryOptions,
    enabled: !!session?.user?.id,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Get user's application history
export const useUserApplications = () => {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: ["user", "applications"],
    queryFn: () => fetcher("/api/applications/user"),
    ...publicQueryOptions,
    enabled: !!session?.user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - applications can change
  });
};