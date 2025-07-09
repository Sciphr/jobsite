// app/hooks/useAnimationSettings.js
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export const useAnimationSettings = () => {
  const { data: session } = useSession();
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [systemPrefersReducedMotion, setSystemPrefersReducedMotion] =
    useState(false);

  useEffect(() => {
    // Check system preference for reduced motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    setSystemPrefersReducedMotion(prefersReducedMotion);

    // If system prefers reduced motion, disable animations by default
    if (prefersReducedMotion) {
      setAnimationsEnabled(false);
      setLoading(false);
      return;
    }

    // Otherwise, fetch user's personal preference
    fetchAnimationSetting();
  }, [session]);

  const fetchAnimationSetting = async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/settings/enable_dashboard_animations?personal=true`
      );

      if (response.ok) {
        const setting = await response.json();
        setAnimationsEnabled(setting.parsedValue !== false); // Default to true if not set
      } else {
        // If setting doesn't exist, default to enabled
        setAnimationsEnabled(true);
      }
    } catch (error) {
      console.error("Error fetching animation setting:", error);
      setAnimationsEnabled(true); // Default to enabled on error
    } finally {
      setLoading(false);
    }
  };

  const updateAnimationSetting = async (enabled) => {
    if (!session?.user?.id) {
      console.error("No user session for updating animation setting");
      return { success: false, error: "No user session" };
    }

    try {
      const response = await fetch(
        `/api/admin/settings/enable_dashboard_animations`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            value: enabled,
            isPersonal: true,
          }),
        }
      );

      if (response.ok) {
        setAnimationsEnabled(enabled);
        return { success: true };
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to update animation setting"
        );
      }
    } catch (error) {
      console.error("Error updating animation setting:", error);
      return {
        success: false,
        error: error.message || "Failed to update animation preference",
      };
    }
  };

  return {
    animationsEnabled,

    systemPrefersReducedMotion,
    loading,
    updateAnimationSetting,
    refetch: fetchAnimationSetting,
  };
};
