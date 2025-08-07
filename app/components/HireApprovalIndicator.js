// app/components/HireApprovalIndicator.js
"use client";

import { Clock, CheckCircle2, User } from "lucide-react";

export default function HireApprovalIndicator({ 
  hasPendingRequest, 
  requestedBy, 
  requestedAt,
  size = "sm", // "sm", "md", "lg"
}) {
  if (!hasPendingRequest) {
    return null;
  }

  const sizeClasses = {
    sm: {
      container: "px-2 py-0.5 text-xs",
      icon: "h-3 w-3",
    },
    md: {
      container: "px-3 py-1 text-sm",
      icon: "h-4 w-4",
    },
    lg: {
      container: "px-4 py-2 text-base",
      icon: "h-5 w-5",
    },
  };

  const classes = sizeClasses[size] || sizeClasses.sm;

  const tooltipText = requestedBy 
    ? `Hire approval requested by ${requestedBy}${requestedAt ? ` on ${new Date(requestedAt).toLocaleDateString()}` : ''}`
    : 'Hire approval pending';

  return (
    <span
      className={`inline-flex items-center space-x-1 rounded-full font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300 ${classes.container}`}
      title={tooltipText}
    >
      <Clock className={`${classes.icon} flex-shrink-0`} />
      <span>Pending Hire Approval</span>
    </span>
  );
}

/**
 * Compact version that shows just an icon with tooltip
 */
export function HireApprovalIconIndicator({ 
  hasPendingRequest, 
  requestedBy, 
  requestedAt,
  className = "",
}) {
  if (!hasPendingRequest) {
    return null;
  }

  const tooltipText = requestedBy 
    ? `Hire approval requested by ${requestedBy}${requestedAt ? ` on ${new Date(requestedAt).toLocaleDateString()}` : ''}`
    : 'Hire approval pending';

  return (
    <div 
      className={`inline-flex items-center justify-center bg-orange-500 rounded-full p-1 ${className}`}
      title={tooltipText}
    >
      <Clock className="h-3 w-3 text-white" />
    </div>
  );
}

/**
 * Badge version for inline display
 */
export function HireApprovalBadge({ 
  hasPendingRequest, 
  requestedBy, 
  requestedAt,
}) {
  if (!hasPendingRequest) {
    return null;
  }

  const tooltipText = requestedBy 
    ? `Requested by ${requestedBy}${requestedAt ? ` on ${new Date(requestedAt).toLocaleDateString()}` : ''}`
    : 'Hire approval pending';

  return (
    <span
      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300"
      title={tooltipText}
    >
      <Clock className="h-3 w-3 flex-shrink-0" />
      <span>Hire Pending</span>
    </span>
  );
}