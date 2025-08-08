"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Settings,
  CheckCircle,
  AlertCircle,
  Zap,
  Trash2,
  ExternalLink,
  Loader2,
  Globe,
  Shield
} from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import GA4ConfigurationWizard from "./GA4ConfigurationWizard";

export default function AnalyticsConfigurationCard() {
  const { getButtonClasses } = useThemeClasses();
  
  // State
  const [showWizard, setShowWizard] = useState(false);
  const [configuration, setConfiguration] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Load existing configuration
  const loadConfiguration = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/analytics/configure');
      const data = await response.json();
      
      if (data.success && data.configured) {
        setConfiguration(data.config);
      } else {
        setConfiguration(null);
      }
    } catch (error) {
      console.error('Failed to load analytics configuration:', error);
      setConfiguration(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfiguration();
  }, []);

  const handleConfigureClick = () => {
    setShowWizard(true);
  };

  const handleWizardSuccess = () => {
    setShowWizard(false);
    loadConfiguration(); // Reload configuration
    
    // Notify the layout to refresh analytics navigation
    window.dispatchEvent(new CustomEvent('analyticsConfigurationChanged'));
  };

  const handleWizardClose = () => {
    setShowWizard(false);
  };

  const handleTestConnection = async () => {
    if (!configuration) return;
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // For testing, we need to decrypt and use the stored credentials
      // This would typically call a separate test endpoint that uses stored config
      const response = await fetch('/api/admin/analytics/test-stored-connection', {
        method: 'POST'
      });
      
      const result = await response.json();
      setTestResult(result);
      
      // Update configuration status if needed
      if (result.success !== (configuration.connectionStatus === 'connected')) {
        loadConfiguration();
      }
      
    } catch (error) {
      setTestResult({
        success: false,
        error: "Failed to test connection"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Analytics? This will remove all configuration and disable analytics tracking.')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const response = await fetch('/api/admin/analytics/configure', {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setConfiguration(null);
        setTestResult(null);
        
        // Notify the layout to refresh analytics navigation
        window.dispatchEvent(new CustomEvent('analyticsConfigurationChanged'));
      }
    } catch (error) {
      console.error('Failed to disconnect analytics:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-card rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin admin-text-light" />
          <span className="ml-2 admin-text-light">Loading configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`admin-card rounded-lg border ${
          configuration && configuration.connectionStatus === 'connected'
            ? 'border-green-200 dark:border-green-700 bg-green-50/30 dark:bg-green-900/10 border-l-4 border-l-green-400 dark:border-l-green-500'
            : 'admin-border'
        }`}
      >
        {!configuration ? (
          // Not configured state
          <div className="p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold admin-text">Google Analytics 4</h3>
                <p className="text-sm admin-text-light">Connect your GA4 property to unlock powerful analytics insights</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Setup Required</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Configure Google Analytics 4 integration to enable advanced analytics features in your dashboard.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Globe className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-xs font-medium admin-text">Real-time Analytics</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Zap className="h-6 w-6 text-green-500 mx-auto mb-2" />
                  <p className="text-xs font-medium admin-text">Job Performance</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Shield className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                  <p className="text-xs font-medium admin-text">User Journey</p>
                </div>
              </div>
              
              <div className="pt-4">
                <button
                  onClick={handleConfigureClick}
                  className={`w-full flex items-center justify-center px-6 py-3 rounded-lg ${getButtonClasses("primary")}`}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Google Analytics
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Configured state
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold admin-text">Google Analytics 4 Connected</h3>
                  <p className="text-sm admin-text-light">Analytics tracking is active and collecting data</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  configuration.connectionStatus === 'connected' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200'
                }`}>
                  {configuration.connectionStatus === 'connected' ? 'Connected' : 'Pending'}
                </span>
              </div>
            </div>

            {/* Configuration Details */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs font-medium admin-text-light uppercase tracking-wide mb-1">Property ID</p>
                  <p className="font-mono text-sm admin-text">{configuration.propertyId}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs font-medium admin-text-light uppercase tracking-wide mb-1">Measurement ID</p>
                  <p className="font-mono text-sm admin-text">{configuration.measurementId}</p>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs font-medium admin-text-light uppercase tracking-wide mb-1">Service Account</p>
                <p className="text-sm admin-text">{configuration.serviceAccountEmail}</p>
              </div>

              {configuration.lastTestAt && (
                <div className="text-xs admin-text-light">
                  Last tested: {new Date(configuration.lastTestAt).toLocaleString()}
                </div>
              )}
            </div>

            {/* Test Result */}
            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg mb-4 ${
                  testResult.success
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-medium text-sm ${
                      testResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                    }`}>
                      {testResult.success ? 'Connection Test Successful' : 'Connection Test Failed'}
                    </p>
                    <p className={`text-sm ${
                      testResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                    }`}>
                      {testResult.success 
                        ? `Analytics data is accessible. Active users: ${testResult.data?.activeUsers || 'N/A'}`
                        : testResult.error || 'Unknown error occurred'
                      }
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg ${getButtonClasses("secondary")}`}
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
              
              <button
                onClick={() => setShowWizard(true)}
                className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg ${getButtonClasses("primary")}`}
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Configuration
              </button>
              
              <button
                onClick={handleDisconnect}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {isDeleting ? 'Removing...' : 'Disconnect'}
              </button>
            </div>

            {/* Quick Links */}
            <div className="mt-6 pt-4 border-t admin-border">
              <div className="flex items-center justify-between text-sm">
                <span className="admin-text-light">Need help with configuration?</span>
                <a
                  href="https://analytics.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <span>Open Google Analytics</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Configuration Wizard Modal */}
      {showWizard && (
        <GA4ConfigurationWizard
          onClose={handleWizardClose}
          onSuccess={handleWizardSuccess}
        />
      )}
    </>
  );
}