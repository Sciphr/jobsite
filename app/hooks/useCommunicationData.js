import { useState, useEffect, useCallback } from "react";

// Hook for email templates
export function useEmailTemplates(filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.type) params.append("type", filters.type);
      if (filters.isActive !== undefined) params.append("isActive", filters.isActive);
      if (filters.search) params.append("search", filters.search);

      const response = await fetch(`/api/admin/communication/templates?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || "Failed to fetch templates");
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching email templates:", err);
    } finally {
      setLoading(false);
    }
  }, [filters.type, filters.isActive, filters.search]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = useCallback(async (templateData) => {
    try {
      const response = await fetch("/api/admin/communication/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateData),
      });
      const result = await response.json();

      if (result.success) {
        await fetchTemplates(); // Refresh data
        return result.data;
      } else {
        throw new Error(result.error || "Failed to create template");
      }
    } catch (err) {
      console.error("Error creating template:", err);
      throw err;
    }
  }, [fetchTemplates]);

  const updateTemplate = useCallback(async (id, templateData) => {
    try {
      const response = await fetch(`/api/admin/communication/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateData),
      });
      const result = await response.json();

      if (result.success) {
        await fetchTemplates(); // Refresh data
        return result.data;
      } else {
        throw new Error(result.error || "Failed to update template");
      }
    } catch (err) {
      console.error("Error updating template:", err);
      throw err;
    }
  }, [fetchTemplates]);

  const deleteTemplate = useCallback(async (id) => {
    try {
      const response = await fetch(`/api/admin/communication/templates/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        await fetchTemplates(); // Refresh data
        return true;
      } else {
        throw new Error(result.error || "Failed to delete template");
      }
    } catch (err) {
      console.error("Error deleting template:", err);
      throw err;
    }
  }, [fetchTemplates]);

  return {
    data,
    loading,
    error,
    refetch: fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}

// Hook for email history
export function useEmailHistory(filters = {}, pagination = { page: 1, limit: 50 }) {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({});
  const [paginationInfo, setPaginationInfo] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());
      
      if (filters.search) params.append("search", filters.search);
      if (filters.status) params.append("status", filters.status);
      if (filters.jobId) params.append("jobId", filters.jobId);
      if (filters.templateId) params.append("templateId", filters.templateId);
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);
      if (filters.sortBy) params.append("sortBy", filters.sortBy);
      if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);

      const response = await fetch(`/api/admin/communication/emails?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setStats(result.stats);
        setPaginationInfo(result.pagination);
      } else {
        throw new Error(result.error || "Failed to fetch email history");
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching email history:", err);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    filters.search,
    filters.status,
    filters.jobId,
    filters.templateId,
    filters.dateFrom,
    filters.dateTo,
    filters.sortBy,
    filters.sortOrder,
  ]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  return {
    data,
    stats,
    pagination: paginationInfo,
    loading,
    error,
    refetch: fetchEmails,
  };
}

// Hook for sending emails
export function useEmailSender() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendEmail = useCallback(async (emailData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/communication/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailData),
      });
      const result = await response.json();

      if (result.success) {
        return result;
      } else {
        throw new Error(result.error || "Failed to send email");
      }
    } catch (err) {
      setError(err.message);
      console.error("Error sending email:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    sendEmail,
    loading,
    error,
  };
}

// Hook for Excel export
export function useEmailExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const exportEmails = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (filters.search) params.append("search", filters.search);
      if (filters.status) params.append("status", filters.status);
      if (filters.jobId) params.append("jobId", filters.jobId);
      if (filters.templateId) params.append("templateId", filters.templateId);
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);
      if (filters.sortBy) params.append("sortBy", filters.sortBy);
      if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);

      const response = await fetch(`/api/admin/communication/export?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to export emails");
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get("content-disposition");
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : `email-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return true;
    } catch (err) {
      setError(err.message);
      console.error("Error exporting emails:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    exportEmails,
    loading,
    error,
  };
}

// Enhanced hook for audit-based email history
export function useEmailAuditHistory(filters = {}, pagination = { page: 1, limit: 50 }) {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({});
  const [paginationInfo, setPaginationInfo] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAuditEmails = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());
      
      if (filters.search) params.append("search", filters.search);
      if (filters.status) params.append("status", filters.status);
      if (filters.jobId) params.append("jobId", filters.jobId);
      if (filters.templateId) params.append("templateId", filters.templateId);
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);
      if (filters.sortBy) params.append("sortBy", filters.sortBy);
      if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);
      if (filters.actorId) params.append("actorId", filters.actorId);
      if (filters.severity) params.append("severity", filters.severity);
      if (filters.includeFailures !== undefined) params.append("includeFailures", filters.includeFailures);

      const response = await fetch(`/api/admin/communication/emails/audit?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setStats(result.stats);
        setPaginationInfo(result.pagination);
      } else {
        throw new Error(result.error || "Failed to fetch email audit history");
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching email audit history:", err);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    filters.search,
    filters.status,
    filters.jobId,
    filters.templateId,
    filters.dateFrom,
    filters.dateTo,
    filters.sortBy,
    filters.sortOrder,
    filters.actorId,
    filters.severity,
    filters.includeFailures,
  ]);

  useEffect(() => {
    fetchAuditEmails();
  }, [fetchAuditEmails]);

  return {
    data,
    stats,
    pagination: paginationInfo,
    loading,
    error,
    refetch: fetchAuditEmails,
  };
}