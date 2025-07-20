import { useState, useEffect, useCallback } from "react";

// Hook for managing application notes
export function useApplicationNotes(applicationId) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotes = useCallback(async () => {
    if (!applicationId) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/notes`);
      const result = await response.json();

      if (result.success) {
        setNotes(result.data);
      } else {
        throw new Error(result.error || "Failed to fetch notes");
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching application notes:", err);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  const addNote = useCallback(async (content, type = "note", metadata = null) => {
    if (!applicationId || !content?.trim()) {
      throw new Error("Application ID and note content are required");
    }

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type, metadata }),
      });

      const result = await response.json();

      if (result.success) {
        // Add the new note to the top of the list
        setNotes((prev) => [result.data, ...prev]);
        return result.data;
      } else {
        throw new Error(result.error || "Failed to add note");
      }
    } catch (err) {
      console.error("Error adding note:", err);
      throw err;
    }
  }, [applicationId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return {
    notes,
    loading,
    error,
    addNote,
    refetch: fetchNotes,
  };
}

// Hook for fetching application audit logs
export function useApplicationAuditLogs(applicationId, options = {}) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [applicationInfo, setApplicationInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { limit = 50, includeSystem = true } = options;

  const fetchAuditLogs = useCallback(async () => {
    if (!applicationId) return;
    
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (limit) params.append("limit", limit.toString());
      if (includeSystem !== undefined) params.append("includeSystem", includeSystem.toString());

      const response = await fetch(`/api/admin/applications/${applicationId}/audit?${params}`);
      const result = await response.json();

      if (result.success) {
        setAuditLogs(result.data);
        setApplicationInfo(result.application);
      } else {
        throw new Error(result.error || "Failed to fetch audit logs");
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching application audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [applicationId, limit, includeSystem]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  return {
    auditLogs,
    applicationInfo,
    loading,
    error,
    refetch: fetchAuditLogs,
  };
}

// Combined hook for complete timeline data (notes + audit logs)
export function useApplicationTimeline(applicationId, options = {}) {
  const { notes, loading: notesLoading, error: notesError, addNote, refetch: refetchNotes } = useApplicationNotes(applicationId);
  const { auditLogs, applicationInfo, loading: auditLoading, error: auditError, refetch: refetchAudit } = useApplicationAuditLogs(applicationId, options);

  // Combine and sort timeline items
  const timelineItems = [...notes, ...auditLogs].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  const loading = notesLoading || auditLoading;
  const error = notesError || auditError;

  const refetch = useCallback(async () => {
    await Promise.all([refetchNotes(), refetchAudit()]);
  }, [refetchNotes, refetchAudit]);

  return {
    timelineItems,
    notes,
    auditLogs,
    applicationInfo,
    loading,
    error,
    addNote,
    refetch,
  };
}