"use client";

import { useState, useEffect } from "react";

// Custom event for settings updates
const SETTINGS_UPDATE_EVENT = "settingsUpdate";

// Helper to dispatch settings update events
export const updateSettingGlobally = (key, value) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(SETTINGS_UPDATE_EVENT, {
        detail: { key, value },
      })
    );
  }
};

// Hook to use a specific setting with real-time updates
export const useSetting = (key, defaultValue = null) => {
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Mark as client-side after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchSetting = async () => {
    try {
      const response = await fetch(`/api/settings/public?key=${key}`);
      if (response.ok) {
        const setting = await response.json();
        setValue(setting.parsedValue || defaultValue);
      }
    } catch (error) {
      console.error(`Error fetching setting ${key}:`, error);
      setValue(defaultValue);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only run on client side to prevent hydration mismatch
    if (!isClient) return;

    fetchSetting();

    // Listen for global settings updates
    const handleSettingsUpdate = (event) => {
      if (event.detail.key === key) {
        setValue(event.detail.value);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(SETTINGS_UPDATE_EVENT, handleSettingsUpdate);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(SETTINGS_UPDATE_EVENT, handleSettingsUpdate);
      }
    };
  }, [key, defaultValue, isClient]);

  return {
    value: isClient ? value : defaultValue,
    loading: !isClient || loading,
    refetch: fetchSetting,
  };
};
