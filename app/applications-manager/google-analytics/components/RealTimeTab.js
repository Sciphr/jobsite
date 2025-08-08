"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Activity, 
  Users, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Globe,
  RefreshCcw as Refresh,
  Wifi
} from "lucide-react";

export default function RealTimeTab({ onRefreshRealTime }) {
  const [realTimeData, setRealTimeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch real-time data
  const fetchRealTimeData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/analytics/google?realtime=true");
      const data = await response.json();
      
      if (data.realTime) {
        setRealTimeData(data.realTime);
      }
    } catch (error) {
      console.error("Error fetching real-time data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchRealTimeData();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchRealTimeData, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getDeviceIcon = (device) => {
    switch (device.toLowerCase()) {
      case 'mobile':
        return Smartphone;
      case 'tablet':
        return Tablet;
      case 'desktop':
        return Monitor;
      default:
        return Monitor;
    }
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

  if (isLoading && !realTimeData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="admin-text-light">Loading real-time data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-3 mb-4 sm:mb-0">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${realTimeData?.totalActiveUsers > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <h2 className="text-xl font-bold admin-text">Live Activity</h2>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-sm admin-text">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Auto-refresh (30s)</span>
          </label>
          
          <button
            onClick={fetchRealTimeData}
            disabled={isLoading}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Refresh className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </motion.div>

      {/* Active Users Counter */}
      <motion.div variants={itemVariants} className="admin-card rounded-lg p-6 shadow-sm border border-green-200 dark:border-green-700">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Activity className="h-8 w-8 text-green-600" />
            <div className="text-4xl font-bold text-green-600">
              {realTimeData?.totalActiveUsers || 0}
            </div>
          </div>
          <h3 className="text-lg font-semibold admin-text mb-2">Active Users Right Now</h3>
          <p className="admin-text-light text-sm">
            Users currently viewing your website
          </p>
          
          {realTimeData?.totalActiveUsers > 0 && (
            <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-green-600">
              <Wifi className="h-4 w-4" />
              <span>Live data updating</span>
            </div>
          )}
        </div>
      </motion.div>

      {realTimeData?.totalActiveUsers > 0 ? (
        <>
          {/* Breakdown by Country and Device */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Countries */}
            <motion.div variants={itemVariants} className="admin-card rounded-lg shadow-sm">
              <div className="p-4 lg:p-6 border-b admin-border">
                <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  <span>Active by Country</span>
                </h3>
              </div>
              <div className="p-4 lg:p-6">
                {realTimeData.breakdown.reduce((acc, item) => {
                  const country = acc.find(c => c.country === item.country);
                  if (country) {
                    country.users += item.activeUsers;
                  } else {
                    acc.push({ country: item.country, users: item.activeUsers });
                  }
                  return acc;
                }, []).sort((a, b) => b.users - a.users).slice(0, 6).map((country, index) => (
                  <div key={country.country} className="flex items-center justify-between py-3 border-b last:border-b-0 admin-border">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-medium admin-text">{country.country}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-sm font-semibold admin-text">{country.users}</div>
                      <div className="text-xs admin-text-light">
                        {((country.users / realTimeData.totalActiveUsers) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Devices */}
            <motion.div variants={itemVariants} className="admin-card rounded-lg shadow-sm">
              <div className="p-4 lg:p-6 border-b admin-border">
                <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                  <Monitor className="h-5 w-5 text-purple-600" />
                  <span>Active by Device</span>
                </h3>
              </div>
              <div className="p-4 lg:p-6">
                {realTimeData.breakdown.reduce((acc, item) => {
                  const device = acc.find(d => d.device === item.device);
                  if (device) {
                    device.users += item.activeUsers;
                  } else {
                    acc.push({ device: item.device, users: item.activeUsers });
                  }
                  return acc;
                }, []).sort((a, b) => b.users - a.users).map((deviceData, index) => {
                  const DeviceIcon = getDeviceIcon(deviceData.device);
                  return (
                    <div key={deviceData.device} className="flex items-center justify-between py-3 border-b last:border-b-0 admin-border">
                      <div className="flex items-center space-x-3">
                        <DeviceIcon className="h-5 w-5 text-purple-600" />
                        <span className="font-medium admin-text capitalize">{deviceData.device}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-sm font-semibold admin-text">{deviceData.users}</div>
                        <div className="text-xs admin-text-light">
                          {((deviceData.users / realTimeData.totalActiveUsers) * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Detailed Breakdown */}
          <motion.div variants={itemVariants} className="admin-card rounded-lg shadow-sm">
            <div className="p-4 lg:p-6 border-b admin-border">
              <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                <Users className="h-5 w-5 text-indigo-600" />
                <span>Detailed Active Users</span>
              </h3>
            </div>
            <div className="p-4 lg:p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b admin-border">
                    <tr>
                      <th className="text-left py-2 admin-text font-medium">Country</th>
                      <th className="text-left py-2 admin-text font-medium">Device</th>
                      <th className="text-right py-2 admin-text font-medium">Active Users</th>
                      <th className="text-right py-2 admin-text font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {realTimeData.breakdown.sort((a, b) => b.activeUsers - a.activeUsers).map((item, index) => {
                      const DeviceIcon = getDeviceIcon(item.device);
                      return (
                        <tr key={`${item.country}-${item.device}`} className="border-b last:border-b-0 admin-border">
                          <td className="py-3 admin-text">{item.country}</td>
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <DeviceIcon className="h-4 w-4 admin-text-light" />
                              <span className="admin-text capitalize">{item.device}</span>
                            </div>
                          </td>
                          <td className="py-3 text-right font-semibold admin-text">{item.activeUsers}</td>
                          <td className="py-3 text-right admin-text-light text-sm">
                            {((item.activeUsers / realTimeData.totalActiveUsers) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </>
      ) : (
        <motion.div variants={itemVariants} className="text-center py-12">
          <div className="admin-card rounded-lg p-8 max-w-md mx-auto">
            <Activity className="h-16 w-16 admin-text-light mx-auto mb-4" />
            <h3 className="text-lg font-semibold admin-text mb-2">No Active Users</h3>
            <p className="admin-text-light">
              There are currently no active users on your website. Real-time data updates every 30 seconds.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}