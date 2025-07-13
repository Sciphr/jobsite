// app/applications-manager/settings/page.js
"use client";

import React, { useState, useEffect } from "react";
import { useSettings } from "@/app/hooks/useAdminData";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { motion } from "framer-motion";
import {
  Settings,
  Workflow,
  Mail,
  Calendar,
  Globe,
  Shield,
  Layers,
  ArrowRight,
  Save,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Search,
  Lock,
  Zap,
  AlertTriangle,
  Info,
} from "lucide-react";

export default function ApplicationsManagerSettings() {
  const router = useRouter();
  const { data: session } = useSession();
  const { getButtonClasses } = useThemeClasses();

  // State
  const [activeTab, setActiveTab] = useState("hiring_workflow");
  const {
    data: settingsData,
    isLoading: settingsLoading,
    refetch,
  } = useSettings();
  const [settings, setSettings] = useState([]);
  const [originalSettings, setOriginalSettings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [saveStatus, setSaveStatus] = useState(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
    },
  };

  const sidebarVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        staggerChildren: 0.05,
      },
    },
  };

  const settingCardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
      },
    },
  };

  // Hiring-specific setting categories
  const settingCategories = [
    {
      id: "hiring_workflow",
      label: "Workflow Automation",
      icon: Workflow,
      description: "Configure automated hiring processes and pipeline rules",
    },
    {
      id: "hiring_communication",
      label: "Communication",
      icon: Mail,
      description: "Email templates, notifications, and messaging settings",
    },
    {
      id: "hiring_pipeline",
      label: "Pipeline Management",
      icon: Layers,
      description: "Status stages, progression rules, and candidate flow",
    },
    {
      id: "hiring_scheduling",
      label: "Interview Scheduling",
      icon: Calendar,
      description: "Calendar integration and interview management",
    },
    {
      id: "hiring_integrations",
      label: "Integrations",
      icon: Globe,
      description: "Third-party tools and API connections",
    },
    {
      id: "hiring_permissions",
      label: "Permissions & Access",
      icon: Shield,
      description: "User roles and access control for hiring features",
    },
  ];

  // Load settings using the same hook as admin settings
  useEffect(() => {
    if (settingsData) {
      // Debug: log the settingsData structure
      console.log("settingsData:", settingsData);
      console.log("settingsData.settings:", settingsData.settings);

      // Get all settings as flat array from settingsData.settings (not .all)
      const allSettings = settingsData.settings || [];
      console.log("allSettings length:", allSettings.length);

      // Filter for hiring categories only
      const hiringCategories = [
        "hiring_workflow",
        "hiring_communication",
        "hiring_pipeline",
        "hiring_scheduling",
        "hiring_integrations",
        "hiring_permissions",
      ];

      const hiringSettings = allSettings.filter((setting) => {
        console.log(
          "Checking setting:",
          setting.key,
          "category:",
          setting.category
        );
        return hiringCategories.includes(setting.category);
      });

      console.log("hiringSettings found:", hiringSettings.length);
      console.log("hiringSettings:", hiringSettings);

      setSettings(hiringSettings);
      setOriginalSettings(JSON.parse(JSON.stringify(hiringSettings)));
      setIsLoading(false);
    }
  }, [settingsData]);

  // Set loading state based on settings loading
  useEffect(() => {
    setIsLoading(settingsLoading);
  }, [settingsLoading]);

  const handleSettingChange = (settingId, newValue) => {
    setSettings((prevSettings) =>
      prevSettings.map((setting) =>
        setting.id === settingId
          ? { ...setting, parsedValue: newValue, value: newValue.toString() }
          : setting
      )
    );
  };

  const hasChanges = () => {
    return (
      JSON.stringify(settings.map((s) => s.parsedValue)) !==
      JSON.stringify(originalSettings.map((s) => s.parsedValue))
    );
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    try {
      // Find changed settings
      const changedSettings = settings.filter((setting) => {
        const original = originalSettings.find(
          (orig) => orig.id === setting.id
        );
        return !original || original.parsedValue !== setting.parsedValue;
      });

      if (changedSettings.length === 0) {
        setSaveStatus({ type: "info", message: "No changes to save." });
        setIsSaving(false);
        return;
      }

      // Save each changed setting using the same pattern as admin settings
      const savePromises = changedSettings.map((setting) =>
        fetch(`/api/admin/settings/${setting.key}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            value: setting.parsedValue,
            isPersonal: setting.isPersonal || false,
          }),
        })
      );

      const responses = await Promise.all(savePromises);

      // Check if all requests succeeded
      const allSucceeded = responses.every((response) => response.ok);

      if (allSucceeded) {
        // Refresh settings data using the same hook
        await refetch();
        setSaveStatus({
          type: "success",
          message: `Successfully saved ${changedSettings.length} setting(s)!`,
        });

        // Clear status after 3 seconds
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        throw new Error("Some settings failed to save");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setSaveStatus({
        type: "error",
        message: "Failed to save settings. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetCategory = async (category) => {
    if (
      !confirm(
        `Are you sure you want to reset all ${category.replace("hiring_", "")} settings to defaults?`
      )
    ) {
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`/api/admin/settings/reset-category`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ category }),
      });

      if (!response.ok) {
        throw new Error("Failed to reset settings");
      }

      // Reload settings
      await loadSettings();
      setSaveStatus({
        type: "success",
        message: `${category.replace("hiring_", "")} settings reset successfully!`,
      });

      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error("Error resetting settings:", error);
      setSaveStatus({
        type: "error",
        message: "Failed to reset settings. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderSettingField = (setting) => {
    const { id, key, parsedValue, dataType } = setting;

    switch (dataType) {
      case "boolean":
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={parsedValue === true || parsedValue === "true"}
              onChange={(e) => handleSettingChange(id, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Enable this feature
            </span>
          </div>
        );

      case "number":
        return (
          <input
            type="number"
            value={parsedValue}
            onChange={(e) => handleSettingChange(id, parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="0"
          />
        );

      case "json":
        return (
          <div>
            <textarea
              value={JSON.stringify(parsedValue, null, 2)}
              onChange={(e) => {
                try {
                  const jsonValue = JSON.parse(e.target.value);
                  handleSettingChange(id, jsonValue);
                } catch (error) {
                  // Invalid JSON, don't update
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
              rows={4}
              placeholder="Valid JSON format required"
            />
            <p className="text-xs text-amber-600 flex items-center space-x-1 mt-1">
              <AlertTriangle className="h-3 w-3" />
              <span>Ensure valid JSON format to prevent errors</span>
            </p>
          </div>
        );

      default: // string
        if (key.includes("email_signature")) {
          return (
            <textarea
              value={parsedValue.replace(/\\n/g, "\n")}
              onChange={(e) =>
                handleSettingChange(id, e.target.value.replace(/\n/g, "\\n"))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
            />
          );
        }

        if (
          key.includes("provider") ||
          key.includes("type") ||
          key.includes("style")
        ) {
          const options = {
            default_email_template_style: [
              "professional",
              "friendly",
              "formal",
              "modern",
            ],
            video_call_provider: [
              "zoom",
              "microsoft-teams",
              "google-meet",
              "webex",
            ],
            default_interview_type: ["phone", "video", "in-person"],
            background_check_integration: [
              "none",
              "checkr",
              "sterling",
              "goodhire",
            ],
          };

          return (
            <select
              value={parsedValue}
              onChange={(e) => handleSettingChange(id, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {options[key]?.map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() +
                    option.slice(1).replace(/[-_]/g, " ")}
                </option>
              ))}
            </select>
          );
        }

        return (
          <input
            type="text"
            value={parsedValue}
            onChange={(e) => handleSettingChange(id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );
    }
  };

  const getFilteredSettings = () => {
    let filtered = settings.filter((setting) => setting.category === activeTab);

    if (searchTerm) {
      filtered = filtered.filter(
        (setting) =>
          setting.description
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          setting.key.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="lg:col-span-3 h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const currentCategory = settingCategories.find((cat) => cat.id === activeTab);
  const filteredSettings = getFilteredSettings();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold admin-text flex items-center space-x-3">
              <Settings className="h-8 w-8 text-blue-600" />
              <span>Hiring Settings</span>
            </h1>
            <p className="admin-text-light mt-2">
              Configure automation, workflows, and preferences for your hiring
              process
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => resetCategory(activeTab)}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reset Category</span>
            </button>
            <button
              onClick={() => router.push("/applications-manager")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("secondary")}`}
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              <span>Back to Overview</span>
            </button>
          </div>
        </motion.div>

        {/* Save Status Alert */}
        {saveStatus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-lg border ${
              saveStatus.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : saveStatus.type === "info"
                  ? "bg-blue-50 border-blue-200 text-blue-800"
                  : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center space-x-2">
              {saveStatus.type === "success" ? (
                <CheckCircle className="h-5 w-5" />
              ) : saveStatus.type === "info" ? (
                <Info className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span>{saveStatus.message}</span>
            </div>
          </motion.div>
        )}

        {/* Search */}
        <motion.div
          variants={itemVariants}
          className="admin-card p-4 rounded-lg shadow"
        >
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search settings..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="admin-card rounded-lg shadow overflow-hidden sticky top-6">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600">
                <h3 className="font-semibold text-white flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Settings Categories</span>
                </h3>
              </div>
              <motion.nav
                variants={sidebarVariants}
                initial="hidden"
                animate="visible"
                className="p-2"
              >
                {settingCategories.map((category, index) => {
                  const Icon = category.icon;
                  const isActive = activeTab === category.id;
                  const categorySettings = settings.filter(
                    (s) => s.category === category.id
                  );

                  return (
                    <motion.button
                      key={category.id}
                      variants={itemVariants}
                      whileHover={{ scale: 1.02, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab(category.id)}
                      className={`w-full text-left px-3 py-3 rounded-lg transition-colors mb-1 ${
                        isActive
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon
                          className={`h-5 w-5 ${isActive ? "text-blue-600" : "text-gray-400"}`}
                        />
                        <div className="flex-1">
                          <div
                            className={`text-sm font-medium ${isActive ? "text-blue-900" : "text-gray-900"}`}
                          >
                            {category.label}
                          </div>
                          <div
                            className={`text-xs ${isActive ? "text-blue-600" : "text-gray-500"}`}
                          >
                            {categorySettings.length} settings
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.nav>

              {/* Save Actions */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                {hasChanges() && (
                  <div className="mb-3 flex items-center space-x-2 text-amber-700 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>You have unsaved changes</span>
                  </div>
                )}
                <button
                  onClick={saveSettings}
                  disabled={isSaving || !hasChanges()}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    hasChanges() && !isSaving
                      ? getButtonClasses("primary")
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <div className="admin-card rounded-lg shadow">
              {/* Tab Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  {currentCategory && (
                    <currentCategory.icon className="h-6 w-6 text-blue-600" />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold admin-text">
                      {currentCategory?.label}
                    </h3>
                    <p className="text-sm admin-text-light mt-1">
                      {currentCategory?.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Settings List */}
              <div className="p-6">
                {filteredSettings.length === 0 ? (
                  <div className="text-center py-12">
                    <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchTerm
                        ? "No settings found"
                        : "No settings configured"}
                    </h3>
                    <p className="text-gray-500">
                      {searchTerm
                        ? "Try adjusting your search terms"
                        : "Settings for this category will appear here once loaded from the database"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredSettings.map((setting, index) => (
                      <motion.div
                        key={setting.id}
                        variants={settingCardVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.01, y: -2 }}
                        className="border border-gray-200 rounded-lg p-6"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                              <span>
                                {setting.key
                                  .replace(/_/g, " ")
                                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                              </span>
                              {setting.privilegeLevel >= 3 && (
                                <Lock
                                  className="h-4 w-4 text-red-500"
                                  title="Requires super admin privileges"
                                />
                              )}
                              {setting.privilegeLevel === 2 && (
                                <Shield
                                  className="h-4 w-4 text-orange-500"
                                  title="Requires admin privileges"
                                />
                              )}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {setting.description}
                            </p>
                          </div>
                          <div className="ml-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                setting.dataType === "boolean"
                                  ? "bg-green-100 text-green-800"
                                  : setting.dataType === "number"
                                    ? "bg-blue-100 text-blue-800"
                                    : setting.dataType === "json"
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {setting.dataType}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {renderSettingField(setting)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
