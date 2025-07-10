import React, { useState, useEffect } from "react";
import { useTheme } from "../../../contexts/ThemeContext";
import { useUsers } from "@/app/hooks/useAdminData";

import {
  Mail,
  Settings,
  BarChart3,
  Users,
  Activity,
  Calendar,
  Edit3,
  Check,
  Send,
  Eye,
} from "lucide-react";

const WeeklyDigest = () => {
  const { theme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("content");

  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [digestConfig, setDigestConfig] = useState({
    enabled: true,
    recipients: [],
    template: "professional",
    sections: {
      jobMetrics: true,
      userMetrics: true,
      applicationData: true,
      systemHealth: true,
    },
    sectionCustomizations: {
      jobMetrics: {
        newJobs: true,
        jobViews: true,
        topJobs: true,
        lowJobs: true,
        jobsByDepartment: true,
        featuredJobs: false,
      },
      userMetrics: {
        newUsers: true,
        activeUsers: false,
        userGrowth: true,
        usersByRole: false,
        registrationTrends: true,
      },
      applicationData: {
        totalApps: true,
        applied: true,
        reviewing: true,
        interview: true,
        hired: true,
        rejected: false, // Default off as requested
        appTrends: true,
        dailyBreakdown: true,
        conversionRates: false,
        avgTimeToHire: true,
      },
      systemHealth: {
        systemStatus: true,
        performance: false,
        alerts: true,
        uptime: false,
        errorRates: false,
        responseTime: false,
      },
    },
    schedule: {
      dayOfWeek: 1,
      time: "09:00",
    },
  });

  useEffect(() => {
    loadDigestSettings();
  }, []);

  const handleCustomizationChange = (sectionKey, customKey, value) => {
    setDigestConfig((prev) => ({
      ...prev,
      sectionCustomizations: {
        ...prev.sectionCustomizations,
        [sectionKey]: {
          ...prev.sectionCustomizations[sectionKey],
          [customKey]: value,
        },
      },
    }));
  };

  const loadDigestSettings = async () => {
    try {
      const response = await fetch(
        "/api/admin/settings?category=notifications"
      );
      if (response.ok) {
        const data = await response.json();
        const notificationSettings = data.grouped?.notifications || [];

        const enabled =
          notificationSettings.find((s) => s.key === "weekly_digest_enabled")
            ?.parsedValue ?? true;
        const recipients =
          notificationSettings.find((s) => s.key === "weekly_digest_recipients")
            ?.parsedValue ?? [];
        const day =
          notificationSettings.find((s) => s.key === "weekly_digest_day")
            ?.parsedValue ?? "monday";
        const time =
          notificationSettings.find((s) => s.key === "weekly_digest_time")
            ?.parsedValue ?? "09:00";

        setDigestConfig((prev) => ({
          ...prev,
          enabled,
          recipients: Array.isArray(recipients) ? recipients : [],
          schedule: {
            dayOfWeek:
              day === "monday"
                ? 1
                : day === "tuesday"
                  ? 2
                  : day === "wednesday"
                    ? 3
                    : day === "thursday"
                      ? 4
                      : day === "friday"
                        ? 5
                        : day === "saturday"
                          ? 6
                          : 0,
            time,
          },
        }));
      }
    } catch (error) {
      console.error("Error loading digest settings:", error);
    } finally {
      setSettingsLoaded(true);
    }
  };

  const handleSendTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/admin/weekly-digest/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          message: `Test digest sent to ${data.sent} recipient(s)!`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.message || "Failed to send test digest",
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: "Network error occurred",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      className={`p-6 space-y-6 ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"} min-h-screen`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
          >
            Weekly Digest
          </h1>
          <p
            className={`mt-1 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
          >
            Configure and manage your weekly digest reports
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-sm font-medium admin-text bg-white dark:bg-gray-800">
            <Eye className="w-4 h-4" />
            <span>Preview</span>
          </button>
          <button
            onClick={handleSendTest}
            disabled={testing}
            className="flex items-center space-x-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-sm font-medium admin-text bg-white dark:bg-gray-800"
          >
            <Send className="w-4 h-4" />
            <span>{testing ? "Sending..." : "Send Test"}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2">
          <div
            className={`rounded-lg shadow border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3
                className={`flex items-center text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
              >
                <Settings className="w-5 h-5 mr-2" />
                Digest Configuration
              </h3>
            </div>

            <div className="p-6">
              <div className="w-full">
                <div
                  className={`grid w-full grid-cols-3 rounded-lg p-1 ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}
                >
                  <button
                    onClick={() => setActiveTab("content")}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === "content"
                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    Content
                  </button>
                  <button
                    onClick={() => setActiveTab("recipients")}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === "recipients"
                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    Recipients
                  </button>
                  <button
                    onClick={() => setActiveTab("schedule")}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === "schedule"
                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    Schedule
                  </button>
                </div>

                {activeTab === "content" && (
                  <div className="space-y-4 mt-6">
                    <ContentConfiguration
                      sections={digestConfig.sections}
                      sectionCustomizations={digestConfig.sectionCustomizations}
                      onSectionChange={(section, enabled) =>
                        setDigestConfig((prev) => ({
                          ...prev,
                          sections: { ...prev.sections, [section]: enabled },
                        }))
                      }
                      onCustomizationChange={handleCustomizationChange}
                      theme={theme}
                    />
                  </div>
                )}

                {activeTab === "recipients" && (
                  <div className="space-y-4 mt-6">
                    <RecipientsConfiguration
                      recipients={digestConfig.recipients}
                      onRecipientsChange={(recipients) =>
                        setDigestConfig((prev) => ({ ...prev, recipients }))
                      }
                      theme={theme}
                    />
                  </div>
                )}

                {activeTab === "schedule" && (
                  <div className="space-y-4 mt-6">
                    <ScheduleConfiguration
                      schedule={digestConfig.schedule}
                      onScheduleChange={(schedule) =>
                        setDigestConfig((prev) => ({ ...prev, schedule }))
                      }
                      theme={theme}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Panel */}
        <div className="space-y-6">
          <StatusPanel digestConfig={digestConfig} theme={theme} />
          <RecentDigests theme={theme} />
        </div>
      </div>
    </div>
  );
};

const ContentConfiguration = ({
  sections,
  sectionCustomizations,
  onSectionChange,
  onCustomizationChange,
  theme,
}) => {
  const [expandedSections, setExpandedSections] = useState({});

  const sectionConfig = [
    {
      key: "jobMetrics",
      title: "Job Metrics",
      description: "Job postings, views, applications",
      icon: BarChart3,
      color: "blue",
      customizations: [
        {
          key: "newJobs",
          label: "New Jobs Posted",
          description: "Number of jobs posted this week",
          category: "overview",
        },
        {
          key: "jobViews",
          label: "Total Job Views",
          description: "Total views across all job postings",
          category: "overview",
        },
        {
          key: "topJobs",
          label: "Top Performing Jobs",
          description: "Jobs with most applications this week",
          category: "insights",
        },
        {
          key: "lowJobs",
          label: "Jobs Needing Attention",
          description: "Jobs with low application rates",
          category: "insights",
        },
        {
          key: "jobsByDepartment",
          label: "Jobs by Department",
          description: "Breakdown of jobs by department",
          category: "breakdown",
        },
        {
          key: "featuredJobs",
          label: "Featured Jobs Performance",
          description: "How featured jobs are performing",
          category: "insights",
        },
      ],
    },
    {
      key: "userMetrics",
      title: "User Metrics",
      description: "New registrations, active users",
      icon: Users,
      color: "green",
      customizations: [
        {
          key: "newUsers",
          label: "New User Registrations",
          description: "Users who signed up this week",
          category: "overview",
        },
        {
          key: "activeUsers",
          label: "Active Users",
          description: "Users who were active this week",
          category: "overview",
        },
        {
          key: "userGrowth",
          label: "User Growth Chart",
          description: "Visual representation of user growth",
          category: "insights",
        },
        {
          key: "usersByRole",
          label: "Users by Role",
          description: "Breakdown of users by their roles",
          category: "breakdown",
        },
        {
          key: "registrationTrends",
          label: "Registration Trends",
          description: "Daily registration patterns",
          category: "insights",
        },
      ],
    },
    {
      key: "applicationData",
      title: "Application Data",
      description: "Application statistics and trends",
      icon: Mail,
      color: "purple",
      customizations: [
        {
          key: "totalApps",
          label: "Total Applications",
          description: "Total applications received this week",
          category: "overview",
        },
        {
          key: "applied",
          label: "Applied Status",
          description: 'Applications in "Applied" status',
          category: "breakdown",
        },
        {
          key: "reviewing",
          label: "Under Review",
          description: "Applications being reviewed",
          category: "breakdown",
        },
        {
          key: "interview",
          label: "Interview Stage",
          description: "Applications in interview process",
          category: "breakdown",
        },
        {
          key: "hired",
          label: "Hired",
          description: "Successful hires this week",
          category: "breakdown",
        },
        {
          key: "rejected",
          label: "Rejected",
          description: "Applications that were rejected",
          category: "breakdown",
        },
        {
          key: "appTrends",
          label: "Application Trends",
          description: "Daily application patterns",
          category: "insights",
        },
        {
          key: "dailyBreakdown",
          label: "Daily Breakdown",
          description: "Applications received each day",
          category: "insights",
        },
        {
          key: "conversionRates",
          label: "Conversion Rates",
          description: "Application to hire conversion rates",
          category: "insights",
        },
        {
          key: "avgTimeToHire",
          label: "Average Time to Hire",
          description: "How long the hiring process takes",
          category: "insights",
        },
      ],
    },
    {
      key: "systemHealth",
      title: "System Health",
      description: "Performance metrics and alerts",
      icon: Activity,
      color: "red",
      customizations: [
        {
          key: "systemStatus",
          label: "System Status",
          description: "Overall system health status",
          category: "overview",
        },
        {
          key: "alerts",
          label: "System Alerts",
          description: "Any system alerts or warnings",
          category: "overview",
        },
        {
          key: "performance",
          label: "Performance Metrics",
          description: "System performance statistics",
          category: "technical",
        },
        {
          key: "uptime",
          label: "Uptime Statistics",
          description: "System availability metrics",
          category: "technical",
        },
        {
          key: "errorRates",
          label: "Error Rates",
          description: "Application error statistics",
          category: "technical",
        },
        {
          key: "responseTime",
          label: "Response Time",
          description: "Average system response times",
          category: "technical",
        },
      ],
    },
  ];

  const getColorClasses = (color, isActive = false) => {
    const colors = {
      blue: {
        icon: isActive ? "text-blue-600" : "text-blue-500",
        bg: "bg-blue-50 dark:bg-blue-900/20",
        border: "border-blue-200 dark:border-blue-700",
        accent: "bg-blue-600",
      },
      green: {
        icon: isActive ? "text-green-600" : "text-green-500",
        bg: "bg-green-50 dark:bg-green-900/20",
        border: "border-green-200 dark:border-green-700",
        accent: "bg-green-600",
      },
      purple: {
        icon: isActive ? "text-purple-600" : "text-purple-500",
        bg: "bg-purple-50 dark:bg-purple-900/20",
        border: "border-purple-200 dark:border-purple-700",
        accent: "bg-purple-600",
      },
      red: {
        icon: isActive ? "text-red-600" : "text-red-500",
        bg: "bg-red-50 dark:bg-red-900/20",
        border: "border-red-200 dark:border-red-700",
        accent: "bg-red-600",
      },
    };
    return colors[color];
  };

  const toggleSection = (sectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const groupCustomizations = (customizations) => {
    return customizations.reduce((acc, custom) => {
      if (!acc[custom.category]) acc[custom.category] = [];
      acc[custom.category].push(custom);
      return acc;
    }, {});
  };

  const getCategoryIcon = (category) => {
    const icons = {
      overview: BarChart3,
      breakdown: Users,
      insights: Activity,
      technical: Settings,
    };
    return icons[category] || Settings;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      overview: "Overview",
      breakdown: "Status Breakdown",
      insights: "Insights & Trends",
      technical: "Technical Metrics",
    };
    return labels[category] || category;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3
          className={`text-lg font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}
        >
          Content Sections
        </h3>
        <p
          className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
        >
          Choose which sections to include and customize what data points to
          show in each section.
        </p>

        <div className="space-y-4">
          {sectionConfig.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSections[section.key];
            const isEnabled = sections[section.key];
            const colors = getColorClasses(section.color, isEnabled);
            const sectionCustoms = sectionCustomizations[section.key] || {};
            const enabledCount =
              Object.values(sectionCustoms).filter(Boolean).length;

            return (
              <div
                key={section.key}
                className={`rounded-lg border-2 transition-all duration-200 ${
                  isEnabled
                    ? `${colors.border} ${colors.bg}`
                    : theme === "dark"
                      ? "border-gray-600 bg-gray-700"
                      : "border-gray-200 bg-gray-50"
                }`}
              >
                {/* Section Header */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon
                        className={`w-6 h-6 ${isEnabled ? colors.icon : "text-gray-400"}`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4
                            className={`font-semibold ${
                              isEnabled
                                ? theme === "dark"
                                  ? "text-white"
                                  : "text-gray-900"
                                : "text-gray-500"
                            }`}
                          >
                            {section.title}
                          </h4>
                          {isEnabled && enabledCount > 0 && (
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium text-white ${colors.accent}`}
                            >
                              {enabledCount} items
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-sm mt-1 ${
                            isEnabled
                              ? theme === "dark"
                                ? "text-gray-300"
                                : "text-gray-600"
                              : "text-gray-400"
                          }`}
                        >
                          {section.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {isEnabled && (
                        <button
                          onClick={() => toggleSection(section.key)}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            theme === "dark"
                              ? "bg-gray-600 text-gray-300 hover:bg-gray-500"
                              : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                          }`}
                        >
                          {isExpanded ? "Hide Options" : "Customize"}
                        </button>
                      )}

                      <button
                        onClick={() => onSectionChange(section.key, !isEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          isEnabled
                            ? colors.accent
                            : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isEnabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Customizations */}
                  {isExpanded && isEnabled && (
                    <div className="mt-6 space-y-4">
                      {Object.entries(
                        groupCustomizations(section.customizations)
                      ).map(([category, customs]) => {
                        const CategoryIcon = getCategoryIcon(category);

                        return (
                          <div key={category} className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <CategoryIcon className="w-4 h-4 text-gray-500" />
                              <h5
                                className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                              >
                                {getCategoryLabel(category)}
                              </h5>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                              {customs.map((custom) => (
                                <label
                                  key={custom.key}
                                  className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                                    sectionCustoms[custom.key]
                                      ? `${colors.border} ${colors.bg}`
                                      : theme === "dark"
                                        ? "border-gray-600 bg-gray-800 hover:bg-gray-700"
                                        : "border-gray-200 bg-white hover:bg-gray-50"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={
                                      sectionCustoms[custom.key] || false
                                    }
                                    onChange={(e) =>
                                      onCustomizationChange(
                                        // ✅ Use the prop instead
                                        section.key,
                                        custom.key,
                                        e.target.checked
                                      )
                                    }
                                    className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1`}
                                  />
                                  <div className="flex-1">
                                    <span
                                      className={`text-sm font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}
                                    >
                                      {custom.label}
                                    </span>
                                    <p
                                      className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                                    >
                                      {custom.description}
                                    </p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const RecipientsConfiguration = ({ recipients, onRecipientsChange, theme }) => {
  const [userFilter, setUserFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Use React Query hook instead of manual fetch
  const { data: allUsers = [], isLoading: loading, isError } = useUsers();

  // Filter to admin users only
  const users = allUsers.filter(
    (user) => user.privilegeLevel >= 1 && user.isActive
  );

  const filteredUsers = users.filter((user) => {
    if (userFilter) {
      const searchTerm = userFilter.toLowerCase();
      const userName = `${user.firstName || ""} ${user.lastName || ""}`
        .trim()
        .toLowerCase();
      const textMatch =
        userName.includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.role.toLowerCase().includes(searchTerm);
      if (!textMatch) return false;
    }
    if (roleFilter && user.role !== roleFilter) return false;
    return true;
  });

  const toggleUser = (userId) => {
    const newRecipients = recipients.includes(userId)
      ? recipients.filter((id) => id !== userId)
      : [...recipients, userId];
    onRecipientsChange(newRecipients);
  };

  const formatRoleName = (role) => {
    const roleNames = {
      hr: "HR",
      admin: "Admin",
      super_admin: "Super Admin",
    };
    return roleNames[role] || role;
  };

  // Handle error state
  if (isError) {
    return (
      <div className="space-y-4">
        <h3
          className={`text-lg font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}
        >
          Email Recipients
        </h3>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-700 dark:text-red-300">
            Failed to load users. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h3
          className={`text-lg font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}
        >
          Email Recipients
        </h3>
        <div className="animate-pulse space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3
          className={`text-lg font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}
        >
          Email Recipients
        </h3>
        <div className="flex items-center space-x-2 text-sm">
          <Users className="h-4 w-4 text-blue-500" />
          <span
            className={`font-medium ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}
          >
            {recipients.length} selected
          </span>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search users..."
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className={`w-full pl-3 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
              theme === "dark"
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
            }`}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
            theme === "dark"
              ? "bg-gray-700 border-gray-600 text-white"
              : "bg-white border-gray-300 text-gray-900"
          }`}
        >
          <option value="">All Roles</option>
          <option value="hr">HR</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <span
          className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
        >
          {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}{" "}
          available
        </span>
        <div className="flex space-x-2">
          <button
            onClick={() =>
              onRecipientsChange([
                ...new Set([...recipients, ...filteredUsers.map((u) => u.id)]),
              ])
            }
            disabled={filteredUsers.length === 0}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Select All
          </button>
          <button
            onClick={() => onRecipientsChange([])}
            disabled={recipients.length === 0}
            className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Users List */}
      <div
        className={`space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3 ${
          theme === "dark" ? "border-gray-600" : "border-gray-200"
        }`}
      >
        {filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p
              className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
            >
              {users.length === 0
                ? "No admin users found"
                : "No users match your filters"}
            </p>
            {userFilter || roleFilter ? (
              <button
                onClick={() => {
                  setUserFilter("");
                  setRoleFilter("");
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium mt-2"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isSelected = recipients.includes(user.id);
            const userName =
              `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
              user.email;

            return (
              <div
                key={user.id}
                onClick={() => toggleUser(user.id)}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-[1.01] ${
                  isSelected
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 shadow-sm"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                      isSelected
                        ? "bg-blue-600 border-blue-600 scale-110"
                        : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium transition-colors ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                    >
                      {userName}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{user.email}</span>
                      <span>•</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${
                          user.role === "super_admin"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            : user.role === "admin"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        }`}
                      >
                        {formatRoleName(user.role)}
                      </span>
                      <span>•</span>
                      <span>Level {user.privilegeLevel}</span>
                    </div>
                  </div>
                </div>
                <Mail
                  className={`h-4 w-4 transition-all duration-200 ${
                    isSelected
                      ? "text-blue-600 dark:text-blue-400 scale-110"
                      : "text-gray-400"
                  }`}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Status Messages */}
      {recipients.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center">
            <X className="h-4 w-4 mr-2" />
            No recipients selected. The digest will not be sent.
          </p>
        </div>
      )}

      {recipients.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <p className="text-sm text-green-800 dark:text-green-200 flex items-center">
            <Check className="h-4 w-4 mr-2" />
            Weekly digest will be sent to {recipients.length} recipient
            {recipients.length !== 1 ? "s" : ""}.
          </p>
        </div>
      )}
    </div>
  );
};

// Schedule Configuration Component
const ScheduleConfiguration = ({ schedule, onScheduleChange, theme }) => {
  const days = [
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
    { value: 0, label: "Sunday" },
  ];

  return (
    <div className="space-y-4">
      <h3
        className={`text-lg font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}
      >
        Schedule Settings
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
          >
            Day of Week
          </label>
          <select
            value={schedule.dayOfWeek}
            onChange={(e) =>
              onScheduleChange({
                ...schedule,
                dayOfWeek: parseInt(e.target.value),
              })
            }
            className={`w-full p-2 border rounded-md ${
              theme === "dark"
                ? "bg-gray-700 border-gray-600 text-white"
                : "bg-white border-gray-300 text-gray-900"
            }`}
          >
            {days.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
          >
            Time
          </label>
          <input
            type="time"
            value={schedule.time}
            onChange={(e) =>
              onScheduleChange({ ...schedule, time: e.target.value })
            }
            className={`w-full p-2 border rounded-md ${
              theme === "dark"
                ? "bg-gray-700 border-gray-600 text-white"
                : "bg-white border-gray-300 text-gray-900"
            }`}
          />
        </div>
      </div>
    </div>
  );
};

const StatusPanel = ({ digestConfig, theme }) => {
  const [nextSendDate, setNextSendDate] = useState("");

  useEffect(() => {
    calculateNextSend();
  }, [digestConfig.schedule]);

  const calculateNextSend = () => {
    const now = new Date();
    const targetDay = digestConfig.schedule.dayOfWeek;
    const [hours, minutes] = digestConfig.schedule.time.split(":");

    // Find next occurrence of the target day
    const daysUntilTarget = (targetDay - now.getDay() + 7) % 7 || 7;
    const nextSend = new Date(now);
    nextSend.setDate(now.getDate() + daysUntilTarget);
    nextSend.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    setNextSendDate(
      nextSend.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    );
  };

  const statusItems = [
    {
      label: "Digest Status",
      value: digestConfig.enabled ? "Active" : "Inactive",
      color: digestConfig.enabled ? "text-green-600" : "text-red-600",
      icon: digestConfig.enabled ? Check : X,
    },
    {
      label: "Recipients",
      value: `${digestConfig.recipients.length} selected`,
      color:
        digestConfig.recipients.length > 0
          ? "text-blue-600"
          : "text-yellow-600",
      icon: Users,
    },
    {
      label: "Next Send",
      value: nextSendDate || "Not scheduled",
      color: "text-gray-600 dark:text-gray-300",
      icon: Calendar,
    },
    {
      label: "Active Sections",
      value: `${Object.values(digestConfig.sections).filter(Boolean).length}/4`,
      color: "text-purple-600",
      icon: Settings,
    },
  ];

  return (
    <div
      className={`rounded-lg shadow border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
    >
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3
          className={`flex items-center text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
        >
          <Activity className="w-5 h-5 mr-2 text-blue-500" />
          Status Overview
        </h3>
      </div>

      <div className="p-6 space-y-4">
        {statusItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Icon className="h-4 w-4 text-gray-400" />
                <span
                  className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                >
                  {item.label}
                </span>
              </div>
              <span className={`text-sm font-medium ${item.color}`}>
                {item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Recent Digests Component
const RecentDigests = ({ theme }) => {
  return (
    <div
      className={`rounded-lg shadow border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
    >
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3
          className={`flex items-center text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
        >
          <Calendar className="w-5 h-5 mr-2" />
          Recent Digests
        </h3>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`p-3 rounded-lg ${theme === "dark" ? "bg-gray-700" : "bg-gray-50"}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                >
                  Week {52 - i + 1}, 2024
                </span>
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
              <p
                className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"} mt-1`}
              >
                Sent to 5 recipients
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeeklyDigest;
