import { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  Check,
  X,
  Save,
  Loader2,
  Mail,
  Settings,
  Clock,
} from "lucide-react";

export default function WeeklyDigestSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [userFilter, setUserFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [settings, setSettings] = useState({
    weekly_digest_enabled: true,
    weekly_digest_recipients: [],
    weekly_digest_day: "monday",
    weekly_digest_time: "09:00",
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch admin users and current settings
      const [usersResponse, settingsResponse] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/settings?category=notifications"),
      ]);

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        // Filter to only admin users (privilege level 1+)
        const adminUsers = usersData.filter(
          (user) => user.privilegeLevel >= 1 && user.isActive
        );
        setUsers(adminUsers);
      }

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        const settingsObj = settingsData.grouped?.notifications || [];

        // Extract digest settings
        const digestEnabled =
          settingsObj.find((s) => s.key === "weekly_digest_enabled")
            ?.parsedValue ?? true;
        const digestRecipients =
          settingsObj.find((s) => s.key === "weekly_digest_recipients")
            ?.parsedValue ?? [];
        const digestDay =
          settingsObj.find((s) => s.key === "weekly_digest_day")?.parsedValue ??
          "monday";
        const digestTime =
          settingsObj.find((s) => s.key === "weekly_digest_time")
            ?.parsedValue ?? "09:00";

        setSettings({
          weekly_digest_enabled: digestEnabled,
          weekly_digest_recipients: Array.isArray(digestRecipients)
            ? digestRecipients
            : [],
          weekly_digest_day: digestDay,
          weekly_digest_time: digestTime,
        });
      }
    } catch (error) {
      console.error("Error fetching digest settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setHasChanges(true);
  };

  const toggleUserRecipient = (userId) => {
    const currentRecipients = settings.weekly_digest_recipients;
    const newRecipients = currentRecipients.includes(userId)
      ? currentRecipients.filter((id) => id !== userId)
      : [...currentRecipients, userId];

    updateSetting("weekly_digest_recipients", newRecipients);
  };

  const selectAllUsers = () => {
    const allFilteredUserIds = filteredUsers.map((user) => user.id);
    const newRecipients = [
      ...new Set([...settings.weekly_digest_recipients, ...allFilteredUserIds]),
    ];
    updateSetting("weekly_digest_recipients", newRecipients);
  };

  const selectNoneUsers = () => {
    updateSetting("weekly_digest_recipients", []);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const settingsToSave = [
        { key: "weekly_digest_enabled", value: settings.weekly_digest_enabled },
        {
          key: "weekly_digest_recipients",
          value: settings.weekly_digest_recipients,
        },
        { key: "weekly_digest_day", value: settings.weekly_digest_day },
        { key: "weekly_digest_time", value: settings.weekly_digest_time },
      ];

      const results = await Promise.all(
        settingsToSave.map(({ key, value }) =>
          fetch(`/api/admin/settings/${key}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value }),
          })
        )
      );

      const allSuccessful = results.every((response) => response.ok);

      if (allSuccessful) {
        setHasChanges(false);
        // Show success message
        const successEl = document.createElement("div");
        successEl.className =
          "fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50";
        successEl.textContent = "Weekly digest settings saved successfully!";
        document.body.appendChild(successEl);
        setTimeout(() => successEl.remove(), 3000);
      } else {
        throw new Error("Some settings failed to save");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const formatRoleName = (role) => {
    switch (role) {
      case "hr":
        return "HR";
      case "admin":
        return "Admin";
      case "super_admin":
        return "Super Admin";
      default:
        return role;
    }
  };

  // Calculate filtered users once
  const filteredUsers = users.filter((user) => {
    // Text search filter
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

    // Role filter
    if (roleFilter && user.role !== roleFilter) {
      return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="setting-card flex items-start space-x-4 p-4 border rounded-lg border-blue-200 dark:border-blue-700">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-10 bg-gray-200 dark:bg-gray-700 rounded"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="setting-card flex items-start space-x-4 p-4 border rounded-lg transition-all duration-200 hover:shadow-sm border-blue-200 dark:border-blue-700">
      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
        <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Weekly Digest Configuration
          </h3>
          {hasChanges && (
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center space-x-2 px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              <span>{saving ? "Saving..." : "Save Changes"}</span>
            </button>
          )}
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Configure who receives the weekly digest email and when it's sent.
        </p>

        {/* Recipients Selection */}
        <div>
          {/* Search/Filter Input */}
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              disabled={!settings.weekly_digest_enabled}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            />
          </div>
          {/* Role Filter Dropdown */}
          <div className="mb-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              disabled={!settings.weekly_digest_enabled}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            >
              <option value="">All Roles</option>
              <option value="hr">HR</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Recipients ({settings.weekly_digest_recipients.length} selected)
            </h4>

            <div className="flex space-x-2">
              <button
                onClick={selectAllUsers}
                disabled={!settings.weekly_digest_enabled || users.length === 0}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
              >
                Select All
              </button>
              <button
                onClick={selectNoneUsers}
                disabled={
                  !settings.weekly_digest_enabled ||
                  settings.weekly_digest_recipients.length === 0
                }
                className="text-xs text-gray-600 hover:text-gray-700 font-medium disabled:opacity-50"
              >
                Select None
              </button>
            </div>
          </div>

          <div className="space-y-2 h-64 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-3">
            {users.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No admin users found
              </p>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  No users match your current filters
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Try adjusting your search terms or role filter
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = settings.weekly_digest_recipients.includes(
                  user.id
                );
                const userName =
                  `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                  user.email;

                return (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                    onClick={() =>
                      settings.weekly_digest_enabled &&
                      toggleUserRecipient(user.id)
                    }
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? "bg-blue-600 border-blue-600"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {userName}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{user.email}</span>
                          <span>•</span>
                          <span className="capitalize">
                            {formatRoleName(user.role)}
                          </span>
                          <span>•</span>
                          <span>Level {user.privilegeLevel}</span>
                        </div>
                      </div>
                    </div>
                    <Mail
                      className={`h-4 w-4 ${
                        isSelected ? "text-blue-600" : "text-gray-400"
                      }`}
                    />
                  </div>
                );
              })
            )}
          </div>

          {settings.weekly_digest_recipients.length === 0 &&
            settings.weekly_digest_enabled && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center">
                  <X className="h-4 w-4 mr-2" />
                  No recipients selected. The digest will not be sent.
                </p>
              </div>
            )}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> The weekly digest covers the previous
            complete week (Monday-Sunday) and includes job performance,
            application metrics, and actionable insights.
          </p>
        </div>
      </div>
    </div>
  );
}
