// app/admin/settings/components/AnimationToggle.js
"use client";

import { useState } from "react";
import { useAnimationSettings } from "../../../hooks/useAnimationSettings";
import { Check, Zap, ZapOff, RefreshCw, AlertTriangle } from "lucide-react";

export default function AnimationToggle() {
  const {
    animationsEnabled,
    shouldAnimate,
    systemPrefersReducedMotion,
    loading,
    updateAnimationSetting,
  } = useAnimationSettings();

  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);

  const handleToggle = async () => {
    if (updating) return;

    setUpdating(true);
    setUpdateStatus(null);

    const result = await updateAnimationSetting(!animationsEnabled);

    if (result.success) {
      setUpdateStatus({
        type: "success",
        message: `Animations ${!animationsEnabled ? "enabled" : "disabled"} successfully!`,
      });
    } else {
      setUpdateStatus({
        type: "error",
        message: result.error || "Failed to update animation setting",
      });
    }

    setUpdating(false);

    // Clear status after 3 seconds
    setTimeout(() => setUpdateStatus(null), 3000);
  };

  if (loading) {
    return (
      <div className="setting-card flex items-start space-x-4 p-4 border rounded-lg transition-all duration-200 border-blue-200 hover:bg-blue-50">
        <div className="p-2 rounded-lg bg-blue-100">
          <Zap className="h-4 w-4 text-blue-600 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Dashboard Animations
          </h3>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="setting-card flex items-start space-x-4 p-4 border rounded-lg transition-all duration-200 border-blue-200 hover:bg-blue-50">
      <div className="p-2 rounded-lg bg-blue-100">
        {animationsEnabled ? (
          <Zap className="h-4 w-4 text-blue-600" />
        ) : (
          <ZapOff className="h-4 w-4 text-blue-600" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900">
            Dashboard Animations
          </h3>
          {updating && (
            <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
          )}
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Control whether GSAP animations play when loading dashboard pages.
          Disabling can improve performance and accessibility.
        </p>

        {/* System reduced motion warning */}
        {systemPrefersReducedMotion && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-700">
                Your system is set to prefer reduced motion. Animations are
                automatically disabled.
              </span>
            </div>
          </div>
        )}

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

        {/* Toggle Control */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleToggle}
            disabled={updating || systemPrefersReducedMotion}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              animationsEnabled ? "bg-blue-600" : "bg-gray-300"
            } ${
              systemPrefersReducedMotion
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                animationsEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <div className="flex flex-col">
            <span className="text-sm admin-text">
              {animationsEnabled ? "Enabled" : "Disabled"}
            </span>
            {systemPrefersReducedMotion && (
              <span className="text-xs text-orange-600">
                (Overridden by system preference)
              </span>
            )}
          </div>
        </div>

        {/* Current Status */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600">
            <strong>Current behavior:</strong> Animations are{" "}
            {shouldAnimate ? "enabled" : "disabled"}
            {systemPrefersReducedMotion && " due to system preference"}
          </div>
        </div>
      </div>
    </div>
  );
}
