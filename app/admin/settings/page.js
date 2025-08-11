"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { updateSettingGlobally } from "@/app/hooks/useSettings";
import { useSession } from "next-auth/react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import ThemeSelector from "./components/ThemeSelector";
import CalendarIntegration from "./components/CalendarIntegration";
import ZoomIntegration from "./components/ZoomIntegration";
import MicrosoftIntegration from "./components/MicrosoftIntegration";
import LDAPIntegration from "./components/LDAPIntegration";
import SAMLIntegration from "./components/SAMLIntegration";
import LocalAuthSettings from "./components/LocalAuthSettings";
import LogoUpload from "./components/LogoUpload";
import FaviconUpload from "./components/FaviconUpload";
import SiteThemeSelector from "./components/SiteThemeSelector";
import { useSettings, usePrefetchAdminData, useAutoArchive, useAutoArchivePreview } from "@/app/hooks/useAdminData";
import WeeklyDigestTester, {
  WeeklyDigestButton,
} from "@/app/components/WeeklyDigestTester";
import APIKeyManagement from "./components/APIKeyManagement";
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
  Archive,
  Code,
} from "lucide-react";

export default function AdminSettings() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // Auto-archive functionality
  const { mutate: autoArchive, isLoading: autoArchiving } = useAutoArchive();
  const { data: autoArchivePreview } = useAutoArchivePreview();

  // Function to change tab and update URL
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('tab', tabId);
    router.push(newUrl.pathname + newUrl.search, { scroll: false });
  };

  // Handle URL parameters for tab state and session refresh
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['system', 'branding', 'personal', 'notifications', 'developer'].includes(tab)) {
      setActiveTab(tab);
    }

    // Check if we need to refresh the session after OAuth callback
    const shouldRefreshSession = searchParams.get('refresh_session');
    if (shouldRefreshSession === 'true') {
      // Use NextAuth's update method to refresh the session
      update().then(() => {
        // Clean up the URL by removing the refresh_session parameter
        const newUrl = new URL(window.location);
        newUrl.searchParams.delete('refresh_session');
        router.replace(newUrl.pathname + newUrl.search, { scroll: false });
      });
    }
  }, [searchParams, update, router]);

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

  const handleAutoArchive = () => {
    if (!autoArchivePreview?.count || autoArchivePreview.count === 0) {
      alert('No applications found for auto-archiving');
      return;
    }

    const confirmMessage = `Are you sure you want to auto-archive ${autoArchivePreview.count} rejected applications older than ${autoArchivePreview.daysThreshold} days?`;
    
    if (confirm(confirmMessage)) {
      autoArchive(undefined, {
        onSuccess: (data) => {
          alert(data.message);
        },
        onError: (error) => {
          alert(`Error: ${error.message}`);
        },
      });
    }
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

  const saveAllChanges = async () => {
    const changedKeys = Object.keys(unsavedChanges);
    if (changedKeys.length === 0) return;

    setSaving((prev) => {
      const newSaving = { ...prev };
      changedKeys.forEach(key => { newSaving[key] = true; });
      return newSaving;
    });

    try {
      // Find all settings that have changes
      const allSettings = Object.values(settings).flat();
      const settingsToSave = changedKeys.map(key => ({
        key,
        value: unsavedChanges[key],
        setting: allSettings.find(s => s.key === key)
      }));

      // Save all settings in parallel
      const savePromises = settingsToSave.map(({ key, value, setting }) =>
        fetch(`/api/admin/settings/${key}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value, isPersonal: setting?.isPersonal || false }),
        })
      );

      const responses = await Promise.all(savePromises);
      const results = await Promise.all(responses.map(r => r.json()));

      // Update local state for successful saves
      const successfulSaves = [];
      responses.forEach((response, index) => {
        const { key, setting } = settingsToSave[index];
        
        if (response.ok) {
          const updatedSetting = results[index];
          successfulSaves.push(key);

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

          updateSettingGlobally(key, updatedSetting.parsedValue);
          
          // Show success status
          setSaveStatus((prev) => ({ ...prev, [key]: "success" }));
        } else {
          setSaveStatus((prev) => ({ ...prev, [key]: "error" }));
        }
      });

      // Remove successful saves from unsaved changes
      if (successfulSaves.length > 0) {
        setUnsavedChanges((prev) => {
          const newChanges = { ...prev };
          successfulSaves.forEach(key => delete newChanges[key]);
          return newChanges;
        });
      }

      // Clear status indicators after 2 seconds
      setTimeout(() => {
        setSaveStatus((prev) => {
          const newStatus = { ...prev };
          changedKeys.forEach(key => delete newStatus[key]);
          return newStatus;
        });
      }, 2000);

    } catch (error) {
      console.error("Error saving all changes:", error);
      // Set error status for all changed keys
      setSaveStatus((prev) => {
        const newStatus = { ...prev };
        changedKeys.forEach(key => { newStatus[key] = "error"; });
        return newStatus;
      });
    } finally {
      setSaving((prev) => {
        const newSaving = { ...prev };
        changedKeys.forEach(key => { newSaving[key] = false; });
        return newSaving;
      });
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
      id: "authentication",
      label: "Authentication",
      icon: Shield,
      minPrivilege: 3,
      description: "User authentication and security settings",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      borderColor: "border-purple-200",
      hoverColor: "hover:bg-purple-50",
    },
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
      id: "branding",
      label: "Branding",
      icon: Palette,
      minPrivilege: 2,
      description: "Site branding and appearance",
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
      borderColor: "border-emerald-200",
      hoverColor: "hover:bg-emerald-50",
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
      id: "developer",
      label: "Developer",
      icon: Code,
      minPrivilege: 3,
      description: "API keys and integrations",
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
      borderColor: "border-indigo-200",
      hoverColor: "hover:bg-indigo-50",
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

  // Set initial tab to first available tab (only if no tab is in URL and current tab is invalid)
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (tabs.length > 0 && !tabs.find((t) => t.id === activeTab) && !urlTab) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab, searchParams]);

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
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold admin-text">Settings</h1>
          <p className="admin-text-light mt-2 text-sm sm:text-base">
            Configure system preferences and personal settings
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {Object.keys(unsavedChanges).length > 0 && (
            <button
              onClick={saveAllChanges}
              disabled={Object.keys(unsavedChanges).length === 0 || Object.values(saving).some(Boolean)}
              className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${getButtonClasses("primary")} ${
                Object.values(saving).some(Boolean) ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {Object.values(saving).some(Boolean) ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                Save All Changes ({Object.keys(unsavedChanges).length})
              </span>
              <span className="sm:hidden">
                Save All ({Object.keys(unsavedChanges).length})
              </span>
            </button>
          )}
          <button
            onClick={fetchSettings}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 admin-text bg-white dark:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex overflow-x-auto space-x-2 sm:space-x-8 pb-2 sm:pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`group inline-flex items-center space-x-2 py-4 px-2 sm:px-1 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
                  isActive
                    ? "border-blue-500"
                    : "border-transparent admin-text-light hover:admin-text hover:border-gray-300"
                }`}
                style={{
                  color: isActive
                    ? tab.id === "system"
                      ? "var(--admin-stat-4)"
                      : tab.id === "branding"
                        ? "var(--admin-stat-2)"
                        : tab.id === "jobs"
                          ? "var(--admin-stat-1)"
                          : tab.id === "developer"
                            ? "var(--admin-stat-1)"
                            : tab.id === "notifications"
                              ? "var(--admin-stat-3)"
                              : "var(--admin-stat-5)"
                    : undefined,
                  borderBottomColor: isActive
                    ? tab.id === "system"
                      ? "var(--admin-stat-4)"
                      : tab.id === "branding"
                        ? "var(--admin-stat-2)"
                        : tab.id === "jobs"
                          ? "var(--admin-stat-1)"
                          : tab.id === "developer"
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
                        : tab.id === "branding"
                          ? "var(--admin-stat-2)"
                          : tab.id === "jobs"
                            ? "var(--admin-stat-1)"
                            : tab.id === "developer"
                              ? "var(--admin-stat-1)"
                              : tab.id === "notifications"
                                ? "var(--admin-stat-3)"
                                : "var(--admin-stat-5)"
                      : undefined,
                  }}
                />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
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
                : activeTabData?.bgColor === "bg-emerald-100"
                  ? "var(--admin-stat-2-bg)"
                  : activeTabData?.bgColor === "bg-blue-100"
                    ? "var(--admin-stat-1-bg)"
                    : activeTabData?.bgColor === "bg-indigo-100"
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
                : activeTabData?.bgColor === "bg-emerald-100"
                  ? "var(--admin-stat-2)"
                  : activeTabData?.bgColor === "bg-blue-100"
                    ? "var(--admin-stat-1)"
                    : activeTabData?.bgColor === "bg-indigo-100"
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
                          : activeTabData?.bgColor === "bg-emerald-100"
                            ? "var(--admin-stat-2-bg)"
                            : activeTabData?.bgColor === "bg-blue-100"
                              ? "var(--admin-stat-1-bg)"
                              : activeTabData?.bgColor === "bg-indigo-100"
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
                            : activeTabData?.bgColor === "bg-emerald-100"
                              ? "var(--admin-stat-2)"
                              : activeTabData?.bgColor === "bg-blue-100"
                                ? "var(--admin-stat-1)"
                                : activeTabData?.bgColor === "bg-indigo-100"
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
                            : activeTabData?.bgColor === "bg-emerald-100"
                              ? "var(--admin-stat-2)"
                              : activeTabData?.bgColor === "bg-blue-100"
                                ? "var(--admin-stat-1)"
                                : activeTabData?.bgColor === "bg-indigo-100"
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
          {/* Special handling for Authentication tab */}
          {activeTab === "authentication" ? (
            <div className="space-y-8">
              {/* Local Authentication Container */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-800/30 px-6 py-4 rounded-t-xl border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-500 rounded-lg">
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Local Authentication</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300">Traditional username and password authentication</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <LocalAuthSettings />
                </div>
              </div>

              {/* LDAP Authentication Container */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 px-6 py-4 rounded-t-xl border-b border-blue-200 dark:border-blue-700">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">LDAP Directory Authentication</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Connect to your organization's LDAP directory for user authentication</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <LDAPIntegration />
                </div>
              </div>

              {/* SAML SSO Container */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-green-200 dark:border-green-800 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 px-6 py-4 rounded-t-xl border-b border-green-200 dark:border-green-700">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">SAML Single Sign-On</h3>
                      <p className="text-sm text-green-700 dark:text-green-300">Enable web-based SSO with your Identity Provider (Okta, Azure AD, Google)</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <SAMLIntegration />
                </div>
              </div>
            </div>
          ) : /* Special handling for Developer tab - show API key management */
          activeTab === "developer" ? (
            <div className="space-y-6">
              <APIKeyManagement getButtonClasses={getButtonClasses} />
            </div>
          ) : /* Special handling for Personal tab - show theme selector and calendar integration */
          activeTab === "personal" ? (
            <div className="space-y-6">
              <ThemeSelector />
              
              {/* Integrations Section */}
              <div>
                <h3 className="text-lg font-semibold admin-text mb-4">
                  Calendar & Meeting Integrations
                </h3>
                <p className="text-sm admin-text-light mb-6">
                  Connect your calendar and meeting platforms to enable seamless interview scheduling
                </p>
                
                {/* Three integrations side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <CalendarIntegration />
                  <ZoomIntegration />
                  <MicrosoftIntegration />
                </div>
              </div>


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
          ) : activeTab === "branding" ? (
            <div className="space-y-6">
              {/* Logo and Favicon Side by Side */}
              <div>
                <h3 className="text-lg font-semibold admin-text mb-4">Brand Assets</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <LogoUpload getButtonClasses={getButtonClasses} compact={true} />
                  <FaviconUpload getButtonClasses={getButtonClasses} compact={true} />
                </div>
                
                {/* Shared Guidelines */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Brand Asset Guidelines</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-blue-800">
                    <div>
                      <h5 className="font-medium mb-1">Logo Guidelines:</h5>
                      <ul className="space-y-1">
                        <li>• Keep it square (1:1 aspect ratio) for best results</li>
                        <li>• Use high contrast colors for better visibility</li>
                        <li>• SVG format is recommended for crisp scaling</li>
                        <li>• Maximum file size: 5MB</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium mb-1">Favicon Guidelines:</h5>
                      <ul className="space-y-1">
                        <li>• ICO format supports multiple sizes (16x16, 32x32, 48x48)</li>
                        <li>• PNG format should be 32x32px for best results</li>
                        <li>• Use simple, recognizable shapes for small sizes</li>
                        <li>• Maximum file size: 1MB</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-6">
                <SiteThemeSelector getButtonClasses={getButtonClasses} />
              </div>
              
              {/* Other branding settings if any exist */}
              {activeSettings.length > 0 && (
                <>
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-medium admin-text mb-4">
                      Other Branding Settings
                    </h3>
                  </div>
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
            </div>
          ) : activeSettings.filter(setting => !setting.key.startsWith('ldap_') && !setting.key.startsWith('saml_')).length > 0 ? (
            <div className="space-y-6">
              {activeSettings.filter(setting => 
                // Filter out LDAP and SAML settings from regular display since they have their own components
                !setting.key.startsWith('ldap_') && !setting.key.startsWith('saml_')
              ).map((setting, index) => {
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


          {/* Auto-Archive Management Section */}
          {activeTab === "system" && autoArchivePreview && (
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <div className="setting-card flex items-start space-x-4 p-6 border rounded-lg transition-all duration-200 hover:shadow-sm"
                style={{
                  borderColor: "var(--admin-stat-4-border)",
                }}
              >
                <div
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: "var(--admin-stat-4-bg)",
                  }}
                >
                  <Archive
                    className="h-5 w-5"
                    style={{
                      color: "var(--admin-stat-4)",
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-medium admin-text">
                        Auto-Archive Management
                      </h3>
                      <p className="text-sm admin-text-light mt-1">
                        Manually trigger auto-archiving of rejected applications
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold admin-text">
                        {autoArchivePreview.count || 0}
                      </div>
                      <div className="text-xs admin-text-light">
                        Applications Ready
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold admin-text text-orange-600">
                        {autoArchivePreview.daysThreshold || 0}
                      </div>
                      <div className="text-xs admin-text-light">
                        Days Threshold
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleAutoArchive}
                      disabled={autoArchiving || !autoArchivePreview?.count || autoArchivePreview.count === 0}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        autoArchiving || !autoArchivePreview?.count || autoArchivePreview.count === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                      }`}
                    >
                      {autoArchiving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Archive className="h-4 w-4" />
                          <span>Run Auto-Archive Now</span>
                        </>
                      )}
                    </button>

                    <span className="text-sm admin-text-light">
                      {autoArchivePreview.count > 0 
                        ? `${autoArchivePreview.count} rejected applications older than ${autoArchivePreview.daysThreshold} days`
                        : `No rejected applications older than ${autoArchivePreview.daysThreshold || 0} days found`
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Save All Button */}
        {Object.keys(unsavedChanges).length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span>
                  {Object.keys(unsavedChanges).length} unsaved change
                  {Object.keys(unsavedChanges).length !== 1 ? "s" : ""}
                </span>
              </div>
              <button
                onClick={saveAllChanges}
                disabled={Object.keys(unsavedChanges).length === 0 || Object.values(saving).some(Boolean)}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors duration-200 ${getButtonClasses("primary")} ${
                  Object.values(saving).some(Boolean) ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {Object.values(saving).some(Boolean) ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Save All Changes</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Unsaved Changes Warning - Fixed positioning to not block bottom content */}
      {Object.keys(unsavedChanges).length > 0 && (
        <div className="fixed bottom-4 left-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg max-w-sm z-50">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                {Object.keys(unsavedChanges).length} unsaved change
                {Object.keys(unsavedChanges).length !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Use "Save All Changes" button or save individually.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
