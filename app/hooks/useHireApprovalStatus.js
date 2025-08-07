// app/hooks/useHireApprovalStatus.js
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch hire approval status for multiple applications
 */
export function useHireApprovalStatus(applicationIds) {
  const [hireApprovalStatus, setHireApprovalStatus] = useState({});
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['hire-approval-status', applicationIds],
    queryFn: async () => {
      if (!applicationIds || applicationIds.length === 0) {
        return { hireApprovalStatus: {} };
      }

      const response = await fetch('/api/admin/applications/hire-approval-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ applicationIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch hire approval status');
      }

      return response.json();
    },
    enabled: Boolean(applicationIds && applicationIds.length > 0),
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  useEffect(() => {
    if (data?.hireApprovalStatus) {
      setHireApprovalStatus(data.hireApprovalStatus);
    }
  }, [data]);

  return {
    hireApprovalStatus,
    isLoading,
    error,
  };
}

/**
 * Get hire approval status for a specific application
 */
export function getHireApprovalForApplication(hireApprovalStatus, applicationId) {
  return hireApprovalStatus[applicationId] || {
    hasPendingRequest: false,
    pendingRequest: null,
    requestedBy: null,
    requestedAt: null,
  };
}