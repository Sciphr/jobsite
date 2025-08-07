// app/applications-manager/components/StageDurationBadge.js
"use client";

import { useEffect, useState } from 'react';
import { Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatDuration, getStageDurationColor } from '@/app/lib/stageTracking';
import { useSettings } from '@/app/hooks/useAdminData';

export default function StageDurationBadge({ 
  applicationId, 
  currentStage, 
  stageEnteredAt, 
  size = 'sm',
  showIcon = true,
  className = '' 
}) {
  const [duration, setDuration] = useState(null);
  const [durationColor, setDurationColor] = useState('success');
  const { data: settingsData } = useSettings();

  // Check if stage time tracking is enabled
  const trackTimeInStage = settingsData?.settings?.find(
    (setting) => setting.key === "track_time_in_stage"
  )?.parsedValue || false;

  useEffect(() => {
    if (!stageEnteredAt || !trackTimeInStage) return;

    const calculateDuration = () => {
      const now = new Date();
      const enteredAt = new Date(stageEnteredAt);
      const durationSeconds = Math.floor((now - enteredAt) / 1000);
      
      setDuration(durationSeconds);
      setDurationColor(getStageDurationColor(currentStage, durationSeconds));
    };

    // Calculate initial duration
    calculateDuration();

    // Update every minute
    const interval = setInterval(calculateDuration, 60000);

    return () => clearInterval(interval);
  }, [stageEnteredAt, currentStage, trackTimeInStage]);

  // Don't render if tracking is disabled or no duration
  if (!trackTimeInStage || !duration) return null;

  const colorClasses = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-700',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-700',
  };

  const sizeClasses = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1.5',
    lg: 'text-base px-3 py-2',
  };

  const iconSizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const getIcon = () => {
    switch (durationColor) {
      case 'danger':
        return <AlertTriangle className={iconSizeClasses[size]} />;
      case 'warning':
        return <TrendingUp className={iconSizeClasses[size]} />;
      default:
        return <Clock className={iconSizeClasses[size]} />;
    }
  };

  return (
    <div className={`
      inline-flex items-center space-x-1 rounded-full border font-medium
      ${colorClasses[durationColor]}
      ${sizeClasses[size]}
      ${className}
    `}>
      {showIcon && getIcon()}
      <span>{formatDuration(duration)}</span>
    </div>
  );
}

export function StageDurationTooltip({ 
  applicationId, 
  currentStage, 
  stageEnteredAt,
  children 
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { data: settingsData } = useSettings();

  // Check if stage time tracking is enabled
  const trackTimeInStage = settingsData?.settings?.find(
    (setting) => setting.key === "track_time_in_stage"
  )?.parsedValue || false;

  if (!stageEnteredAt || !trackTimeInStage) return children;

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
            <div className="font-medium">Time in {currentStage}</div>
            <div className="text-gray-300">
              Since {new Date(stageEnteredAt).toLocaleDateString()} at{' '}
              {new Date(stageEnteredAt).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}