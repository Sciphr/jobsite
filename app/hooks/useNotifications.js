// app/hooks/useNotifications.js
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const QUERY_KEYS = {
  notificationPreferences: ['notifications', 'preferences'],
  jobAlerts: ['notifications', 'jobAlerts'],
  departments: ['jobs', 'departments'],
};

// Notification Preferences Hook
export function useNotificationPreferences() {
  return useQuery({
    queryKey: QUERY_KEYS.notificationPreferences,
    queryFn: async () => {
      const response = await fetch('/api/user/notifications/preferences');
      if (!response.ok) {
        throw new Error('Failed to fetch notification preferences');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Update Notification Preferences Hook with Optimistic Updates
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates) => {
      const response = await fetch('/api/user/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error('Failed to update notification preferences');
      }
      return response.json();
    },
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.notificationPreferences });

      // Snapshot previous value
      const previousPreferences = queryClient.getQueryData(QUERY_KEYS.notificationPreferences);

      // Optimistically update with new data
      if (previousPreferences) {
        queryClient.setQueryData(QUERY_KEYS.notificationPreferences, {
          ...previousPreferences,
          ...updates
        });
      }

      return { previousPreferences };
    },
    onError: (err, updates, context) => {
      // Rollback on error
      if (context?.previousPreferences) {
        queryClient.setQueryData(QUERY_KEYS.notificationPreferences, context.previousPreferences);
      }
    },
    onSuccess: (data) => {
      // Update cache with server response
      queryClient.setQueryData(QUERY_KEYS.notificationPreferences, data);
    },
    onSettled: () => {
      // Always refetch after mutation settles
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notificationPreferences });
    },
  });
}

// Job Alerts Hook
export function useJobAlerts() {
  return useQuery({
    queryKey: QUERY_KEYS.jobAlerts,
    queryFn: async () => {
      const response = await fetch('/api/user/notifications/job-alerts');
      if (!response.ok) {
        throw new Error('Failed to fetch job alerts');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Add Job Alert Hook with Optimistic Updates
export function useAddJobAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertData) => {
      const response = await fetch('/api/user/notifications/job-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add job alert');
      }
      return response.json();
    },
    onMutate: async (alertData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.jobAlerts });

      // Snapshot previous value
      const previousAlerts = queryClient.getQueryData(QUERY_KEYS.jobAlerts);

      // Create optimistic alert
      const optimisticAlert = {
        id: `temp-${Date.now()}`,
        department: alertData.department || null,
        keywords: alertData.keywords || null,
        createdAt: new Date().toISOString(),
        isActive: true
      };

      // Optimistically add to existing alerts
      if (previousAlerts?.alerts) {
        queryClient.setQueryData(QUERY_KEYS.jobAlerts, {
          alerts: [...previousAlerts.alerts, optimisticAlert]
        });
      }

      return { previousAlerts, optimisticAlert };
    },
    onError: (err, alertData, context) => {
      // Rollback on error
      if (context?.previousAlerts) {
        queryClient.setQueryData(QUERY_KEYS.jobAlerts, context.previousAlerts);
      }
    },
    onSuccess: (data, variables, context) => {
      // Replace optimistic update with real data
      const previousAlerts = queryClient.getQueryData(QUERY_KEYS.jobAlerts);
      if (previousAlerts?.alerts && context?.optimisticAlert) {
        const updatedAlerts = previousAlerts.alerts.map(alert => 
          alert.id === context.optimisticAlert.id ? data.alert : alert
        );
        queryClient.setQueryData(QUERY_KEYS.jobAlerts, { alerts: updatedAlerts });
      }
    },
    onSettled: () => {
      // Always refetch after mutation settles
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobAlerts });
    },
  });
}

// Delete Job Alert Hook with Optimistic Updates
export function useDeleteJobAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId) => {
      const response = await fetch(`/api/user/notifications/job-alerts/${alertId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete job alert');
      }
      return response.json();
    },
    onMutate: async (alertId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.jobAlerts });

      // Snapshot previous value
      const previousAlerts = queryClient.getQueryData(QUERY_KEYS.jobAlerts);

      // Optimistically remove the alert
      if (previousAlerts?.alerts) {
        const filteredAlerts = previousAlerts.alerts.filter(alert => alert.id !== alertId);
        queryClient.setQueryData(QUERY_KEYS.jobAlerts, { alerts: filteredAlerts });
      }

      return { previousAlerts };
    },
    onError: (err, alertId, context) => {
      // Rollback on error
      if (context?.previousAlerts) {
        queryClient.setQueryData(QUERY_KEYS.jobAlerts, context.previousAlerts);
      }
    },
    onSettled: () => {
      // Always refetch after mutation settles
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobAlerts });
    },
  });
}

// Departments Hook (for dropdown)
export function useDepartments() {
  return useQuery({
    queryKey: QUERY_KEYS.departments,
    queryFn: async () => {
      const response = await fetch('/api/jobs/departments');
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (departments don't change often)
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}