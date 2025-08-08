"use client";

import { motion } from "framer-motion";
import { 
  Globe, 
  Users, 
  MapPin, 
  Smartphone,
  Monitor,
  Tablet,
  TrendingUp,
  Zap,
  Activity,
  Navigation,
  Target
} from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";

export default function GeographyTab({ analyticsData }) {
  const { getStatCardClasses } = useThemeClasses();

  // Format numbers with commas
  const formatNumber = (num) => {
    if (num === undefined || num === null) return "0";
    return new Intl.NumberFormat().format(num);
  };

  // Format percentage
  const formatPercentage = (num) => {
    if (num === undefined || num === null) return "0%";
    return `${Math.round(num * 100) / 100}%`;
  };

  // Get device icon
  const getDeviceIcon = (deviceCategory) => {
    switch (deviceCategory?.toLowerCase()) {
      case 'mobile':
        return Smartphone;
      case 'tablet':
        return Tablet;
      case 'desktop':
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

  const geographic = analyticsData?.geographic || [];
  const devices = analyticsData?.devices || [];
  const technology = analyticsData?.technology || {};

  // Calculate totals
  const totalUsers = geographic.reduce((sum, location) => sum + location.activeUsers, 0);
  const totalSessions = devices.reduce((sum, device) => sum + device.sessions, 0);

  // Get top locations and devices
  const topCountries = geographic.slice(0, 10);
  const topDevices = devices.slice(0, 5);

  // Group geographic data by country and city
  const countriesWithCities = {};
  geographic.forEach(location => {
    if (!countriesWithCities[location.country]) {
      countriesWithCities[location.country] = {
        country: location.country,
        totalUsers: 0,
        totalSessions: 0,
        cities: []
      };
    }
    countriesWithCities[location.country].totalUsers += location.activeUsers;
    countriesWithCities[location.country].totalSessions += location.sessions;
    countriesWithCities[location.country].cities.push({
      city: location.city,
      activeUsers: location.activeUsers,
      sessions: location.sessions,
      pageViews: location.pageViews
    });
  });

  // Sort cities within each country
  Object.values(countriesWithCities).forEach(country => {
    country.cities.sort((a, b) => b.activeUsers - a.activeUsers);
  });

  // Convert to array and sort by total users
  const topCountriesWithCities = Object.values(countriesWithCities)
    .sort((a, b) => b.totalUsers - a.totalUsers)
    .slice(0, 5);

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {geographic.length === 0 && devices.length === 0 ? (
        <motion.div variants={itemVariants} className="text-center py-12">
          <div className="admin-card rounded-lg p-8 max-w-md mx-auto">
            <Globe className="h-16 w-16 admin-text-light mx-auto mb-4" />
            <h3 className="text-lg font-semibold admin-text mb-2">No Geographic Data</h3>
            <p className="admin-text-light">
              No geographic or device data available for the selected time period. This may take some time to populate.
            </p>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Overview Cards */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className={`admin-card rounded-lg p-4 lg:p-6 shadow-sm ${getStatCardClasses(0).hover}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm admin-text-light font-medium">Total Countries</p>
                  <p className="text-xl lg:text-2xl font-bold admin-text mt-1">{geographic.length}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/20">
                  <Globe className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className={`admin-card rounded-lg p-4 lg:p-6 shadow-sm ${getStatCardClasses(1).hover}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm admin-text-light font-medium">Top Country</p>
                  <p className="text-xl lg:text-2xl font-bold admin-text mt-1">{topCountries[0]?.country || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-full bg-green-50 dark:bg-green-900/20">
                  <MapPin className="h-5 w-5 lg:h-6 lg:w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className={`admin-card rounded-lg p-4 lg:p-6 shadow-sm ${getStatCardClasses(2).hover}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm admin-text-light font-medium">Device Types</p>
                  <p className="text-xl lg:text-2xl font-bold admin-text mt-1">{devices.length}</p>
                </div>
                <div className="p-3 rounded-full bg-purple-50 dark:bg-purple-900/20">
                  <Monitor className="h-5 w-5 lg:h-6 lg:w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className={`admin-card rounded-lg p-4 lg:p-6 shadow-sm ${getStatCardClasses(3).hover}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm admin-text-light font-medium">Top Device</p>
                  <p className="text-xl lg:text-2xl font-bold admin-text mt-1">{topDevices[0]?.deviceCategory || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-full bg-orange-50 dark:bg-orange-900/20">
                  <Smartphone className="h-5 w-5 lg:h-6 lg:w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Geographic & Device Insights */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Device Breakdown */}
            {devices.length > 0 && (
              <div className="admin-card rounded-lg p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold admin-text">Device Usage</h3>
                </div>
                <div className="space-y-4">
                  {topDevices.map((device, index) => {
                    const DeviceIcon = getDeviceIcon(device.deviceCategory);
                    const percentage = totalSessions > 0 ? (device.sessions / totalSessions) * 100 : 0;
                    
                    return (
                      <div key={`device-${device.deviceCategory}-${index}`} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <DeviceIcon className="h-5 w-5 admin-text-light" />
                          <div>
                            <p className="font-medium admin-text text-sm capitalize">{device.deviceCategory}</p>
                            <p className="text-xs admin-text-light">{formatNumber(device.sessions)} sessions</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold admin-text text-sm">{formatPercentage(percentage)}</p>
                          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
                            <div 
                              className="bg-purple-600 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Geographic Insights */}
            {geographic.length > 0 && (
              <div className="admin-card rounded-lg p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold admin-text">Top Regions</h3>
                </div>
                <div className="space-y-2 text-sm admin-text-light">
                  <div className="flex justify-between">
                    <span>Primary market:</span>
                    <span className="font-medium">{topCountries[0]?.country}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Market penetration:</span>
                    <span className="font-medium">{formatPercentage((topCountries[0]?.activeUsers / totalUsers) * 100)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>International reach:</span>
                    <span className="font-medium">{Object.keys(countriesWithCities).length} countries</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Top city:</span>
                    <span className="font-medium">{topCountriesWithCities[0]?.cities[0]?.city || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* City Breakdown by Top Countries */}
          {topCountriesWithCities.length > 0 && (
            <motion.div variants={itemVariants} className="admin-card rounded-lg shadow-sm">
              <div className="p-4 lg:p-6 border-b admin-border">
                <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <span>Top Cities by Country</span>
                </h3>
                <p className="text-sm admin-text-light mt-1">Most active cities within your primary markets</p>
              </div>
              <div className="p-4 lg:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {topCountriesWithCities.slice(0, 4).map((country, countryIndex) => (
                    <div key={`cities-${country.country}-${countryIndex}`} className="space-y-3">
                      <div className="flex items-center justify-between border-b admin-border pb-2">
                        <h4 className="font-semibold admin-text flex items-center space-x-2">
                          <Globe className="h-4 w-4 admin-text-light" />
                          <span>{country.country}</span>
                        </h4>
                        <span className="text-sm admin-text-light">{formatNumber(country.totalUsers)} users</span>
                      </div>
                      <div className="space-y-2">
                        {country.cities.slice(0, 3).map((city, cityIndex) => {
                          const cityPercentage = country.totalUsers > 0 ? (city.activeUsers / country.totalUsers) * 100 : 0;
                          return (
                            <div key={`city-${city.city}-${cityIndex}`} className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm admin-text font-medium">{city.city}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold admin-text">{formatNumber(city.activeUsers)}</div>
                                <div className="text-xs admin-text-light">{cityPercentage.toFixed(1)}%</div>
                              </div>
                            </div>
                          );
                        })}
                        {country.cities.length > 3 && (
                          <div className="text-xs admin-text-light text-center pt-1">
                            +{country.cities.length - 3} more cities
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Technology Overview */}
          {technology.browsers && technology.browsers.length > 0 && (
            <motion.div variants={itemVariants} className="admin-card rounded-lg shadow-sm">
              <div className="p-4 lg:p-6 border-b admin-border">
                <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                  <Monitor className="h-5 w-5 text-indigo-600" />
                  <span>Technology Preferences</span>
                </h3>
                <p className="text-sm admin-text-light mt-1">Browser and operating system usage patterns</p>
              </div>
              <div className="p-4 lg:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Top Browsers */}
                  <div>
                    <h4 className="font-semibold admin-text mb-4 flex items-center space-x-2">
                      <Globe className="h-4 w-4 admin-text-light" />
                      <span>Top Browsers</span>
                    </h4>
                    <div className="space-y-3">
                      {technology.browsers.slice(0, 5).map((browser, index) => {
                        const totalSessions = technology.browsers.reduce((sum, b) => sum + b.sessions, 0);
                        const percentage = totalSessions > 0 ? (browser.sessions / totalSessions) * 100 : 0;
                        return (
                          <div key={`browser-${browser.browser}-${index}`} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Monitor className="h-4 w-4 admin-text-light" />
                              <div>
                                <p className="font-medium admin-text text-sm">{browser.browser}</p>
                                <p className="text-xs admin-text-light">{formatNumber(browser.sessions)} sessions</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold admin-text text-sm">{formatPercentage(percentage)}</p>
                              <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
                                <div 
                                  className="bg-indigo-600 h-1 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top Operating Systems */}
                  <div>
                    <h4 className="font-semibold admin-text mb-4 flex items-center space-x-2">
                      <Monitor className="h-4 w-4 admin-text-light" />
                      <span>Operating Systems</span>
                    </h4>
                    <div className="space-y-3">
                      {technology.operatingSystems.slice(0, 5).map((os, index) => {
                        const totalSessions = technology.operatingSystems.reduce((sum, o) => sum + o.sessions, 0);
                        const percentage = totalSessions > 0 ? (os.sessions / totalSessions) * 100 : 0;
                        return (
                          <div key={`os-${os.operatingSystem}-${index}`} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Smartphone className="h-4 w-4 admin-text-light" />
                              <div>
                                <p className="font-medium admin-text text-sm">{os.operatingSystem}</p>
                                <p className="text-xs admin-text-light">{formatNumber(os.sessions)} sessions</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold admin-text text-sm">{formatPercentage(percentage)}</p>
                              <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
                                <div 
                                  className="bg-green-600 h-1 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Detailed Geographic Table */}
          {geographic.length > 0 && (
            <motion.div variants={itemVariants} className="admin-card rounded-lg shadow-sm">
              <div className="p-4 lg:p-6 border-b admin-border">
                <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-indigo-600" />
                  <span>Geographic Performance</span>
                </h3>
                <p className="text-sm admin-text-light mt-1">User distribution and engagement by country</p>
              </div>
              <div className="p-4 lg:p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="border-b admin-border">
                      <tr>
                        <th className="text-left py-3 admin-text font-medium">Country</th>
                        <th className="text-right py-3 admin-text font-medium">Users</th>
                        <th className="text-right py-3 admin-text font-medium">% of Total</th>
                        <th className="text-right py-3 admin-text font-medium">Sessions</th>
                        <th className="text-right py-3 admin-text font-medium">Bounce Rate</th>
                        <th className="text-right py-3 admin-text font-medium">Avg. Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCountries.map((location, index) => {
                        const userPercentage = totalUsers > 0 ? (location.activeUsers / totalUsers) * 100 : 0;
                        
                        return (
                          <motion.tr
                            key={`country-${location.country}-${index}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b last:border-b-0 admin-border hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          >
                            <td className="py-3 pr-4">
                              <div className="flex items-center space-x-2">
                                <Navigation className="h-4 w-4 admin-text-light flex-shrink-0" />
                                <span className="font-medium admin-text">{location.country}</span>
                              </div>
                            </td>
                            <td className="py-3 text-right font-semibold admin-text">{formatNumber(location.activeUsers)}</td>
                            <td className="py-3 text-right admin-text">{userPercentage.toFixed(1)}%</td>
                            <td className="py-3 text-right admin-text">{formatNumber(location.sessions)}</td>
                            <td className="py-3 text-right admin-text">{formatPercentage(location.bounceRate)}</td>
                            <td className="py-3 text-right admin-text">{Math.round(location.avgSessionDuration)}s</td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {geographic.length > 10 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm admin-text-light">
                      Showing top 10 countries. Total: {geographic.length} countries tracked
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Device Details Table */}
          {devices.length > 0 && (
            <motion.div variants={itemVariants} className="admin-card rounded-lg shadow-sm">
              <div className="p-4 lg:p-6 border-b admin-border">
                <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-purple-600" />
                  <span>Device Performance</span>
                </h3>
                <p className="text-sm admin-text-light mt-1">User behavior and engagement by device type</p>
              </div>
              <div className="p-4 lg:p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="border-b admin-border">
                      <tr>
                        <th className="text-left py-3 admin-text font-medium">Device Type</th>
                        <th className="text-right py-3 admin-text font-medium">Sessions</th>
                        <th className="text-right py-3 admin-text font-medium">% of Total</th>
                        <th className="text-right py-3 admin-text font-medium">Users</th>
                        <th className="text-right py-3 admin-text font-medium">Bounce Rate</th>
                        <th className="text-right py-3 admin-text font-medium">Pages/Session</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.map((device, index) => {
                        const DeviceIcon = getDeviceIcon(device.deviceCategory);
                        const sessionPercentage = totalSessions > 0 ? (device.sessions / totalSessions) * 100 : 0;
                        
                        return (
                          <motion.tr
                            key={`device-table-${device.deviceCategory}-${index}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b last:border-b-0 admin-border hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          >
                            <td className="py-3 pr-4">
                              <div className="flex items-center space-x-2">
                                <DeviceIcon className="h-4 w-4 admin-text-light flex-shrink-0" />
                                <span className="font-medium admin-text capitalize">{device.deviceCategory}</span>
                              </div>
                            </td>
                            <td className="py-3 text-right font-semibold admin-text">{formatNumber(device.sessions)}</td>
                            <td className="py-3 text-right admin-text">{sessionPercentage.toFixed(1)}%</td>
                            <td className="py-3 text-right admin-text">{formatNumber(device.activeUsers)}</td>
                            <td className="py-3 text-right admin-text">{formatPercentage(device.bounceRate)}</td>
                            <td className="py-3 text-right admin-text">{device.pagesPerSession?.toFixed(1) || '0.0'}</td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}