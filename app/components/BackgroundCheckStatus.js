// app/components/BackgroundCheckStatus.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Calendar,
  Package,
  Eye,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function BackgroundCheckStatus({ applicationId, onRefresh }) {
  const router = useRouter();
  const [backgroundCheck, setBackgroundCheck] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [certnEnabled, setCertnEnabled] = useState(false);

  useEffect(() => {
    checkCertnStatus();
    loadBackgroundCheck();
  }, [applicationId]);

  const checkCertnStatus = async () => {
    try {
      const response = await fetch("/api/admin/integrations/certn/status");
      if (response.ok) {
        const data = await response.json();
        setCertnEnabled(data.connected);
      }
    } catch (error) {
      console.error("Error checking CERTN status:", error);
    }
  };

  const loadBackgroundCheck = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/background-checks?applicationId=${applicationId}`);
      if (response.ok) {
        const data = await response.json();
        setBackgroundCheck(data.backgroundCheck);
      }
    } catch (error) {
      console.error("Error loading background check:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!backgroundCheck) return;

    setIsRefreshing(true);
    try {
      const response = await fetch(
        `/api/admin/background-checks/${backgroundCheck.id}/refresh`,
        { method: "POST" }
      );

      if (response.ok) {
        const data = await response.json();
        setBackgroundCheck(data.backgroundCheck);
        if (onRefresh) onRefresh(data.backgroundCheck);
      }
    } catch (error) {
      console.error("Error refreshing background check:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRunCheck = () => {
    router.push(`/applications-manager/candidate/${applicationId}/background-check`);
  };

  const handleViewDetails = () => {
    router.push(`/applications-manager/candidate/${applicationId}/background-check`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  // If CERTN not enabled, don't show anything
  if (!certnEnabled) {
    return null;
  }

  const statusConfig = {
    pending: {
      icon: Clock,
      label: "In Progress",
      bgClass: "bg-yellow-50 dark:bg-yellow-900/20",
      textClass: "text-yellow-700 dark:text-yellow-300",
      borderClass: "border-yellow-200 dark:border-yellow-800",
      iconClass: "text-yellow-600 dark:text-yellow-400",
    },
    complete: {
      icon: CheckCircle,
      label: "Clear",
      bgClass: "bg-green-50 dark:bg-green-900/20",
      textClass: "text-green-700 dark:text-green-300",
      borderClass: "border-green-200 dark:border-green-800",
      iconClass: "text-green-600 dark:text-green-400",
    },
    consider: {
      icon: AlertTriangle,
      label: "Requires Review",
      bgClass: "bg-orange-50 dark:bg-orange-900/20",
      textClass: "text-orange-700 dark:text-orange-300",
      borderClass: "border-orange-200 dark:border-orange-800",
      iconClass: "text-orange-600 dark:text-orange-400",
    },
    suspended: {
      icon: XCircle,
      label: "Suspended",
      bgClass: "bg-red-50 dark:bg-red-900/20",
      textClass: "text-red-700 dark:text-red-300",
      borderClass: "border-red-200 dark:border-red-800",
      iconClass: "text-red-600 dark:text-red-400",
    },
  };

  // No check exists - show "Run Check" button
  if (!backgroundCheck) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            No background check on file
          </p>
        </div>

        <button
          onClick={handleRunCheck}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          <Shield className="h-4 w-4" />
          <span>Run Background Check</span>
        </button>
      </motion.div>
    );
  }

  const config = statusConfig[backgroundCheck.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  // Format package name
  const packageNames = {
    basic: "Basic Criminal",
    standard: "Standard Employment",
    comprehensive: "Comprehensive",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Status Badge */}
      <div
        className={`flex items-center space-x-2 px-3 py-2 border rounded-lg ${config.bgClass} ${config.borderClass}`}
      >
        <StatusIcon className={`h-5 w-5 ${config.iconClass}`} />
        <div className="flex-1">
          <p className={`text-sm font-medium ${config.textClass}`}>
            {config.label}
          </p>
        </div>
        {backgroundCheck.status === "pending" && (
          <Loader2 className={`h-4 w-4 ${config.iconClass} animate-spin`} />
        )}
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between admin-text-light">
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Package:</span>
          </div>
          <span className="font-medium admin-text">
            {packageNames[backgroundCheck.package_type] || backgroundCheck.package_type}
          </span>
        </div>

        <div className="flex items-center justify-between admin-text-light">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Started:</span>
          </div>
          <span className="font-medium admin-text">
            {new Date(backgroundCheck.initiated_at).toLocaleDateString()}
          </span>
        </div>

        {backgroundCheck.completed_at && (
          <div className="flex items-center justify-between admin-text-light">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>Completed:</span>
            </div>
            <span className="font-medium admin-text">
              {new Date(backgroundCheck.completed_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col space-y-2">
        <button
          onClick={handleViewDetails}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg border admin-border hover:bg-gray-50 dark:hover:bg-gray-800 admin-text transition-colors"
        >
          <Eye className="h-4 w-4" />
          <span>View Details</span>
        </button>

        {backgroundCheck.status === "pending" && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg border admin-border hover:bg-gray-50 dark:hover:bg-gray-800 admin-text transition-colors disabled:opacity-50"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>{isRefreshing ? "Refreshing..." : "Refresh Status"}</span>
          </button>
        )}

        {backgroundCheck.certn_report_url && (
          <a
            href={backgroundCheck.certn_report_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            <span>View Report</span>
          </a>
        )}

        {/* Re-run check button (if completed or expired) */}
        {(backgroundCheck.status === "complete" || backgroundCheck.status === "suspended") && (
          <button
            onClick={handleRunCheck}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Re-run Check</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
