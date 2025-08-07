// app/hooks/useStageTimeTracking.js
"use client";

import { useSettings } from "@/app/hooks/useAdminData";

/**
 * Custom hook to check if stage time tracking is enabled
 * @returns {boolean} - Whether stage time tracking is enabled
 */
export function useStageTimeTracking() {
  const { data: settingsData } = useSettings();

  const trackTimeInStage = settingsData?.settings?.find(
    (setting) => setting.key === "track_time_in_stage"
  )?.parsedValue || false;

  return trackTimeInStage;
}