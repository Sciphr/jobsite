"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Palette, Check, RefreshCw } from "lucide-react";
import { SITE_THEMES } from "../../../contexts/SiteThemeContext";
import { updateSettingGlobally } from "../../../hooks/useSettings";

export default function SiteThemeSelector({ getButtonClasses }) {
  const [currentTheme, setCurrentTheme] = useState("ocean-blue");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch current theme setting
  useEffect(() => {
    const fetchCurrentTheme = async () => {
      try {
        const response = await fetch('/api/settings/public?key=site_color_theme');
        if (response.ok) {
          const data = await response.json();
          setCurrentTheme(data.parsedValue || "ocean-blue");
        }
      } catch (error) {
        console.error('Error fetching current theme:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentTheme();
  }, []);

  const handleThemeChange = async (themeKey) => {
    if (themeKey === currentTheme || saving) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings/site_color_theme', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: themeKey })
      });

      if (response.ok) {
        const updatedSetting = await response.json();
        setCurrentTheme(themeKey);
        
        // Update globally so other components get the change
        updateSettingGlobally('site_color_theme', themeKey);
        
        // Apply theme immediately to preview
        const root = document.documentElement;
        if (themeKey !== 'ocean-blue') {
          root.setAttribute('data-site-theme', themeKey);
        } else {
          root.removeAttribute('data-site-theme');
        }
      } else {
        console.error('Failed to update theme setting');
      }
    } catch (error) {
      console.error('Error updating theme:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold admin-text mb-2">Site Color Theme</h3>
          <p className="text-sm admin-text-light">
            Choose a color palette for your public site pages (homepage, jobs, login, signup, etc.)
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold admin-text mb-2">Site Color Theme</h3>
        <p className="text-sm admin-text-light">
          Choose a color palette for your public site pages (homepage, jobs, login, signup, etc.). 
          This won't affect admin dashboard colors.
        </p>
      </div>

      {/* Theme Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Object.entries(SITE_THEMES).map(([themeKey, theme]) => (
          <motion.div
            key={themeKey}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative cursor-pointer rounded-lg border-2 transition-all duration-200 ${
              currentTheme === themeKey
                ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            onClick={() => handleThemeChange(themeKey)}
          >
            {/* Theme Preview */}
            <div className="p-4 space-y-3">
              {/* Color swatches */}
              <div className="flex space-x-2">
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: theme.preview.primary }}
                />
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: theme.preview.secondary }}
                />
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: theme.preview.accent }}
                />
              </div>

              {/* Theme info */}
              <div>
                <h4 className="text-sm font-medium admin-text">{theme.name}</h4>
                <p className="text-xs admin-text-light">{theme.description}</p>
              </div>
            </div>

            {/* Selection indicator */}
            {currentTheme === themeKey && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
              >
                <Check className="h-3 w-3 text-white" />
              </motion.div>
            )}

            {/* Loading overlay */}
            {saving && currentTheme === themeKey && (
              <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 dark:bg-opacity-75 rounded-lg flex items-center justify-center">
                <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Info note */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Palette className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">Theme Preview</h4>
            <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
              Changes apply immediately to public pages. Admin dashboard colors remain unchanged.
              The theme adapts automatically to light/dark mode preferences.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}