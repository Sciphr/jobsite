// app/components/HRISStatusBadge.js
"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Loader2, Zap, AlertCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function HRISStatusBadge({ applicationId, status, onSyncComplete }) {
  const [syncStatus, setSyncStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status === "Hired") {
      checkSyncStatus();
    } else {
      setIsLoading(false);
    }
  }, [applicationId, status]);

  const checkSyncStatus = async () => {
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/hris-sync`);
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data);
      }
    } catch (error) {
      console.error("Error checking HRIS sync status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/hris-sync`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setSyncStatus({
          synced: true,
          syncedAt: data.syncedAt,
          employeeId: data.employeeId,
          canSync: false,
        });
        if (onSyncComplete) {
          onSyncComplete(data);
        }
      } else {
        setError(data.error || "Failed to sync to HRIS");
      }
    } catch (error) {
      console.error("Error syncing to HRIS:", error);
      setError("Failed to sync to HRIS");
    } finally {
      setIsSyncing(false);
    }
  };

  // Don't show anything if not hired
  if (status !== "Hired") {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        <span className="text-sm text-gray-600 dark:text-gray-300">Checking HRIS status...</span>
      </div>
    );
  }

  // Already synced
  if (syncStatus?.synced) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center space-x-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
      >
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-700 dark:text-green-300">
            Synced to HRIS
          </p>
          {syncStatus.syncedAt && (
            <p className="text-xs text-green-600 dark:text-green-400">
              {new Date(syncStatus.syncedAt).toLocaleString()}
            </p>
          )}
          {syncStatus.employeeId && (
            <p className="text-xs text-green-600 dark:text-green-400 font-mono">
              ID: {syncStatus.employeeId}
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  // Can be synced
  if (syncStatus?.canSync) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-2"
      >
        <div className="flex items-center space-x-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Not synced to HRIS
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            isSyncing
              ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isSyncing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              <span>Sync to HRIS</span>
            </>
          )}
        </button>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // Sync error
  if (syncStatus?.error) {
    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              Sync failed
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">
              {syncStatus.error}
            </p>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
        >
          {isSyncing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Retrying...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              <span>Retry Sync</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return null;
}
