// app/applications-manager/components/StageAnalytics.js
"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, AlertTriangle, Users, BarChart3 } from 'lucide-react';
import { useThemeClasses } from '@/app/contexts/AdminThemeContext';

export default function StageAnalytics({ className = '' }) {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const { getStatCardClasses } = useThemeClasses();

  useEffect(() => {
    fetchStageAnalytics();
  }, []);

  const fetchStageAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/stage-analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics || []);
        setTrackingEnabled(data.trackingEnabled || false);
      }
    } catch (error) {
      console.error('Error fetching stage analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`admin-card rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!trackingEnabled) {
    return (
      <div className={`admin-card rounded-lg shadow p-6 ${className}`}>
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium admin-text mb-2">
            Stage Time Tracking Disabled
          </h3>
          <p className="admin-text-light text-sm">
            Enable "Track Time in Stage" in settings to see analytics
          </p>
        </div>
      </div>
    );
  }

  if (analytics.length === 0) {
    return (
      <div className={`admin-card rounded-lg shadow p-6 ${className}`}>
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium admin-text mb-2">
            No Stage Data Yet
          </h3>
          <p className="admin-text-light text-sm">
            Analytics will appear as applications move through stages
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-card rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
          <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold admin-text">Stage Analytics</h3>
          <p className="text-sm admin-text-light">Average time spent in each stage</p>
        </div>
      </div>

      <div className="space-y-4">
        {analytics.map((stage, index) => {
          const isSlowStage = stage.avg_time_seconds > (stage.stage === 'Applied' ? 7 * 86400 : 14 * 86400);
          
          return (
            <motion.div
              key={stage.stage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className={`p-2 rounded-full ${
                  isSlowStage 
                    ? 'bg-red-100 dark:bg-red-900/20' 
                    : 'bg-green-100 dark:bg-green-900/20'
                }`}>
                  {isSlowStage ? (
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium admin-text">{stage.stage}</span>
                    <span className="text-xs admin-text-light">
                      ({stage.total_entries} applications)
                    </span>
                  </div>
                  <div className="text-sm admin-text-light">
                    Avg: <span className="font-medium">{stage.avg_time_formatted}</span>
                    {stage.currently_in_stage > 0 && (
                      <span className="ml-2">
                        • <span className="font-medium">{stage.currently_in_stage}</span> currently here
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-medium admin-text">
                  {stage.avg_time_formatted}
                </div>
                <div className="text-xs admin-text-light">
                  {stage.min_time_formatted} - {stage.max_time_formatted}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="admin-text-light">
            Based on {analytics.reduce((sum, stage) => sum + stage.total_entries, 0)} stage transitions
          </span>
          <button
            onClick={fetchStageAnalytics}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}