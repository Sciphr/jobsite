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
    
    // Check if workflow automation is enabled
    const workflowAutomationSetting = settings.find(s => s.key === 'enable_workflow_automation');
    const workflowAutomationEnabled = workflowAutomationSetting?.parsedValue === true || workflowAutomationSetting?.parsedValue === 'true';
    
    // Define automation settings that should be disabled when workflow automation is off
    const automationSettings = [
      'auto_archive_rejected_days',
      'auto_progress_delay_days', 
      'auto_reject_after_days'
    ];
    
    const isAutomationSetting = automationSettings.includes(key);
    const isDisabled = isAutomationSetting && !workflowAutomationEnabled;

    switch (dataType) {
      case "boolean":
        return (
          <div className={`flex items-center ${isDisabled ? 'opacity-50' : ''}`}>
            <input
              type="checkbox"
              checked={parsedValue === true || parsedValue === "true"}
              onChange={(e) => handleSettingChange(id, e.target.checked)}
              disabled={isDisabled}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="ml-2 text-sm admin-text">
              Enable this feature
            </span>
            {isDisabled && (
              <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                (Enable Workflow Automation to use this feature)
              </span>
            )}
          </div>
        );

      case "number":
        return (
          <div className={isDisabled ? 'opacity-50' : ''}>
            <input
              type="number"
              value={parsedValue}
              onChange={(e) => handleSettingChange(id, parseInt(e.target.value))}
              disabled={isDisabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 admin-text admin-card disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800"
              min="0"
            />
            {isDisabled && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Enable Workflow Automation to use this feature
              </p>
            )}
          </div>
        );

      case "json":
        return (
          <div className={isDisabled ? 'opacity-50' : ''}>
            <textarea
              value={JSON.stringify(parsedValue, null, 2)}
              onChange={(e) => {
                if (!isDisabled) {
                  try {
                    const jsonValue = JSON.parse(e.target.value);
                    handleSettingChange(id, jsonValue);
                  } catch (error) {
                    // Invalid JSON, don't update
                  }
                }
              }}
              disabled={isDisabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 resize-none font-mono text-sm admin-text admin-card disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800"
              rows={4}
              placeholder="Valid JSON format required"
            />
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center space-x-1 mt-1">
              <AlertTriangle className="h-3 w-3" />
              <span>{isDisabled ? "Enable Workflow Automation to use this feature" : "Ensure valid JSON format to prevent errors"}</span>
            </p>
          </div>
        );

      default: // string
        if (key.includes("email_signature")) {
          return (
            <div className={isDisabled ? 'opacity-50' : ''}>
              <textarea
                value={parsedValue.replace(/\\n/g, "\n")}
                onChange={(e) =>
                  !isDisabled && handleSettingChange(id, e.target.value.replace(/\n/g, "\\n"))
                }
                disabled={isDisabled}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 resize-none admin-text admin-card disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800"
                rows={3}
              />
              {isDisabled && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Enable Workflow Automation to use this feature
                </p>
              )}
            </div>
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
            <div className={isDisabled ? 'opacity-50' : ''}>
              <select
                value={parsedValue}
                onChange={(e) => !isDisabled && handleSettingChange(id, e.target.value)}
                disabled={isDisabled}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 admin-text admin-card disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800"
              >
                {options[key]?.map((option) => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() +
                      option.slice(1).replace(/[-_]/g, " ")}
                  </option>
                ))}
              </select>
              {isDisabled && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Enable Workflow Automation to use this feature
                </p>
              )}
            </div>
          );
        }

        return (
          <div className={isDisabled ? 'opacity-50' : ''}>
            <input
              type="text"
              value={parsedValue}
              onChange={(e) => !isDisabled && handleSettingChange(id, e.target.value)}
              disabled={isDisabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 admin-text admin-card disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800"
            />
            {isDisabled && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Enable Workflow Automation to use this feature
              </p>
            )}
          </div>
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

    // Custom sort to put workflow automation settings in logical order
    if (activeTab === "hiring_workflow") {
      const workflowSettingsOrder = [
        'enable_workflow_automation', // Master toggle first
        'auto_archive_rejected_days',
        'auto_progress_delay_days', 
        'auto_reject_after_days'
      ];
      
      filtered.sort((a, b) => {
        const aIndex = workflowSettingsOrder.indexOf(a.key);
        const bIndex = workflowSettingsOrder.indexOf(b.key);
        
        // If both settings are in our custom order, sort by that
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        
        // If only one is in custom order, put it first
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        
        // Otherwise, sort alphabetically by key
        return a.key.localeCompare(b.key);
      });
    }

    return filtered;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="lg:col-span-3 h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
          className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0"
        >
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold admin-text flex items-center space-x-2 md:space-x-3">
              <Settings className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
              <span>Hiring Settings</span>
            </h1>
            <p className="admin-text-light mt-2 text-sm md:text-base">
              Configure automation, workflows, and preferences for your hiring
              process
            </p>
          </div>
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
            <button
              onClick={() => resetCategory(activeTab)}
              disabled={isLoading}
              className="flex items-center justify-center space-x-2 px-3 py-2 md:px-4 md:py-2 border border-gray-300 dark:border-gray-600 rounded-lg admin-text hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reset Category</span>
            </button>
            <button
              onClick={() => router.push("/applications-manager")}
              className={`flex items-center justify-center space-x-2 px-3 py-2 md:px-4 md:py-2 rounded-lg transition-colors text-sm ${getButtonClasses("secondary")}`}
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
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300"
                : saveStatus.type === "info"
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300"
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
          <div className="relative max-w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 admin-text-light" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search settings..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-sm admin-text admin-card"
            />
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="admin-card rounded-lg shadow overflow-hidden lg:sticky lg:top-6">
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
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                          : "admin-text hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon
                          className={`h-5 w-5 ${isActive ? "text-blue-600 dark:text-blue-400" : "admin-text-light"}`}
                        />
                        <div className="flex-1">
                          <div
                            className={`text-sm font-medium ${isActive ? "text-blue-900 dark:text-blue-200" : "admin-text"}`}
                          >
                            {category.label}
                          </div>
                          <div
                            className={`text-xs ${isActive ? "text-blue-600 dark:text-blue-400" : "admin-text-light"}`}
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
              <div className="p-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                {hasChanges() && (
                  <div className="mb-3 flex items-center space-x-2 text-amber-700 dark:text-amber-400 text-sm">
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
                      : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
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
              <div className="p-6 border-b admin-border">
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
                    <Settings className="h-12 w-12 admin-text-light mx-auto mb-4" />
                    <h3 className="text-lg font-medium admin-text mb-2">
                      {searchTerm
                        ? "No settings found"
                        : "No settings configured"}
                    </h3>
                    <p className="admin-text-light">
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
                        className="border admin-border rounded-lg p-6 admin-card"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="font-medium admin-text flex items-center space-x-2">
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
                            <p className="text-sm admin-text-light mt-1">
                              {setting.description}
                            </p>
                          </div>
                          <div className="ml-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                setting.dataType === "boolean"
                                  ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300"
                                  : setting.dataType === "number"
                                    ? "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300"
                                    : setting.dataType === "json"
                                      ? "bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300"
                                      : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
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
