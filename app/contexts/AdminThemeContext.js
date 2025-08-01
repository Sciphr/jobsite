// app/contexts/AdminThemeContext.js
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const AdminThemeContext = createContext();

export const ADMIN_THEMES = {
  default: {
    id: "default",
    name: "Default",
    description: "Colorful & vibrant theme",
    primary: "#7c3aed",
    accent: "#3b82f6",
    preview:
      "bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 to-blue-500",
  },
  minimal: {
    id: "minimal",
    name: "Minimal",
    description: "Clean grays & subtle accents",
    primary: "#374151",
    accent: "#6b7280",
    preview: "bg-gradient-to-r from-gray-600 via-gray-500 to-gray-400",
  },
  cool: {
    id: "cool",
    name: "Cool",
    description: "Blues, purples & teals",
    primary: "#3b82f6",
    accent: "#8b5cf6",
    preview: "bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500",
  },
  warm: {
    id: "warm",
    name: "Warm",
    description: "Oranges, reds & earth tones",
    primary: "#ea580c",
    accent: "#dc2626",
    preview: "bg-gradient-to-r from-orange-500 via-red-500 to-amber-500",
  },
  nature: {
    id: "nature",
    name: "Nature",
    description: "Greens & natural earth colors",
    primary: "#16a34a",
    accent: "#059669",
    preview: "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500",
  },
};

export function AdminThemeProvider({ children }) {
  const { data: session } = useSession();
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Initialize with localStorage value or default to prevent flash
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("admin_dashboard_theme");
      return stored || "default";
    }
    return "default";
  });
  const [loading, setLoading] = useState(true);
  const [themeInitialized, setThemeInitialized] = useState(false);

  // Initialize theme immediately on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("admin_dashboard_theme");
      if (storedTheme && storedTheme !== currentTheme) {
        setCurrentTheme(storedTheme);
      }
      document.documentElement.setAttribute("data-admin-theme", currentTheme);
      setThemeInitialized(true);
    }
  }, []);

  // Load user's theme preference from server
  useEffect(() => {
    if (session?.user?.id && themeInitialized) {
      loadUserTheme();
    } else if (!session?.user?.id && themeInitialized) {
      setLoading(false);
    }
  }, [session, themeInitialized]);

  // Apply theme to document when it changes
  useEffect(() => {
    if (typeof window !== "undefined" && themeInitialized) {
      document.documentElement.setAttribute("data-admin-theme", currentTheme);
      // Store in localStorage for immediate access on next load
      localStorage.setItem("admin_dashboard_theme", currentTheme);
    }
  }, [currentTheme, themeInitialized]);

  const loadUserTheme = async () => {
    try {
      // Add 5 second timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(
        `/api/admin/settings/admin_dashboard_theme?personal=true`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const setting = await response.json();
        const serverTheme = setting.parsedValue || "default";
        if (serverTheme !== currentTheme) {
          setCurrentTheme(serverTheme);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn("Theme loading timed out - using current theme");
      } else {
        console.error("Error loading theme:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateTheme = async (themeId) => {
    if (!session?.user?.id) {
      console.error("Cannot update theme: No valid user session");
      return {
        success: false,
        error: "User session required to save theme preference",
      };
    }

    try {
      const response = await fetch(
        `/api/admin/settings/admin_dashboard_theme`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            value: themeId,
            isPersonal: true, // Always set as personal
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update theme");
      }

      const updatedSetting = await response.json();
      setCurrentTheme(themeId);
      
      // Update localStorage immediately
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_dashboard_theme", themeId);
      }

      return { success: true };
    } catch (error) {
      console.error("Theme update error:", error);
      return {
        success: false,
        error: error.message || "Failed to update theme preference",
      };
    }
  };

  const value = {
    currentTheme,
    themes: ADMIN_THEMES,
    updateTheme,
    loading,
    isAdminUser: session?.user?.privilegeLevel >= 1,
  };

  return (
    <AdminThemeContext.Provider value={value}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error("useAdminTheme must be used within AdminThemeProvider");
  }
  return context;
}

// Hook to get theme-aware classes and styles
export function useThemeClasses() {
  const { currentTheme } = useAdminTheme();
  const theme = ADMIN_THEMES[currentTheme];

  const getThemeClasses = (type) => {
    // Return regular Tailwind classes that we'll enhance with CSS variables
    const baseClasses = {
      primary: "text-white transition-colors duration-200",
      primaryLight: "text-white transition-colors duration-200",
      accent: "text-white transition-colors duration-200",
      success: "text-white transition-colors duration-200",
      warning: "text-white transition-colors duration-200",
      danger: "text-white transition-colors duration-200",
      card: "bg-white border border-gray-200 hover:border-opacity-60 transition-all duration-200",
      sidebar: "bg-white border-r border-gray-200",
      text: "text-gray-900",
      textLight: "text-gray-600",
      primaryText: "font-medium",
      primaryBorder: "border",
    };

    return baseClasses[type] || "";
  };

  // Get theme-aware stat card classes (for dashboard quick stats)
  const getStatCardClasses = (index) => {
    // Use CSS custom properties for consistent theming
    const statIndex = (index % 5) + 1; // Cycle through 1-5
    return {
      icon: `theme-stat-${statIndex}`,
      bg: `theme-stat-${statIndex}-bg`,
      border: `theme-stat-${statIndex}-border border-2`,
      text: "text-gray-900",
      hover: `hover:theme-stat-${statIndex}-border transition-all duration-200`,
    };
  };

  // Get button classes for different types
  const getButtonClasses = (variant = "primary") => {
    const variants = {
      primary: "theme-primary-bg hover:opacity-90 text-white",
      accent: "theme-accent-bg hover:opacity-90 text-white",
      success: "theme-success-bg hover:opacity-90 text-white",
      warning: "theme-warning-bg hover:opacity-90 text-white",
      danger: "theme-danger-bg hover:opacity-90 text-white",
    };

    return `${variants[variant]} transition-all duration-200 font-medium`;
  };

  return {
    getThemeClasses,
    getStatCardClasses,
    getButtonClasses,
    currentTheme,
    theme,
  };
}
