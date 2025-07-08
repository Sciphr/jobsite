"use client";

import { useState, useEffect, useRef } from "react";
import { updateSettingGlobally } from "@/app/hooks/useSettings";
import { useSession } from "next-auth/react";
import { gsap } from "gsap";
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
} from "lucide-react";

export default function AdminSettings() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [activeTab, setActiveTab] = useState("system");
  const [unsavedChanges, setUnsavedChanges] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  // Refs for GSAP animations
  const headerRef = useRef(null);
  const tabsRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    setAnimationsEnabled(!prefersReducedMotion);

    fetchSettings();
  }, []);

  useEffect(() => {
    if (!loading && animationsEnabled) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        animatePageLoad();
      }, 50);
    }
  }, [loading, animationsEnabled]);

  const animatePageLoad = () => {
    // Hide elements immediately
    const elementsToAnimate = [
      headerRef.current,
      tabsRef.current,
      contentRef.current,
    ].filter(Boolean);

    gsap.set(elementsToAnimate, {
      opacity: 0,
      y: 30,
    });

    // Start the animation timeline
    const tl = gsap.timeline();

    // Header animation
    if (headerRef.current) {
      tl.to(headerRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out",
      });
    }

    // Tabs animation
    if (tabsRef.current) {
      tl.to(
        tabsRef.current,
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out",
        },
        "-=0.3"
      );
    }

    // Content animation
    if (contentRef.current) {
      tl.to(
        contentRef.current,
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out",
        },
        "-=0.3"
      );

      // Animate individual setting cards
      const settingCards = contentRef.current.querySelectorAll(".setting-card");
      if (settingCards.length > 0) {
        tl.fromTo(
          settingCards,
          {
            opacity: 0,
            y: 20,
            scale: 0.95,
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
            stagger: 0.05,
            ease: "power2.out",
          },
          "-=0.4"
        );
      }
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data.grouped);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
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
        <div className="flex items-center space-x-2 text-gray-500">
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
              <span className="text-sm text-gray-600">
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
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 placeholder-gray-600"
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
                <div className="text-sm text-gray-600 mb-2">
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
                      <span className="text-sm text-gray-700 uppercase">
                        {type}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="text-xs text-gray-500">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm text-gray-700 placeholder-gray-600"
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
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
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
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 placeholder-gray-600"
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
            className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors duration-200"
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
    return Settings;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg shadow border p-6">
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
      <div ref={headerRef} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">
            Configure system preferences and personal settings
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchSettings}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
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
                    ? `border-blue-500 ${tab.color}`
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon
                  className={`h-4 w-4 transition-colors duration-200 ${
                    isActive
                      ? tab.color
                      : "text-gray-400 group-hover:text-gray-500"
                  }`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        {/* Tab Header with colored styling */}
        <div
          className={`px-6 py-4 border-b border-gray-200 ${activeTabData?.bgColor} ${activeTabData?.borderColor} border-l-4`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {activeTabData && (
                <>
                  <div className={`p-2 rounded-lg ${activeTabData.bgColor}`}>
                    <activeTabData.icon
                      className={`h-5 w-5 ${activeTabData.color}`}
                    />
                  </div>
                  <div>
                    <h2
                      className={`text-lg font-semibold ${activeTabData.color}`}
                    >
                      {activeTabData.label}
                    </h2>
                    <p className="text-sm text-gray-600">
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
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  <Settings className="h-4 w-4" />
                  <span>Test Config</span>
                </button>
                <button
                  onClick={testEmail}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  <Mail className="h-4 w-4" />
                  <span>Test Email</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Settings List */}
        <div className="p-6">
          {activeSettings.length > 0 ? (
            <div className="space-y-6">
              {activeSettings.map((setting) => {
                const SettingIcon = getSettingIcon(setting.key);
                return (
                  <div
                    key={setting.key}
                    className={`flex items-start space-x-4 p-4 border rounded-lg transition-all duration-200 ${
                      activeTabData?.borderColor || "border-gray-200"
                    } ${activeTabData?.hoverColor || "hover:bg-gray-50"}`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        activeTabData?.bgColor || "bg-blue-100"
                      }`}
                    >
                      <SettingIcon
                        className={`h-4 w-4 ${
                          activeTabData?.color || "text-blue-600"
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {setting.key
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </h3>
                          {setting.description && (
                            <p className="text-sm text-gray-500 mt-1">
                              {setting.description}
                            </p>
                          )}
                        </div>

                        {setting.isPersonal && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No settings found
              </h3>
              <p className="text-gray-500">
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
