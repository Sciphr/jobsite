// app/components/NotificationsTab.js
"use client";

import { useState } from "react";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useJobAlerts,
  useAddJobAlert,
  useDeleteJobAlert,
  useDepartments
} from "@/app/hooks/useNotifications";

export default function NotificationsTab() {
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [newAlert, setNewAlert] = useState({
    type: 'department',
    department: '',
    keywords: [],
    frequency: 'immediate'
  });

  // React Query hooks
  const {
    data: notifications = {
      emailNotificationsEnabled: true,
      weeklyDigestEnabled: false,
      instantJobAlertsEnabled: false,
      notificationEmail: '',
      maxDailyNotifications: 5,
      notificationBatchMinutes: 30,
    },
    isLoading: preferencesLoading
  } = useNotificationPreferences();

  const {
    data: jobAlertsData,
    isLoading: alertsLoading
  } = useJobAlerts();

  const {
    data: departments = [],
    isLoading: departmentsLoading
  } = useDepartments();

  // Mutations with optimistic updates
  const updatePreferencesMutation = useUpdateNotificationPreferences();
  const addAlertMutation = useAddJobAlert();
  const deleteAlertMutation = useDeleteJobAlert();

  const subscriptions = jobAlertsData?.alerts || [];

  // Handlers with optimistic updates
  const updateNotificationPreferences = (updates) => {
    updatePreferencesMutation.mutate(updates);
  };

  const addJobAlert = () => {
    const alertData = {
      department: newAlert.type === 'department' ? newAlert.department : null,
      keywords: newAlert.type === 'keywords' ? newAlert.keywords.join(', ') : null
    };

    addAlertMutation.mutate(alertData, {
      onSuccess: () => {
        setShowAddAlert(false);
        setNewAlert({
          type: 'department',
          department: '',
          keywords: [],
          frequency: 'immediate'
        });
      },
      onError: (error) => {
        alert(error.message || 'Failed to add job alert');
      }
    });
  };

  const deleteJobAlert = (alertId) => {
    if (!confirm('Are you sure you want to delete this job alert?')) return;

    deleteAlertMutation.mutate(alertId, {
      onError: (error) => {
        alert(error.message || 'Failed to delete job alert');
      }
    });
  };

  // Show loading skeleton only on initial load
  const isInitialLoading = preferencesLoading || alertsLoading;

  if (isInitialLoading) {
    return (
      <div className="px-6 py-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-200">
            Notification Preferences
          </h2>
          <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
            Manage how you receive job alerts and updates.
          </p>
        </div>

        {/* General Notification Settings */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-6 transition-colors duration-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 transition-colors duration-200">
            General Settings
          </h3>
        
          <div className="space-y-4">
            {/* Master Email Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-white transition-colors duration-200">
                  Email Notifications
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-200">
                  Enable email notifications for job alerts and updates
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notifications.emailNotificationsEnabled}
                  onChange={(e) => updateNotificationPreferences({
                    emailNotificationsEnabled: e.target.checked
                  })}
                  disabled={updatePreferencesMutation.isPending}
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500"></div>
              </label>
            </div>

            {/* Show additional options only if email notifications are enabled */}
            {notifications.emailNotificationsEnabled && (
              <>
                <div className="border-l-4 border-blue-200 dark:border-blue-700 pl-4 ml-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900 dark:text-white transition-colors duration-200">
                        Weekly Job Digest
                      </label>
                      <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-200">
                        Receive a weekly email with jobs matching your department-based subscriptions below
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notifications.weeklyDigestEnabled}
                        onChange={(e) => updateNotificationPreferences({
                          weeklyDigestEnabled: e.target.checked
                        })}
                        disabled={updatePreferencesMutation.isPending}
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900 dark:text-white transition-colors duration-200">
                        Instant Job Alerts
                      </label>
                      <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-200">
                        Get notified immediately when jobs matching your keyword-based subscriptions are posted
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notifications.instantJobAlertsEnabled}
                        onChange={(e) => updateNotificationPreferences({
                          instantJobAlertsEnabled: e.target.checked
                        })}
                        disabled={updatePreferencesMutation.isPending}
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500"></div>
                    </label>
                  </div>

                  {/* Rate Limiting Controls */}
                  <div className="border-l-4 border-orange-200 dark:border-orange-700 pl-4 ml-2 space-y-4 mt-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 transition-colors duration-200">
                        📊 Rate Limiting Settings
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 transition-colors duration-200">
                        Control how frequently you receive notifications to prevent spam
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Max Daily Notifications */}
                      <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2 transition-colors duration-200">
                          Max Daily Notifications
                        </label>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 transition-colors duration-200">
                          Maximum notifications you'll receive per day
                        </p>
                        <select
                          value={notifications.maxDailyNotifications}
                          onChange={(e) => updateNotificationPreferences({
                            maxDailyNotifications: parseInt(e.target.value)
                          })}
                          disabled={updatePreferencesMutation.isPending}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200 text-sm"
                        >
                          <option value={1}>1 notification</option>
                          <option value={3}>3 notifications</option>
                          <option value={5}>5 notifications</option>
                          <option value={10}>10 notifications</option>
                          <option value={20}>20 notifications</option>
                          <option value={50}>50 notifications</option>
                        </select>
                      </div>

                      {/* Batch Time Window */}
                      <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2 transition-colors duration-200">
                          Batch Time Window
                        </label>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 transition-colors duration-200">
                          Group multiple jobs posted within this time frame
                        </p>
                        <select
                          value={notifications.notificationBatchMinutes}
                          onChange={(e) => updateNotificationPreferences({
                            notificationBatchMinutes: parseInt(e.target.value)
                          })}
                          disabled={updatePreferencesMutation.isPending}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200 text-sm"
                        >
                          <option value={0}>No batching (send immediately)</option>
                          <option value={15}>15 minutes</option>
                          <option value={30}>30 minutes</option>
                          <option value={60}>1 hour</option>
                          <option value={120}>2 hours</option>
                          <option value={240}>4 hours</option>
                          <option value={480}>8 hours</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700 transition-colors duration-200">
                      <p className="text-xs text-blue-700 dark:text-blue-300 transition-colors duration-200">
                        <strong>💡 How it works:</strong> If multiple matching jobs are posted within your batch window, 
                        they'll be sent together in one email instead of separate notifications. This prevents spam 
                        when admins add multiple jobs quickly.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Job Alert Subscriptions - Only show when email notifications are enabled */}
        {notifications.emailNotificationsEnabled && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-6 transition-colors duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-200">
                  Job Alert Subscriptions
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-200">
                  Configure what types of jobs you want to be notified about
                </p>
              </div>
              <button
                onClick={() => setShowAddAlert(!showAddAlert)}
                disabled={addAlertMutation.isPending}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2"
              >
                {addAlertMutation.isPending && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>{addAlertMutation.isPending ? 'Adding...' : 'Add Alert'}</span>
              </button>
            </div>

          {/* Add New Alert Form */}
          {showAddAlert && (
            <div className="mb-6 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 transition-colors duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200">
                    Alert Type
                  </label>
                  <select
                    value={newAlert.type}
                    onChange={(e) => setNewAlert({...newAlert, type: e.target.value})}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                    disabled={addAlertMutation.isPending}
                  >
                    <option value="department">Department Based (Weekly Digest)</option>
                    <option value="keywords">Keyword Based (Instant Alerts)</option>
                  </select>
                </div>

                {newAlert.type === 'department' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200">
                      Department
                    </label>
                    <select
                      value={newAlert.department}
                      onChange={(e) => setNewAlert({...newAlert, department: e.target.value})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                      disabled={addAlertMutation.isPending || departmentsLoading}
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                )}

                {newAlert.type === 'keywords' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200">
                      Keywords
                    </label>
                    <input
                      type="text"
                      placeholder="Enter keywords separated by commas"
                      onChange={(e) => setNewAlert({
                        ...newAlert, 
                        keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                      })}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                      disabled={addAlertMutation.isPending}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 mt-4">
                <button
                  onClick={() => setShowAddAlert(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
                  disabled={addAlertMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={addJobAlert}
                  disabled={
                    addAlertMutation.isPending ||
                    (newAlert.type === 'department' && !newAlert.department) ||
                    (newAlert.type === 'keywords' && newAlert.keywords.length === 0)
                  }
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 transition-colors duration-200"
                >
                  {addAlertMutation.isPending ? 'Adding...' : 'Add Alert'}
                </button>
              </div>
            </div>
          )}

          {/* Existing Subscriptions */}
          <div className="space-y-3">
            {subscriptions.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400 text-center py-8 transition-colors duration-200">
                No job alerts configured. Add an alert to get notified about new job postings.
              </p>
            ) : (
              subscriptions.map((subscription) => (
                <div key={subscription.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 transition-colors duration-200">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white transition-colors duration-200">
                      {subscription.department && `${subscription.department} Department`}
                      {subscription.keywords && `Keywords: ${subscription.keywords}`}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-200">
                      {subscription.department ? 'Weekly Digest' : 'Instant Alerts'} • 
                      {subscription.isActive ? 'Active' : 'Paused'}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteJobAlert(subscription.id)}
                    disabled={deleteAlertMutation.isPending}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors duration-200 disabled:opacity-50"
                  >
                    {deleteAlertMutation.isPending ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              ))
            )}
          </div>
          </div>
        )}
      </div>
    </div>
  );
}