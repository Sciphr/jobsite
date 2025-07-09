// app/admin/settings/components/ThemeSelector.js
"use client";

import { useState } from "react";
import { useAdminTheme } from "../../../contexts/AdminThemeContext";
import { Check, Palette, RefreshCw } from "lucide-react";

export default function ThemeSelector() {
  const { currentTheme, themes, updateTheme, loading } = useAdminTheme();
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);

  const handleThemeChange = async (themeId) => {
    if (themeId === currentTheme || updating) return;

    setUpdating(true);
    setUpdateStatus(null);

    const result = await updateTheme(themeId);

    if (result.success) {
      setUpdateStatus({
        type: "success",
        message: "Theme updated successfully!",
      });
    } else {
      setUpdateStatus({
        type: "error",
        message: result.error || "Failed to update theme",
      });
    }

    setUpdating(false);

    // Clear status after 3 seconds
    setTimeout(() => setUpdateStatus(null), 3000);
  };

  if (loading) {
    return (
      <div className="setting-card flex items-start space-x-4 p-4 border rounded-lg transition-all duration-200 border-purple-200 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 bg-white dark:bg-gray-800">
        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <Palette className="h-4 w-4 text-purple-600 dark:text-purple-400 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Admin Dashboard Theme
          </h3>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="setting-card flex items-start space-x-4 p-4 border rounded-lg transition-all duration-200 border-purple-200 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 bg-white dark:bg-gray-800">
      <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
        <Palette className="h-4 w-4 text-purple-600 dark:text-purple-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Admin Dashboard Theme
          </h3>
          {updating && (
            <RefreshCw className="h-4 w-4 text-purple-600 animate-spin" />
          )}
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Choose your preferred color scheme for the admin dashboard. This
          setting is personal to you.
        </p>

        {/* Status Message */}
        {updateStatus && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              updateStatus.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
            }`}
          >
            <div className="flex items-center space-x-2">
              {updateStatus.type === "success" ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className="font-medium">Error:</span>
              )}
              <span>{updateStatus.message}</span>
            </div>
          </div>
        )}

        {/* Theme Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.values(themes).map((theme) => {
            const isSelected = currentTheme === theme.id;
            const isDisabled = updating;

            return (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                disabled={isDisabled}
                className={`relative p-4 rounded-lg border-2 transition-all duration-200 text-left group ${
                  isSelected
                    ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-white dark:bg-gray-800"
                } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {/* Theme Preview */}
                <div
                  className={`w-full h-8 rounded mb-3 ${theme.preview}`}
                ></div>

                {/* Theme Info */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {theme.name}
                    </h4>
                    {isSelected && (
                      <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {theme.description}
                  </p>
                </div>

                {/* Color Swatches */}
                <div className="flex space-x-2 mt-3">
                  <div
                    className="w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600"
                    style={{ backgroundColor: theme.primary }}
                  ></div>
                  <div
                    className="w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600"
                    style={{ backgroundColor: theme.accent }}
                  ></div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Current Theme Info */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <strong>Current theme:</strong> {themes[currentTheme]?.name} -{" "}
            {themes[currentTheme]?.description}
          </div>
        </div>
      </div>
    </div>
  );
}
