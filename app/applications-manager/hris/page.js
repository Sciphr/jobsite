// app/applications-manager/hris/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { motion } from "framer-motion";
import {
  Users,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Clock,
  Zap,
  TrendingUp,
  Building2,
  Calendar,
  ArrowRight,
  Settings as SettingsIcon,
  Activity,
} from "lucide-react";

export default function HRISIntegrationPage() {
  const router = useRouter();
  const { getButtonClasses, getStatCardClasses } = useThemeClasses();
  const [isLoading, setIsLoading] = useState(true);
  const [integrationStatus, setIntegrationStatus] = useState(null);
  const [recentSyncs, setRecentSyncs] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    checkIntegrationStatus();
    loadRecentSyncs();
  }, []);

  const checkIntegrationStatus = async () => {
    try {
      const response = await fetch("/api/admin/integrations/hris/status");
      const data = await response.json();

      if (!data.hasActiveIntegration) {
        // Redirect to settings if no integration is active
        router.push("/applications-manager/settings");
        return;
      }

      setIntegrationStatus(data);
    } catch (error) {
      console.error("Error checking integration status:", error);
      router.push("/applications-manager/settings");
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentSyncs = async () => {
    try {
      const response = await fetch("/api/admin/integrations/hris/recent-syncs?limit=20");
      const data = await response.json();
      setRecentSyncs(data.syncs || []);
    } catch (error) {
      console.error("Error loading recent syncs:", error);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const provider = integrationStatus?.activeProvider;
      const response = await fetch(`/api/admin/integrations/${provider}/sync`, {
        method: "POST",
      });

      if (response.ok) {
        await loadRecentSyncs();
        await checkIntegrationStatus();
      }
    } catch (error) {
      console.error("Error syncing:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!integrationStatus?.hasActiveIntegration) {
    return null; // Will redirect in useEffect
  }

  const activeIntegration = integrationStatus.integrations[0];
  const providerName = activeIntegration.name;

  // Calculate stats
  const syncedLast7Days = recentSyncs.filter((sync) => {
    const syncDate = new Date(sync.hiredDate);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return syncDate >= sevenDaysAgo;
  }).length;

  const syncedLast30Days = recentSyncs.length;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold admin-text flex items-center space-x-3">
            <Users className="h-8 w-8 text-green-600" />
            <span>HRIS Integration</span>
          </h1>
          <p className="admin-text-light mt-2">
            Manage your {providerName} integration and sync hired candidates
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push("/applications-manager/settings")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("secondary")}`}
          >
            <SettingsIcon className="h-4 w-4" />
            <span>Settings</span>
          </button>
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("primary")} ${isSyncing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
          </button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={itemVariants} className={`${getStatCardClasses(0).card} p-6 rounded-lg shadow-sm`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm admin-text-light">Connected Provider</p>
              <p className="text-2xl font-bold admin-text mt-1">{providerName}</p>
            </div>
            <div className={`p-3 rounded-lg ${getStatCardClasses(0).bg}`}>
              <Building2 className={`h-6 w-6 ${getStatCardClasses(0).icon}`} />
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-4">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">Active</span>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className={`${getStatCardClasses(1).card} p-6 rounded-lg shadow-sm`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm admin-text-light">Last Sync</p>
              <p className="text-2xl font-bold admin-text mt-1">
                {activeIntegration.lastSync
                  ? new Date(activeIntegration.lastSync).toLocaleDateString()
                  : "Never"}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${getStatCardClasses(1).bg}`}>
              <Clock className={`h-6 w-6 ${getStatCardClasses(1).icon}`} />
            </div>
          </div>
          <p className="text-xs admin-text-light mt-4">
            {activeIntegration.lastSync
              ? new Date(activeIntegration.lastSync).toLocaleTimeString()
              : "No syncs yet"}
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className={`${getStatCardClasses(2).card} p-6 rounded-lg shadow-sm`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm admin-text-light">Synced (Last 7 Days)</p>
              <p className="text-2xl font-bold admin-text mt-1">{syncedLast7Days}</p>
            </div>
            <div className={`p-3 rounded-lg ${getStatCardClasses(2).bg}`}>
              <TrendingUp className={`h-6 w-6 ${getStatCardClasses(2).icon}`} />
            </div>
          </div>
          <p className="text-xs admin-text-light mt-4">Candidates added to {providerName}</p>
        </motion.div>

        <motion.div variants={itemVariants} className={`${getStatCardClasses(3).card} p-6 rounded-lg shadow-sm`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm admin-text-light">Synced (Last 30 Days)</p>
              <p className="text-2xl font-bold admin-text mt-1">{syncedLast30Days}</p>
            </div>
            <div className={`p-3 rounded-lg ${getStatCardClasses(3).bg}`}>
              <Calendar className={`h-6 w-6 ${getStatCardClasses(3).icon}`} />
            </div>
          </div>
          <p className="text-xs admin-text-light mt-4">Total candidates synced</p>
        </motion.div>
      </div>

      {/* Recent Syncs */}
      <motion.div variants={itemVariants} className="admin-card rounded-lg shadow-sm border admin-border">
        <div className="p-6 border-b admin-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="h-6 w-6 text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold admin-text">Recent Activity</h3>
                <p className="text-sm admin-text-light">
                  Candidates recently synced to {providerName}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {recentSyncs.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 admin-text-light mx-auto mb-4" />
              <h3 className="text-lg font-medium admin-text mb-2">No Recent Syncs</h3>
              <p className="admin-text-light mb-4">
                Candidates marked as "Hired" will appear here once synced to {providerName}
              </p>
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors mx-auto ${getButtonClasses("primary")}`}
              >
                <Zap className="h-4 w-4" />
                <span>Sync Now</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSyncs.map((sync, index) => (
                <motion.div
                  key={sync.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-lg border admin-border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium admin-text">{sync.candidateName}</p>
                      <p className="text-sm admin-text-light">
                        {sync.jobTitle} • {sync.department}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium admin-text">
                      {new Date(sync.hiredDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs admin-text-light">
                      {new Date(sync.hiredDate).toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Integration Info */}
      <motion.div variants={itemVariants} className="admin-card rounded-lg shadow-sm border admin-border p-6">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold admin-text mb-2">About HRIS Integration</h4>
            <p className="admin-text-light text-sm mb-4">
              Your {providerName} integration automatically syncs candidates when they are marked as "Hired"
              in your application workflow. This creates employee records in {providerName} with all relevant
              candidate information, streamlining your onboarding process.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push("/applications-manager/settings")}
                className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                <span>Manage Integration Settings</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href={`https://www.${activeIntegration.provider}.com`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                <span>Visit {providerName}</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
