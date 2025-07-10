"use client";

import { useState, useEffect } from "react";
import { updateSettingGlobally } from "@/app/hooks/useSettings";
import { useSession } from "next-auth/react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import ThemeSelector from "./components/ThemeSelector";
import { useSettings, usePrefetchAdminData } from "@/app/hooks/useAdminData";
import WeeklyDigestTester, {
  WeeklyDigestButton,
} from "@/app/components/WeeklyDigestTester";
import {
  Settings,
  Save,
  RefreshCw,
  Shield,
  Briefcase,
  Bell,
  User,
  Database,
  Palette,
  Globe,
  Mail,
  DollarSign,
  Clock,
  FileText,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  Info,
  Server,
  Users,
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import WeeklyDigestSettings from "./components/WeeklyDigestSettings";

export default function AdminSettings() {
  const { data: session } = useSession();
  const { getButtonClasses } = useThemeClasses();
  const [saving, setSaving] = useState({});
  const [activeTab, setActiveTab] = useState("system");
  const [unsavedChanges, setUnsavedChanges] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({});

  const { prefetchAll } = usePrefetchAdminData();
  const { data: settingsData, isLoading, refetch } = useSettings();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (settingsData) {
      setSettings(settingsData.grouped || {});
      setLoading(false);
    }
  }, [settingsData]);

  const fetchSettings = async () => {
    await refetch();
  };

  const updateSetting = async (key, value, isPersonal = false) => {
    setSaving((prev) => ({ ...prev, [key]: true }));

    try {
      const response = await fetch(`/api/admin/settings/${key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value, isPersonal }),
      });

      if (response.ok) {
        const updatedSetting = await response.json();

        // Update local state
        setSettings((prev) => {
          const newSettings = { ...prev };
          const category = Object.keys(newSettings).find((cat) =>
            newSettings[cat].some((s) => s.key === key)
          );

          if (category) {
            newSettings[category] = newSettings[category].map((s) =>
              s.key === key
                ? {
                    ...s,
                    parsedValue: updatedSetting.parsedValue,
                    value: updatedSetting.value,
                  }
                : s
            );
          }

          return newSettings;
        });

        // Remove from unsaved changes
        setUnsavedChanges((prev) => {
          const newChanges = { ...prev };
          delete newChanges[key];
          return newChanges;
        });

        updateSettingGlobally(key, updatedSetting.parsedValue);

        // Show success status
        setSaveStatus((prev) => ({ ...prev, [key]: "success" }));
        setTimeout(() => {
          setSaveStatus((prev) => {
            const newStatus = { ...prev };
            delete newStatus[key];
            return newStatus;
          });
        }, 2000);
      }
    } catch (error) {
      console.error("Error updating setting:", error);
      setSaveStatus((prev) => ({ ...prev, [key]: "error" }));
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleSettingChange = (key, value, setting) => {
    // Track unsaved changes
    setUnsavedChanges((prev) => ({ ...prev, [key]: value }));

    // Update local display immediately
    setSettings((prev) => {
      const newSettings = { ...prev };
      const category = Object.keys(newSettings).find((cat) =>
        newSettings[cat].some((s) => s.key === key)
      );

      if (category) {
        newSettings[category] = newSettings[category].map((s) =>
          s.key === key ? { ...s, parsedValue: value } : s
        );
      }

      return newSettings;
    });
  };

  const testEmail = async () => {
    const email = prompt("Enter email address to test:");
    if (!email) return;

    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        alert("Test email sent successfully!");
      } else {
        alert(`Failed to send test email: ${result.message}`);
      }
    } catch (error) {
      alert("Error sending test email");
    }
  };

  const testConfiguration = async () => {
    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testType: "configuration" }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(
          `Configuration test successful!\nProvider: ${result.data?.provider}\nConnection: ${result.data?.connectionTest}`
        );
      } else {
        alert(`Configuration test failed: ${result.message}`);
      }
    } catch (error) {
      alert("Error testing configuration");
    }
  };

  const saveChanges = async (key, setting) => {
    if (unsavedChanges[key] !== undefined) {
      await updateSetting(key, unsavedChanges[key], setting.isPersonal);
    }
  };

  const toggleSection = (sectionId) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Function to organize notification settings into sections
  const organizeNotificationSettings = (notificationSettings) => {
    const sections = {
      smtp: {
        title: "SMTP Configuration",
        description: "Configure custom SMTP server settings for email delivery",
        icon: Server,
        color: "var(--admin-stat-1)",
        bgColor: "var(--admin-stat-1-bg)",
        borderColor: "var(--admin-stat-1-border)",
        settings: [],
      },
      emailNotifications: {
        title: "Email Notifications",
        description: "Control when email notifications are sent",
        icon: Mail,
        color: "var(--admin-stat-2)",
        bgColor: "var(--admin-stat-2-bg)",
        borderColor: "var(--admin-stat-2-border)",
        settings: [],
      },
      digestNotifications: {
        title: "Digest & Alerts",
        description: "Configure periodic summaries and threshold alerts",
        icon: Calendar,
        color: "var(--admin-stat-3)",
        bgColor: "var(--admin-stat-3-bg)",
        borderColor: "var(--admin-stat-3-border)",
        settings: [],
      },
      systemNotifications: {
        title: "System & Emergency",
        description: "Critical system notifications and rate limiting",
        icon: AlertCircle,
        color: "var(--admin-stat-4)",
        bgColor: "var(--admin-stat-4-bg)",
        borderColor: "var(--admin-stat-4-border)",
        settings: [],
      },
    };

    // Categorize settings
    notificationSettings.forEach((setting) => {
      if (setting.key.startsWith("smtp_")) {
        sections.smtp.settings.push(setting);
      } else if (
        setting.key.includes("email_") ||
        setting.key === "application_confirmation_email"
      ) {
        sections.emailNotifications.settings.push(setting);
      } else if (
        setting.key.includes("digest") ||
        setting.key.includes("low_application") ||
        setting.key === "notification_frequency_limit"
      ) {
        sections.digestNotifications.settings.push(setting);
      } else if (
        setting.key.includes("emergency") ||
        setting.key === "job_approval_required" ||
        setting.key === "notification_email"
      ) {
        sections.systemNotifications.settings.push(setting);
      } else {
        // Default to email notifications for any unmatched notification settings
        sections.emailNotifications.settings.push(setting);
      }
    });

    // Filter out empty sections
    return Object.entries(sections).filter(
      ([key, section]) => section.settings.length > 0
    );
  };

  const userPrivilegeLevel = session?.user?.privilegeLevel || 0;

  // Define tabs based on user privilege level with colors
  const tabs = [
    {
      id: "system",
      label: "System",
      icon: Database,
      minPrivilege: 3,
      description: "Core system configuration",
      color: "text-red-600",
      bgColor: "bg-red-100",
      borderColor: "border-red-200",
      hoverColor: "hover:bg-red-50",
    },
    {
      id: "jobs",
      label: "Jobs & Applications",
      icon: Briefcase,
      minPrivilege: 2,
      description: "Job posting and application settings",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      borderColor: "border-blue-200",
      hoverColor: "hover:bg-blue-50",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      minPrivilege: 1,
      description: "Email and notification preferences",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      borderColor: "border-yellow-200",
      hoverColor: "hover:bg-yellow-50",
    },
    {
      id: "personal",
      label: "Personal",
      icon: User,
      minPrivilege: 0,
      description: "Your personal preferences",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      borderColor: "border-purple-200",
      hoverColor: "hover:bg-purple-50",
    },
  ].filter((tab) => userPrivilegeLevel >= tab.minPrivilege);

  // Set initial tab to first available tab
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find((t) => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs]);

  const renderSettingInput = (setting) => {
    const { key, parsedValue, dataType, description, canEdit } = setting;
    const hasUnsavedChanges = unsavedChanges[key] !== undefined;
    const isSaving = saving[key];
    const status = saveStatus[key];

    if (!canEdit) {
      return (
        <div className="flex items-center space-x-2 admin-text-light">
          <Shield className="h-4 w-4" />
          <span className="text-sm">Insufficient privileges</span>
        </div>
      );
    }

    const renderInput = () => {
      switch (dataType) {
        case "boolean":
          return (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleSettingChange(key, !parsedValue, setting)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  parsedValue ? "bg-blue-600" : "bg-gray-300"
                }`}
                disabled={!canEdit}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    parsedValue ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm admin-text-light">
                {parsedValue ? "Enabled" : "Disabled"}
              </span>
            </div>
          );

        case "number":
          return (
            <input
              type="number"
              value={parsedValue}
              onChange={(e) =>
                handleSettingChange(key, parseInt(e.target.value), setting)
              }
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text placeholder-gray-600"
              disabled={!canEdit}
            />
          );

        case "json":
          // Special handling for allowed_resume_types
          if (key === "allowed_resume_types") {
            const types = Array.isArray(parsedValue)
              ? parsedValue
              : ["pdf", "doc", "docx"];

            return (
              <div className="space-y-3">
                <div className="text-sm admin-text-light mb-2">
                  Select allowed file types for resume uploads:
                </div>
                <div className="space-y-2">
                  {["pdf", "doc", "docx", "txt", "rtf"].map((type) => (
                    <label key={type} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={types.includes(type)}
                        onChange={(e) => {
                          const updatedTypes = e.target.checked
                            ? [...types, type]
                            : types.filter((t) => t !== type);
                          handleSettingChange(key, updatedTypes, setting);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={!canEdit}
                      />
                      <span className="text-sm admin-text uppercase">
                        {type}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="text-xs admin-text-light">
                  Selected types: {types.join(", ").toUpperCase()}
                </div>
              </div>
            );
          }

          // Default JSON handling for other settings
          return (
            <textarea
              value={JSON.stringify(parsedValue, null, 2)}
              onChange={(e) => {
                try {
                  const jsonValue = JSON.parse(e.target.value);
                  handleSettingChange(key, jsonValue, setting);
                } catch (error) {
                  // Invalid JSON, don't update
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm admin-text placeholder-gray-600 dark:placeholder-gray-400 bg-white dark:bg-gray-700"
              rows={4}
              disabled={!canEdit}
              placeholder="Enter valid JSON..."
            />
          );

        default: // string
          if (key.includes("currency")) {
            return (
              <select
                value={parsedValue}
                onChange={(e) =>
                  handleSettingChange(key, e.target.value, setting)
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text"
                disabled={!canEdit}
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="AUD">AUD - Australian Dollar</option>
                <option value="JPY">JPY - Japanese Yen</option>
              </select>
            );
          }

          return (
            <input
              type="text"
              value={parsedValue}
              onChange={(e) =>
                handleSettingChange(key, e.target.value, setting)
              }
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text placeholder-gray-600 dark:placeholder-gray-400 bg-white dark:bg-gray-700"
              disabled={!canEdit}
              placeholder="Enter value..."
            />
          );
      }
    };

    return (
      <div className="flex items-center space-x-3">
        <div className="flex-1">{renderInput()}</div>

        {/* Save button and status */}
        {hasUnsavedChanges && (
          <button
            onClick={() => saveChanges(key, setting)}
            disabled={isSaving}
            className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm transition-colors duration-200 ${getButtonClasses("primary")} ${isSaving ? "opacity-50" : ""}`}
          >
            {isSaving ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            <span>Save</span>
          </button>
        )}

        {/* Status indicator */}
        {status === "success" && (
          <div className="flex items-center space-x-1 text-green-600">
            <Check className="h-4 w-4" />
            <span className="text-sm">Saved</span>
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center space-x-1 text-red-600">
            <X className="h-4 w-4" />
            <span className="text-sm">Error</span>
          </div>
        )}
      </div>
    );
  };

  const getSettingIcon = (key) => {
    if (key.includes("currency") || key.includes("salary")) return DollarSign;
    if (key.includes("email") || key.includes("notification")) return Mail;
    if (key.includes("time") || key.includes("expiration")) return Clock;
    if (key.includes("show") || key.includes("visible")) return Eye;
    if (key.includes("file") || key.includes("resume")) return FileText;
    if (key.includes("site") || key.includes("name")) return Globe;
    if (key.includes("smtp")) return Server;
    return Settings;
  };

  const renderSection = (sectionId, section) => {
    const isCollapsed = collapsedSections[sectionId];
    const SectionIcon = section.icon;

    return (
      <div
        key={sectionId}
        className="border rounded-lg overflow-hidden"
        style={{ borderColor: section.borderColor }}
      >
        {/* Section Header */}
        <button
          onClick={() => toggleSection(sectionId)}
          className="w-full px-4 py-3 flex items-center justify-between transition-colors duration-200 hover:opacity-80"
          style={{ backgroundColor: section.bgColor }}
        >
          <div className="flex items-center space-x-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: section.bgColor }}
            >
              <SectionIcon
                className="h-4 w-4"
                style={{ color: section.color }}
              />
            </div>
            <div className="text-left">
              <h3
                className="text-sm font-semibold"
                style={{ color: section.color }}
              >
                {section.title}
              </h3>
              <p className="text-xs admin-text-light">{section.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span
              className="text-xs px-2 py-1 rounded-full"
              style={{
                backgroundColor: section.color,
                color: "white",
              }}
            >
              {section.settings.length} setting
              {section.settings.length !== 1 ? "s" : ""}
            </span>
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 admin-text-light" />
            ) : (
              <ChevronDown className="h-4 w-4 admin-text-light" />
            )}
          </div>
        </button>

        {/* Section Content */}
        {!isCollapsed && (
          <div className="p-4 space-y-4 bg-white dark:bg-gray-800">
            {section.settings.map((setting, index) => {
              const SettingIcon = getSettingIcon(setting.key);

              return (
                <div
                  key={setting.key}
                  className="setting-card flex items-start space-x-4 p-3 border rounded-lg transition-all duration-200 hover:shadow-sm"
                  style={{ borderColor: section.borderColor }}
                >
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: section.bgColor }}
                  >
                    <SettingIcon
                      className="h-4 w-4"
                      style={{ color: section.color }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-sm font-medium admin-text">
                          {setting.key
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </h3>
                        {setting.description && (
                          <p className="text-sm admin-text-light mt-1">
                            {setting.description}
                          </p>
                        )}
                      </div>

                      {setting.isPersonal && (
                        <span
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: "var(--admin-stat-5)" }}
                        >
                          Personal
                        </span>
                      )}
                    </div>

                    {renderSettingInput(setting)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="admin-card rounded-lg shadow p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeTabData = tabs.find((t) => t.id === activeTab);
  const activeSettings = settings[activeTab] || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold admin-text">Settings</h1>
          <p className="admin-text-light mt-2">
            Configure system preferences and personal settings
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchSettings}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 admin-text bg-white dark:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  isActive
                    ? "border-blue-500"
                    : "border-transparent admin-text-light hover:admin-text hover:border-gray-300"
                }`}
                style={{
                  color: isActive
                    ? tab.id === "system"
                      ? "var(--admin-stat-4)"
                      : tab.id === "jobs"
                        ? "var(--admin-stat-1)"
                        : tab.id === "notifications"
                          ? "var(--admin-stat-3)"
                          : "var(--admin-stat-5)"
                    : undefined,
                  borderBottomColor: isActive
                    ? tab.id === "system"
                      ? "var(--admin-stat-4)"
                      : tab.id === "jobs"
                        ? "var(--admin-stat-1)"
                        : tab.id === "notifications"
                          ? "var(--admin-stat-3)"
                          : "var(--admin-stat-5)"
                    : undefined,
                }}
              >
                <Icon
                  className={`h-4 w-4 transition-colors duration-200`}
                  style={{
                    color: isActive
                      ? tab.id === "system"
                        ? "var(--admin-stat-4)"
                        : tab.id === "jobs"
                          ? "var(--admin-stat-1)"
                          : tab.id === "notifications"
                            ? "var(--admin-stat-3)"
                            : "var(--admin-stat-5)"
                      : undefined,
                  }}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="admin-card rounded-lg shadow">
        {/* Tab Header with theme-aware colored styling */}
        <div
          className={`px-6 py-4 border-b admin-text-light`}
          style={{
            backgroundColor:
              activeTabData?.bgColor === "bg-red-100"
                ? "var(--admin-stat-4-bg)"
                : activeTabData?.bgColor === "bg-blue-100"
                  ? "var(--admin-stat-1-bg)"
                  : activeTabData?.bgColor === "bg-yellow-100"
                    ? "var(--admin-stat-3-bg)"
                    : activeTabData?.bgColor === "bg-purple-100"
                      ? "var(--admin-stat-5-bg)"
                      : "var(--admin-stat-1-bg)",
            borderLeftWidth: "4px",
            borderLeftColor:
              activeTabData?.bgColor === "bg-red-100"
                ? "var(--admin-stat-4)"
                : activeTabData?.bgColor === "bg-blue-100"
                  ? "var(--admin-stat-1)"
                  : activeTabData?.bgColor === "bg-yellow-100"
                    ? "var(--admin-stat-3)"
                    : activeTabData?.bgColor === "bg-purple-100"
                      ? "var(--admin-stat-5)"
                      : "var(--admin-stat-1)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {activeTabData && (
                <>
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      backgroundColor:
                        activeTabData?.bgColor === "bg-red-100"
                          ? "var(--admin-stat-4-bg)"
                          : activeTabData?.bgColor === "bg-blue-100"
                            ? "var(--admin-stat-1-bg)"
                            : activeTabData?.bgColor === "bg-yellow-100"
                              ? "var(--admin-stat-3-bg)"
                              : activeTabData?.bgColor === "bg-purple-100"
                                ? "var(--admin-stat-5-bg)"
                                : "var(--admin-stat-1-bg)",
                    }}
                  >
                    <activeTabData.icon
                      className="h-5 w-5"
                      style={{
                        color:
                          activeTabData?.bgColor === "bg-red-100"
                            ? "var(--admin-stat-4)"
                            : activeTabData?.bgColor === "bg-blue-100"
                              ? "var(--admin-stat-1)"
                              : activeTabData?.bgColor === "bg-yellow-100"
                                ? "var(--admin-stat-3)"
                                : activeTabData?.bgColor === "bg-purple-100"
                                  ? "var(--admin-stat-5)"
                                  : "var(--admin-stat-1)",
                      }}
                    />
                  </div>
                  <div>
                    <h2
                      className="text-lg font-semibold"
                      style={{
                        color:
                          activeTabData?.bgColor === "bg-red-100"
                            ? "var(--admin-stat-4)"
                            : activeTabData?.bgColor === "bg-blue-100"
                              ? "var(--admin-stat-1)"
                              : activeTabData?.bgColor === "bg-yellow-100"
                                ? "var(--admin-stat-3)"
                                : activeTabData?.bgColor === "bg-purple-100"
                                  ? "var(--admin-stat-5)"
                                  : "var(--admin-stat-1)",
                      }}
                    >
                      {activeTabData.label}
                    </h2>
                    <p className="text-sm admin-text-light">
                      {activeTabData.description}
                    </p>
                  </div>
                </>
              )}
            </div>

            {activeTab === "notifications" && (
              <div className="flex space-x-2">
                <button
                  onClick={testConfiguration}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${getButtonClasses("primary")}`}
                >
                  <Settings className="h-4 w-4" />
                  <span>Test Config</span>
                </button>
                <button
                  onClick={testEmail}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${getButtonClasses("success")}`}
                >
                  <Mail className="h-4 w-4" />
                  <span>Test Email</span>
                </button>
                <WeeklyDigestButton getButtonClasses={getButtonClasses} />
              </div>
            )}
          </div>
        </div>

        {/* Settings List */}
        <div className="p-6">
          {/* Special handling for Personal tab - show theme selector */}
          {activeTab === "personal" ? (
            <div className="space-y-6">
              <ThemeSelector />

              {/* Show other personal settings if any (excluding theme setting to avoid duplicates) */}
              {activeSettings.filter(
                (setting) =>
                  setting.key !== "admin_dashboard_theme" &&
                  setting.key !== "enable_dashboard_animations"
              ).length > 0 && (
                <>
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-medium admin-text mb-4">
                      Other Personal Settings
                    </h3>
                  </div>
                  {activeSettings
                    .filter(
                      (setting) =>
                        setting.key !== "admin_dashboard_theme" &&
                        setting.key !== "enable_dashboard_animations"
                    )
                    .map((setting, index) => {
                      const SettingIcon = getSettingIcon(setting.key);
                      const settingColorIndex = index % 4; // Cycle through 0-3 for theme colors

                      return (
                        <div
                          key={setting.key}
                          className="setting-card flex items-start space-x-4 p-4 border rounded-lg transition-all duration-200 hover:shadow-sm"
                          style={{
                            borderColor:
                              settingColorIndex === 0
                                ? "var(--admin-stat-1-border)"
                                : settingColorIndex === 1
                                  ? "var(--admin-stat-2-border)"
                                  : settingColorIndex === 2
                                    ? "var(--admin-stat-3-border)"
                                    : "var(--admin-stat-4-border)",
                          }}
                        >
                          <div
                            className="p-2 rounded-lg"
                            style={{
                              backgroundColor:
                                settingColorIndex === 0
                                  ? "var(--admin-stat-1-bg)"
                                  : settingColorIndex === 1
                                    ? "var(--admin-stat-2-bg)"
                                    : settingColorIndex === 2
                                      ? "var(--admin-stat-3-bg)"
                                      : "var(--admin-stat-4-bg)",
                            }}
                          >
                            <SettingIcon
                              className="h-4 w-4"
                              style={{
                                color:
                                  settingColorIndex === 0
                                    ? "var(--admin-stat-1)"
                                    : settingColorIndex === 1
                                      ? "var(--admin-stat-2)"
                                      : settingColorIndex === 2
                                        ? "var(--admin-stat-3)"
                                        : "var(--admin-stat-4)",
                              }}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h3 className="text-sm font-medium admin-text">
                                  {setting.key
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                </h3>
                                {setting.description && (
                                  <p className="text-sm admin-text-light mt-1">
                                    {setting.description}
                                  </p>
                                )}
                              </div>

                              {setting.isPersonal && (
                                <span
                                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white"
                                  style={{
                                    backgroundColor: "var(--admin-stat-5)",
                                  }}
                                >
                                  Personal
                                </span>
                              )}
                            </div>

                            {renderSettingInput(setting)}
                          </div>
                        </div>
                      );
                    })}
                </>
              )}
            </div>
          ) : activeTab === "notifications" ? (
            <div className="space-y-6">
              {organizeNotificationSettings(activeSettings).map(
                ([sectionId, section]) => renderSection(sectionId, section)
              )}
              <WeeklyDigestSettings />
            </div>
          ) : activeSettings.length > 0 ? (
            <div className="space-y-6">
              {activeSettings.map((setting, index) => {
                const SettingIcon = getSettingIcon(setting.key);
                const settingColorIndex = index % 4; // Cycle through 0-3 for theme colors

                return (
                  <div
                    key={setting.key}
                    className="setting-card flex items-start space-x-4 p-4 border rounded-lg transition-all duration-200 hover:shadow-sm"
                    style={{
                      borderColor:
                        settingColorIndex === 0
                          ? "var(--admin-stat-1-border)"
                          : settingColorIndex === 1
                            ? "var(--admin-stat-2-border)"
                            : settingColorIndex === 2
                              ? "var(--admin-stat-3-border)"
                              : "var(--admin-stat-4-border)",
                    }}
                  >
                    <div
                      className="p-2 rounded-lg"
                      style={{
                        backgroundColor:
                          settingColorIndex === 0
                            ? "var(--admin-stat-1-bg)"
                            : settingColorIndex === 1
                              ? "var(--admin-stat-2-bg)"
                              : settingColorIndex === 2
                                ? "var(--admin-stat-3-bg)"
                                : "var(--admin-stat-4-bg)",
                      }}
                    >
                      <SettingIcon
                        className="h-4 w-4"
                        style={{
                          color:
                            settingColorIndex === 0
                              ? "var(--admin-stat-1)"
                              : settingColorIndex === 1
                                ? "var(--admin-stat-2)"
                                : settingColorIndex === 2
                                  ? "var(--admin-stat-3)"
                                  : "var(--admin-stat-4)",
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-sm font-medium admin-text">
                            {setting.key
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </h3>
                          {setting.description && (
                            <p className="text-sm admin-text-light mt-1">
                              {setting.description}
                            </p>
                          )}
                        </div>

                        {setting.isPersonal && (
                          <span
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white"
                            style={{ backgroundColor: "var(--admin-stat-5)" }}
                          >
                            Personal
                          </span>
                        )}
                      </div>

                      {renderSettingInput(setting)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium admin-text mb-2">
                No settings found
              </h3>
              <p className="admin-text-light">
                No settings are available for this category at your privilege
                level.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {Object.keys(unsavedChanges).length > 0 && (
        <div className="fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg max-w-sm">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                You have {Object.keys(unsavedChanges).length} unsaved change
                {Object.keys(unsavedChanges).length !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Click the Save button next to each setting to apply changes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
