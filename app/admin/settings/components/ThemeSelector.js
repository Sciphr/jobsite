// app/admin/settings/components/ThemeSelector.js
"use client";

import { useState } from "react";
import {
  useAdminTheme,
  ADMIN_THEMES,
} from "../../../contexts/AdminThemeContext";
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
      <div className="setting-card flex items-start space-x-4 p-4 border rounded-lg transition-all duration-200 border-purple-200 hover:bg-purple-50">
        <div className="p-2 rounded-lg bg-purple-100">
          <Palette className="h-4 w-4 text-purple-600 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Admin Dashboard Theme
          </h3>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="setting-card flex items-start space-x-4 p-4 border rounded-lg transition-all duration-200 border-purple-200 hover:bg-purple-50">
      <div className="p-2 rounded-lg bg-purple-100">
        <Palette className="h-4 w-4 text-purple-600" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900">
            Admin Dashboard Theme
          </h3>
          {updating && (
            <RefreshCw className="h-4 w-4 text-purple-600 animate-spin" />
          )}
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Choose your preferred color scheme for the admin dashboard. This
          setting is personal to you.
        </p>

        {/* Status Message */}
        {updateStatus && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              updateStatus.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
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
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {/* Theme Preview */}
                <div
                  className={`w-full h-8 rounded mb-3 ${theme.preview}`}
                ></div>

                {/* Theme Info */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">{theme.name}</h4>
                    {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                  </div>
                  <p className="text-xs text-gray-500">{theme.description}</p>
                </div>

                {/* Color Swatches */}
                <div className="flex space-x-2 mt-3">
                  <div
                    className="w-4 h-4 rounded-full border border-gray-200"
                    style={{ backgroundColor: theme.primary }}
                  ></div>
                  <div
                    className="w-4 h-4 rounded-full border border-gray-200"
                    style={{ backgroundColor: theme.accent }}
                  ></div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Current Theme Info */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600">
            <strong>Current theme:</strong> {themes[currentTheme]?.name} -{" "}
            {themes[currentTheme]?.description}
          </div>
        </div>
      </div>
    </div>
  );
}
