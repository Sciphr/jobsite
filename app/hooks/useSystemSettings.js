import { useQuery } from "@tanstack/react-query";

const fetcher = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

export const useSystemSettings = () => {
  return useQuery({
    queryKey: ["system", "settings"],
    queryFn: () => fetcher("/api/admin/settings"),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
};