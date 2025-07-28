"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSetting } from "../hooks/useSettings";

const SiteThemeContext = createContext();

export function SiteThemeProvider({ children }) {
  const { value: siteTheme, loading } = useSetting("site_color_theme", "ocean-blue");
  const [isClient, setIsClient] = useState(false);

  // Mark as client-side after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Apply theme to document element
  useEffect(() => {
    if (isClient && siteTheme && !loading) {
      const root = document.documentElement;
      
      // Remove any existing site theme attribute
      root.removeAttribute('data-site-theme');
      
      // Apply new theme (ocean-blue is default, no attribute needed)
      if (siteTheme !== 'ocean-blue') {
        root.setAttribute('data-site-theme', siteTheme);
      }
      
      // Cache theme in localStorage
      try {
        localStorage.setItem('site-color-theme', siteTheme);
      } catch (e) {
        console.warn('Failed to cache theme:', e);
      }
    }
  }, [siteTheme, loading, isClient]);

  const value = {
    theme: siteTheme,
    loading: !isClient || loading,
    isClient
  };

  return (
    <SiteThemeContext.Provider value={value}>
      {children}
    </SiteThemeContext.Provider>
  );
}

export function useSiteTheme() {
  const context = useContext(SiteThemeContext);
  if (!context) {
    throw new Error("useSiteTheme must be used within a SiteThemeProvider");
  }
  return context;
}

// Theme definitions for use in components
export const SITE_THEMES = {
  'ocean-blue': {
    name: 'Ocean Blue',
    description: 'Professional blue tones',
    preview: {
      primary: '#3b82f6',
      secondary: '#1e40af',
      accent: '#06b6d4'
    }
  },
  'forest-green': {
    name: 'Forest Green',
    description: 'Natural green palette',
    preview: {
      primary: '#16a34a',
      secondary: '#166534',
      accent: '#059669'
    }
  },
  'sunset-orange': {
    name: 'Sunset Orange',
    description: 'Warm orange and amber',
    preview: {
      primary: '#ea580c',
      secondary: '#9a3412',
      accent: '#f59e0b'
    }
  },
  'royal-purple': {
    name: 'Royal Purple',
    description: 'Rich purple tones',
    preview: {
      primary: '#7c3aed',
      secondary: '#5b21b6',
      accent: '#a855f7'
    }
  },
  'charcoal-gray': {
    name: 'Charcoal Gray',
    description: 'Modern monochrome',
    preview: {
      primary: '#374151',
      secondary: '#111827',
      accent: '#6b7280'
    }
  },
  'rose-gold': {
    name: 'Rose Gold',
    description: 'Elegant pink and gold',
    preview: {
      primary: '#e11d48',
      secondary: '#9f1239',
      accent: '#f59e0b'
    }
  },
  'tech-blue': {
    name: 'Tech Blue',
    description: 'Bright tech blue',
    preview: {
      primary: '#0ea5e9',
      secondary: '#0369a1',
      accent: '#06b6d4'
    }
  },
  'warm-earth': {
    name: 'Warm Earth',
    description: 'Brown and terracotta',
    preview: {
      primary: '#92400e',
      secondary: '#451a03',
      accent: '#d97706'
    }
  }
};