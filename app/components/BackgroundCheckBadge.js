// app/components/BackgroundCheckBadge.js
"use client";

import {
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";

export default function BackgroundCheckBadge({ backgroundCheck, size = "md" }) {
  if (!backgroundCheck) {
    return null;
  }

  const statusConfig = {
    pending: {
      icon: Clock,
      label: "In Progress",
      bgClass: "bg-yellow-100 dark:bg-yellow-900/30",
      textClass: "text-yellow-800 dark:text-yellow-300",
      borderClass: "border-yellow-300 dark:border-yellow-700",
      iconClass: "text-yellow-600 dark:text-yellow-400",
    },
    complete: {
      icon: CheckCircle,
      label: "Clear",
      bgClass: "bg-green-100 dark:bg-green-900/30",
      textClass: "text-green-800 dark:text-green-300",
      borderClass: "border-green-300 dark:border-green-700",
      iconClass: "text-green-600 dark:text-green-400",
    },
    consider: {
      icon: AlertTriangle,
      label: "Review",
      bgClass: "bg-orange-100 dark:bg-orange-900/30",
      textClass: "text-orange-800 dark:text-orange-300",
      borderClass: "border-orange-300 dark:border-orange-700",
      iconClass: "text-orange-600 dark:text-orange-400",
    },
    suspended: {
      icon: XCircle,
      label: "Suspended",
      bgClass: "bg-red-100 dark:bg-red-900/30",
      textClass: "text-red-800 dark:text-red-300",
      borderClass: "border-red-300 dark:border-red-700",
      iconClass: "text-red-600 dark:text-red-400",
    },
  };

  const config =
    statusConfig[backgroundCheck.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  // Size variants
  const sizeClasses = {
    sm: {
      container: "px-2 py-1 text-xs",
      icon: "h-3 w-3",
    },
    md: {
      container: "px-3 py-1.5 text-sm",
      icon: "h-4 w-4",
    },
    lg: {
      container: "px-4 py-2 text-base",
      icon: "h-5 w-5",
    },
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      className={`inline-flex items-center space-x-1.5 rounded-full border ${config.bgClass} ${config.textClass} ${config.borderClass} ${sizeClass.container} font-medium`}
      title={`Background Check: ${config.label}${backgroundCheck.completed_at ? ` - Completed ${new Date(backgroundCheck.completed_at).toLocaleDateString()}` : ""}`}
    >
      <StatusIcon className={`${sizeClass.icon} ${config.iconClass}`} />
      <span>{config.label}</span>
      {backgroundCheck.status === "pending" && (
        <Loader2 className={`${sizeClass.icon} ${config.iconClass} animate-spin`} />
      )}
    </div>
  );
}

// Compact version for list views
export function BackgroundCheckIcon({ backgroundCheck }) {
  if (!backgroundCheck) {
    return null;
  }

  const statusConfig = {
    pending: {
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
      title: "Background check in progress",
    },
    complete: {
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      title: "Background check clear",
    },
    consider: {
      icon: AlertTriangle,
      color: "text-orange-600 dark:text-orange-400",
      title: "Background check requires review",
    },
    suspended: {
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      title: "Background check suspended",
    },
  };

  const config =
    statusConfig[backgroundCheck.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div className="relative inline-block" title={config.title}>
      <Shield className="h-5 w-5 text-gray-400" />
      <StatusIcon
        className={`h-3 w-3 ${config.color} absolute -top-1 -right-1`}
      />
    </div>
  );
}
