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
  X,
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
  
  // Preview-related state
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDateRange, setPreviewDateRange] = useState("");
  const [previewBlobUrl, setPreviewBlobUrl] = useState("");

  const [digestConfig, setDigestConfig] = useState({
    enabled: true,
    recipients: [], // For scheduled digest
    testRecipients: [], // For test digest
    emailTheme: "professional", // Add this line
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
        rejected: false,
        appTrends: true,
        dailyBreakdown: true,
      },
      systemHealth: {
        systemStatus: true,
        emailPerformance: false,
        errorSummary: true,
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
      setLoading(true);
      const response = await fetch("/api/admin/weekly-digest/settings");

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setDigestConfig(data.data);
          console.log("✅ Loaded digest settings:", data.data);
        }
      } else {
        console.error("Failed to load digest settings:", response.statusText);
      }
    } catch (error) {
      console.error("Error loading digest settings:", error);
    } finally {
      setLoading(false);
      setSettingsLoaded(true);
    }
  };

  const saveDigestSettings = async () => {
    try {
      setLoading(true);
      console.log("💾 Saving digest configuration:", digestConfig);

      const response = await fetch("/api/admin/weekly-digest/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digestConfig }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Show success message
        setTestResult({
          success: true,
          message: "Settings saved successfully!",
        });

        // Clear success message after 3 seconds
        setTimeout(() => setTestResult(null), 3000);
      } else {
        setTestResult({
          success: false,
          message: data.message || "Failed to save settings",
        });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setTestResult({
        success: false,
        message: "Network error occurred while saving",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add this component to your WeeklyDigest.jsx file

  const ThemeConfiguration = ({ selectedTheme, onThemeChange, theme }) => {
    const emailThemes = [
      {
        id: "professional",
        name: "Professional",
        description: "Clean, corporate design with traditional layout",
        preview: {
          gradient: "from-blue-600 to-blue-800",
          accent: "bg-blue-600",
          text: "Professional and trustworthy",
        },
        features: [
          "Corporate colors",
          "Traditional layout",
          "Formal typography",
        ],
      },
      {
        id: "minimalist",
        name: "Minimalist",
        description: "Simple, clean design with plenty of white space",
        preview: {
          gradient: "from-gray-700 to-gray-900",
          accent: "bg-gray-600",
          text: "Clean and focused",
        },
        features: ["Minimal design", "Clean typography", "Focused content"],
      },
      {
        id: "modern",
        name: "Modern",
        description: "Vibrant, contemporary design with bold colors",
        preview: {
          gradient: "from-purple-600 to-pink-600",
          accent: "bg-gradient-to-r from-purple-500 to-pink-500",
          text: "Bold and engaging",
        },
        features: ["Vibrant colors", "Modern layout", "Interactive elements"],
      },
    ];

    return (
      <div className="space-y-6">
        <div>
          <h3
            className={`text-lg font-medium mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
          >
            Email Template Theme
          </h3>
          <p
            className={`text-sm mb-6 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
          >
            Choose the visual style for your weekly digest emails
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* PROFESSIONAL THEME CARD */}
          <div
            onClick={() => onThemeChange("professional")}
            className={`relative cursor-pointer transition-all duration-300 ${
              selectedTheme === "professional"
                ? "scale-105 shadow-xl"
                : "hover:scale-102 hover:shadow-lg"
            }`}
          >
            {/* Professional Preview - Corporate & Blocky */}

            {/* Professional Preview - Corporate & Blocky */}
            <div
              className="h-56 bg-white border-2 border-gray-300 overflow-hidden"
              style={{ borderRadius: "0px" }}
            >
              {/* Header - Corporate Navy */}
              <div className="h-16 bg-gradient-to-r from-blue-800 to-blue-900 relative border-t-4 border-blue-800">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white text-xs font-bold tracking-wider">
                    WEEKLY DIGEST
                  </div>
                </div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-0.5 bg-white"></div>
              </div>

              {/* Content Area */}
              <div className="p-4 bg-gray-50">
                {/* Metric Cards - Blocky */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div
                    className="bg-white border-2 border-gray-300 p-2"
                    style={{ borderRadius: "0px" }}
                  >
                    <div className="h-1 bg-blue-800 mb-1"></div>
                    <div className="text-xs font-bold text-blue-800">42</div>
                    <div className="text-xs text-gray-600 font-medium">
                      JOBS
                    </div>
                  </div>
                  <div
                    className="bg-white border-2 border-gray-300 p-2"
                    style={{ borderRadius: "0px" }}
                  >
                    <div className="h-1 bg-blue-800 mb-1"></div>
                    <div className="text-xs font-bold text-blue-800">156</div>
                    <div className="text-xs text-gray-600 font-medium">
                      APPS
                    </div>
                  </div>
                </div>

                {/* Chart Preview */}
                <div className="bg-white border border-gray-300 p-2 mb-2">
                  <div className="flex items-end justify-between h-6 space-x-1">
                    <div
                      className="bg-blue-800 w-2"
                      style={{ height: "60%" }}
                    ></div>
                    <div
                      className="bg-blue-700 w-2"
                      style={{ height: "40%" }}
                    ></div>
                    <div
                      className="bg-blue-800 w-2"
                      style={{ height: "80%" }}
                    ></div>
                    <div
                      className="bg-blue-700 w-2"
                      style={{ height: "30%" }}
                    ></div>
                    <div
                      className="bg-blue-800 w-2"
                      style={{ height: "70%" }}
                    ></div>
                  </div>
                </div>

                {/* Button */}
                <div className="bg-blue-800 text-white text-xs text-center py-1 font-bold">
                  VIEW DASHBOARD
                </div>
              </div>
            </div>

            {/* Selection Indicator */}
            {selectedTheme === "professional" && (
              <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-2 shadow-lg">
                <Check className="w-4 h-4" />
              </div>
            )}

            {/* Theme Info */}
            <div
              className={`mt-4 p-4 h-40 flex flex-col justify-between rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white"} border`}
            >
              <h4
                className={`font-bold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
              >
                Professional
              </h4>
              <p
                className={`text-sm mb-3 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
              >
                Corporate design with sharp edges and traditional styling
              </p>
              <div className="flex flex-wrap gap-1 text-xs">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-sm">
                  Blocky
                </span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-sm">
                  Formal
                </span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-sm">
                  Corporate
                </span>
              </div>
            </div>
          </div>

          {/* MINIMALIST THEME CARD */}
          <div
            onClick={() => onThemeChange("minimalist")}
            className={`relative cursor-pointer transition-all duration-300 ${
              selectedTheme === "minimalist"
                ? "scale-105 shadow-xl"
                : "hover:scale-102 hover:shadow-lg"
            }`}
          >
            {/* Minimalist Preview - Clean & Spacious */}
            {/* Minimalist Preview - Clean & Spacious */}
            <div className="h-56 bg-white border border-gray-200 rounded-sm overflow-hidden shadow-sm">
              {/* Header - Clean Gray */}
              <div className="h-16 bg-gradient-to-b from-gray-600 to-gray-700 relative">
                <div className="absolute inset-0 flex flex-col justify-center px-4">
                  <div className="text-white text-sm font-light">
                    Weekly Review
                  </div>
                  <div className="text-white text-xs opacity-75">
                    Hello there
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="p-6 bg-white">
                {/* Metric Cards - Clean */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 border border-gray-100 rounded-sm p-3 hover:shadow-sm transition-shadow">
                    <div className="text-lg font-semibold text-gray-700 mb-1">
                      42
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      New Jobs
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-sm p-3 hover:shadow-sm transition-shadow">
                    <div className="text-lg font-semibold text-gray-700 mb-1">
                      156
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      Applications
                    </div>
                  </div>
                </div>

                {/* Section Header */}
                <div className="border-b border-gray-200 pb-2 mb-3">
                  <div className="text-sm text-gray-700 font-normal">
                    Performance Overview
                  </div>
                </div>

                {/* Clean Chart */}
                <div className="bg-gray-50 rounded-sm p-3">
                  <div className="flex items-end justify-between h-8 space-x-2">
                    <div
                      className="bg-gray-500 w-3 rounded-sm"
                      style={{ height: "60%" }}
                    ></div>
                    <div
                      className="bg-gray-400 w-3 rounded-sm"
                      style={{ height: "40%" }}
                    ></div>
                    <div
                      className="bg-gray-500 w-3 rounded-sm"
                      style={{ height: "80%" }}
                    ></div>
                    <div
                      className="bg-gray-400 w-3 rounded-sm"
                      style={{ height: "30%" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Selection Indicator */}
            {selectedTheme === "minimalist" && (
              <div className="absolute -top-2 -right-2 bg-gray-500 text-white rounded-full p-2 shadow-lg">
                <Check className="w-4 h-4" />
              </div>
            )}

            {/* Theme Info */}
            <div
              className={`mt-4 p-5 h-40 flex flex-col justify-between rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white"} border`}
            >
              <h4
                className={`font-bold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
              >
                Minimalist
              </h4>
              <p
                className={`text-sm mb-3 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
              >
                Clean design with subtle shadows and plenty of space
              </p>
              <div className="flex flex-wrap gap-1 text-xs">
                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-sm">
                  Clean
                </span>
                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-sm">
                  Spacious
                </span>
                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-sm">
                  Subtle
                </span>
              </div>
            </div>
          </div>

          {/* MODERN THEME CARD */}
          <div
            onClick={() => onThemeChange("modern")}
            className={`relative cursor-pointer transition-all duration-300 ${
              selectedTheme === "modern"
                ? "scale-105 shadow-xl"
                : "hover:scale-102 hover:shadow-lg"
            }`}
          >
            {/* Modern Preview - Vibrant & Rounded */}
            <div className="h-56 bg-white rounded-2xl overflow-hidden shadow-lg border border-purple-100">
              {/* Header - Vibrant Gradient */}
              <div className="h-16 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 relative rounded-t-2xl">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-transparent to-blue-500/20"></div>
                <div className="absolute inset-0 flex flex-col justify-center items-center text-white">
                  <div className="text-sm font-bold">🚀 Weekly Highlights</div>
                  <div className="text-xs opacity-90">Hey there! ✨</div>
                </div>
                {/* Animated glow effect */}
                <div className="absolute top-2 left-2 w-4 h-4 bg-white/30 rounded-full animate-pulse"></div>
              </div>

              {/* Content Area */}
              <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50">
                {/* Metric Cards - Glassmorphism */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/70 backdrop-blur-sm border border-purple-200 rounded-xl p-3 shadow-lg">
                    <div className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      42
                    </div>
                    <div className="text-xs text-gray-600 font-medium">
                      NEW JOBS ✨
                    </div>
                  </div>
                  <div className="bg-white/70 backdrop-blur-sm border border-purple-200 rounded-xl p-3 shadow-lg">
                    <div className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      156
                    </div>
                    <div className="text-xs text-gray-600 font-medium">
                      APPS 🎉
                    </div>
                  </div>
                </div>

                {/* Vibrant Chart */}
                <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 mb-3 border border-purple-100">
                  <div className="flex items-end justify-between h-8 space-x-1">
                    <div
                      className="bg-gradient-to-t from-purple-600 to-purple-400 w-2 rounded-full"
                      style={{ height: "60%" }}
                    ></div>
                    <div
                      className="bg-gradient-to-t from-pink-500 to-pink-300 w-2 rounded-full"
                      style={{ height: "40%" }}
                    ></div>
                    <div
                      className="bg-gradient-to-t from-purple-600 to-purple-400 w-2 rounded-full"
                      style={{ height: "80%" }}
                    ></div>
                    <div
                      className="bg-gradient-to-t from-blue-500 to-blue-300 w-2 rounded-full"
                      style={{ height: "30%" }}
                    ></div>
                    <div
                      className="bg-gradient-to-t from-pink-500 to-pink-300 w-2 rounded-full"
                      style={{ height: "70%" }}
                    ></div>
                  </div>
                </div>

                {/* Animated Button */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs text-center py-2 rounded-xl font-bold shadow-lg">
                  VIEW DASHBOARD 🚀
                </div>
              </div>
            </div>

            {/* Selection Indicator */}
            {selectedTheme === "modern" && (
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full p-2 shadow-lg">
                <Check className="w-4 h-4" />
              </div>
            )}

            {/* Theme Info */}
            <div
              className={`mt-4 p-5 h-40 flex flex-col justify-between rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white"} border`}
            >
              <h4
                className={`font-bold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
              >
                Modern
              </h4>
              <p
                className={`text-sm mb-3 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
              >
                Vibrant gradients with glassmorphism and animations
              </p>
              <div className="flex flex-wrap gap-1 text-xs">
                <span className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 px-2 py-1 rounded-lg">
                  Vibrant
                </span>
                <span className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 px-2 py-1 rounded-lg">
                  Animated
                </span>
                <span className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 px-2 py-1 rounded-lg">
                  Bold
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Theme Description */}
        {selectedTheme && (
          <div
            className={`p-4 rounded-lg border ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="flex items-start space-x-3">
              <div
                className={`p-2 rounded-lg ${
                  theme === "dark" ? "bg-blue-900/20" : "bg-blue-100"
                }`}
              >
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h5
                  className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                >
                  {emailThemes.find((t) => t.id === selectedTheme)?.name} Theme
                  Selected
                </h5>
                <p
                  className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                >
                  Your weekly digest emails will use the {selectedTheme} design
                  template. Recipients will see this visual style when they
                  receive their digest.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleSendTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // Save current settings first (including test recipients)
      await saveDigestSettings();

      // Then send test using the new test endpoint
      const response = await fetch("/api/admin/weekly-digest/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          message: data.testMode 
            ? `Test digest sent to ${data.sent} test recipient(s)! Check your email to review the digest.`
            : `Test digest sent to ${data.sent} recipient(s) using your current settings!`,
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

  const handlePreview = async () => {
    setPreviewLoading(true);
    setShowPreview(true);
    setPreviewHtml("");
    
    // Clean up any existing blob URL
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl("");
    }

    try {
      console.log("🚀 Starting preview generation...");
      console.log("📋 Digest config:", JSON.stringify(digestConfig, null, 2));
      
      const response = await fetch("/api/admin/weekly-digest/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digestConfig }),
      });

      console.log("📡 Response status:", response.status);
      const data = await response.json();
      console.log("📦 Response data:", { success: data.success, htmlLength: data.html?.length, message: data.message });

      if (response.ok && data.success) {
        console.log("✅ Preview generated successfully, HTML length:", data.html?.length);
        console.log("📅 Date range:", data.dateRange);
        console.log("🔍 HTML preview (first 500 chars):", data.html?.substring(0, 500));
        
        // Validate HTML structure
        if (data.html && data.html.includes('<!DOCTYPE html>')) {
          console.log("✅ HTML has proper DOCTYPE");
        } else {
          console.log("⚠️ HTML missing DOCTYPE or malformed");
        }
        
        // Check if HTML seems to have minimal content
        const bodyContent = data.html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || '';
        const textContent = bodyContent.replace(/<[^>]*>/g, '').trim();
        
        if (textContent.length < 100) {
          console.log("⚠️ HTML appears to have minimal content, likely due to disabled sections");
          setPreviewHtml(`
            <!DOCTYPE html>
            <html>
            <head><title>Preview Notice</title></head>
            <body style="font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5;">
              <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #f59e0b; margin-bottom: 20px;">⚠️ Preview Notice</h2>
                <p>The email preview appears mostly empty because most sections are currently disabled in your configuration.</p>
                <p><strong>Currently enabled:</strong></p>
                <ul>
                  ${Object.entries(digestConfig.sections).filter(([key, value]) => value).map(([key]) => `<li>${key.replace(/([A-Z])/g, ' $1').toLowerCase()}</li>`).join('')}
                </ul>
                <p><strong>To see more content:</strong></p>
                <ol>
                  <li>Enable more sections (Job Metrics, User Metrics, Application Data)</li>
                  <li>Enable customizations within each section</li>
                  <li>Click Preview again</li>
                </ol>
                <div style="margin-top: 30px; padding: 20px; background: #f9f9f9; border-radius: 4px;">
                  <h4>Generated HTML Info:</h4>
                  <p>Length: ${data.html.length} characters</p>
                  <p>Content preview: ${textContent.substring(0, 200)}...</p>
                </div>
              </div>
            </body>
            </html>
          `);
        } else {
          // Set the actual HTML content and create blob URL
          setPreviewHtml(data.html);
          
          // Create blob URL for iframe
          const blob = new Blob([data.html], { type: 'text/html' });
          const blobUrl = URL.createObjectURL(blob);
          setPreviewBlobUrl(blobUrl);
          console.log("🔗 Created blob URL:", blobUrl);
        }
        setPreviewDateRange(data.dateRange);
      } else {
        console.error("❌ Preview API error:", data);
        setPreviewHtml(`
          <div style="padding: 20px; text-align: center; color: #ef4444;">
            <h2>Preview Error</h2>
            <p>${data.message || "Failed to generate preview"}</p>
            <pre style="text-align: left; font-size: 12px; margin-top: 10px;">${JSON.stringify(data, null, 2)}</pre>
          </div>
        `);
      }
    } catch (error) {
      console.error("❌ Preview error:", error);
      setPreviewHtml(`
        <div style="padding: 20px; text-align: center; color: #ef4444;">
          <h2>Preview Error</h2>
          <p>Network error occurred while generating preview</p>
        </div>
      `);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    // Clean up blob URL when closing
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl("");
    }
  };

  // Show loading state until settings are loaded
  if (!settingsLoaded) {
    return (
      <div
        className={`p-6 space-y-6 ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"} min-h-screen`}
      >
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            Loading digest settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-6 space-y-6 ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"} min-h-screen`}
    >
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1
            className={`text-xl sm:text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
          >
            Weekly Digest
          </h1>
          <p
            className={`mt-1 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
          >
            Configure and manage your weekly digest reports
          </p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
          <button
            onClick={saveDigestSettings}
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium disabled:opacity-50"
          >
            <Settings className="w-4 h-4" />
            <span>{loading ? "Saving..." : "Save Settings"}</span>
          </button>

          <div className="flex space-x-2">
            <button 
              onClick={handlePreview}
              disabled={previewLoading}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-sm font-medium admin-text bg-white dark:bg-gray-800 disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">{previewLoading ? "Loading..." : "Preview"}</span>
            </button>

            <button
              onClick={handleSendTest}
              disabled={testing}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-sm font-medium admin-text bg-white dark:bg-gray-800"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">{testing ? "Sending..." : "Send Test"}</span>
            </button>
          </div>
        </div>
      </div>

      {testResult && (
        <div
          className={`rounded-lg p-4 mb-6 ${
            testResult.success
              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
              : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
          }`}
        >
          <div className="flex items-center">
            {testResult.success ? (
              <Check className="w-5 h-5 mr-2" />
            ) : (
              <X className="w-5 h-5 mr-2" />
            )}
            <span className="font-medium">{testResult.message}</span>
          </div>
        </div>
      )}
      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="xl:col-span-2">
          <div
            className={`rounded-lg shadow border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
          >
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h3
                className={`flex items-center text-base sm:text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Digest Configuration
              </h3>
            </div>

            <div className="p-4 sm:p-6">
              <div className="w-full">
                <div
                  className={`grid w-full grid-cols-2 sm:grid-cols-4 rounded-lg p-1 gap-1 sm:gap-0 ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}
                >
                  <button
                    onClick={() => setActiveTab("content")}
                    className={`px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                      activeTab === "content"
                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    Content
                  </button>
                  <button
                    onClick={() => setActiveTab("theme")}
                    className={`px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                      activeTab === "theme"
                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    Theme
                  </button>
                  <button
                    onClick={() => setActiveTab("recipients")}
                    className={`px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                      activeTab === "recipients"
                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    Recipients
                  </button>
                  <button
                    onClick={() => setActiveTab("schedule")}
                    className={`px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
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
                      testRecipients={digestConfig.testRecipients}
                      onRecipientsChange={(recipients) =>
                        setDigestConfig((prev) => ({ ...prev, recipients }))
                      }
                      onTestRecipientsChange={(testRecipients) =>
                        setDigestConfig((prev) => ({ ...prev, testRecipients }))
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

                {activeTab === "theme" && (
                  <div className="space-y-4 mt-6">
                    <ThemeConfiguration
                      selectedTheme={digestConfig.emailTheme}
                      onThemeChange={(theme) =>
                        setDigestConfig((prev) => ({
                          ...prev,
                          emailTheme: theme,
                        }))
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

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
          {/* Blurred Backdrop */}
          <div className="fixed inset-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm" onClick={closePreview}></div>
          
          {/* Modal Content */}
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden z-10 border border-gray-200 dark:border-gray-700">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`text-lg font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      Email Preview
                    </h3>
                    {previewDateRange && (
                      <p className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                        Week of {previewDateRange}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={closePreview}
                    className={`rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                  {previewLoading ? (
                    <div className="flex items-center justify-center h-[500px] sm:h-[700px] lg:h-[800px] bg-gray-50 dark:bg-gray-700">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                          Generating preview with your current settings...
                        </p>
                      </div>
                    </div>
                  ) : previewHtml ? (
                    <div>
                      <div className="text-xs text-gray-500 p-2 border-b">
                        HTML Length: {previewHtml.length} characters
                      </div>
                      <iframe
                        src={previewBlobUrl || `data:text/html;charset=utf-8,${encodeURIComponent(previewHtml)}`}
                        className="w-full h-[500px] sm:h-[700px] lg:h-[800px]"
                        title="Email Preview"
                        style={{ minHeight: "700px", border: "1px solid #ccc", background: "white" }}
                        onLoad={(e) => {
                          console.log("🖼️ Iframe loaded successfully");
                          console.log("🔍 Iframe src:", e.target.src?.substring(0, 100));
                          console.log("🔍 Using blob URL:", !!previewBlobUrl);
                          try {
                            if (e.target.contentDocument) {
                              console.log("✅ Can access iframe content");
                              console.log("🔍 Iframe body content:", e.target.contentDocument?.body?.innerHTML?.substring(0, 200));
                            } else {
                              console.log("❌ Cannot access iframe contentDocument (still null)");
                            }
                          } catch (err) {
                            console.log("❌ Cannot access iframe content (security):", err.message);
                          }
                        }}
                        onError={(e) => console.error("🖼️ Iframe error:", e)}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[500px] sm:h-[700px] lg:h-[800px] bg-gray-50 dark:bg-gray-700">
                      <p className="text-gray-500">No preview content available</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Use the preview to review your weekly digest email before sending
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => {
                      const newWindow = window.open('', '_blank');
                      newWindow.document.write(previewHtml);
                      newWindow.document.close();
                    }}
                    className="inline-flex items-center justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Open in New Tab
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
      )}
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
          key: "dailyBreakdown",
          label: "Daily Breakdown",
          description: "Applications received each day",
          category: "insights",
        },
        {
          key: "appTrends",
          label: "Application Trends",
          description: "Week-over-week application trends",
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
          description: "Overall system health based on error rates and email performance",
          category: "overview",
        },
        {
          key: "emailPerformance",
          label: "Email Performance",
          description: "Email success and failure rates from this week",
          category: "technical",
        },
        {
          key: "errorSummary",
          label: "Error Summary",
          description: "Recent system errors and warnings",
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
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

const RecipientsConfiguration = ({ recipients, testRecipients, onRecipientsChange, onTestRecipientsChange, theme }) => {
  const [userFilter, setUserFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeRecipientTab, setActiveRecipientTab] = useState("scheduled");

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
    if (activeRecipientTab === "scheduled") {
      const newRecipients = recipients.includes(userId)
        ? recipients.filter((id) => id !== userId)
        : [...recipients, userId];
      onRecipientsChange(newRecipients);
    } else {
      const newTestRecipients = testRecipients.includes(userId)
        ? testRecipients.filter((id) => id !== userId)
        : [...testRecipients, userId];
      onTestRecipientsChange(newTestRecipients);
    }
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

  const currentRecipients = activeRecipientTab === "scheduled" ? recipients : testRecipients;
  const currentOnChange = activeRecipientTab === "scheduled" ? onRecipientsChange : onTestRecipientsChange;

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
            {activeRecipientTab === "scheduled" ? recipients.length : testRecipients.length} selected
          </span>
        </div>
      </div>

      {/* Recipient Type Tabs */}
      <div className={`grid w-full grid-cols-2 rounded-lg p-1 gap-1 ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
        <button
          onClick={() => setActiveRecipientTab("scheduled")}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeRecipientTab === "scheduled"
              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Scheduled Recipients ({recipients.length})
        </button>
        <button
          onClick={() => setActiveRecipientTab("test")}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeRecipientTab === "test"
              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Test Recipients ({testRecipients.length})
        </button>
      </div>

      {/* Description based on active tab */}
      <div className={`p-3 rounded-lg border ${
        activeRecipientTab === "scheduled" 
          ? theme === "dark" ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-200"
          : theme === "dark" ? "bg-purple-900/20 border-purple-800" : "bg-purple-50 border-purple-200"
      }`}>
        {activeRecipientTab === "scheduled" ? (
          <p className={`text-sm ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>
            📅 These users will receive the weekly digest automatically according to your schedule. 
            These are the recipients for the automated weekly emails.
          </p>
        ) : (
          <p className={`text-sm ${theme === "dark" ? "text-purple-200" : "text-purple-800"}`}>
            🧪 These users will receive test emails when you click "Send Test". 
            This allows you to preview the digest without affecting your scheduled recipients.
          </p>
        )}
      </div>

      {/* Search and Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              currentOnChange([
                ...new Set([...currentRecipients, ...filteredUsers.map((u) => u.id)]),
              ])
            }
            disabled={filteredUsers.length === 0}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Select All
          </button>
          <button
            onClick={() => currentOnChange([])}
            disabled={currentRecipients.length === 0}
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
            const isSelected = currentRecipients.includes(user.id);
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
      {activeRecipientTab === "scheduled" && recipients.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center">
            <X className="h-4 w-4 mr-2" />
            No scheduled recipients selected. The automatic digest will not be sent.
          </p>
        </div>
      )}

      {activeRecipientTab === "test" && testRecipients.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center">
            <X className="h-4 w-4 mr-2" />
            No test recipients selected. Test emails will not be sent.
          </p>
        </div>
      )}

      {activeRecipientTab === "scheduled" && recipients.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <p className="text-sm text-green-800 dark:text-green-200 flex items-center">
            <Check className="h-4 w-4 mr-2" />
            Weekly digest will be sent automatically to {recipients.length} recipient
            {recipients.length !== 1 ? "s" : ""}.
          </p>
        </div>
      )}

      {activeRecipientTab === "test" && testRecipients.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <p className="text-sm text-green-800 dark:text-green-200 flex items-center">
            <Check className="h-4 w-4 mr-2" />
            Test digest will be sent to {testRecipients.length} recipient
            {testRecipients.length !== 1 ? "s" : ""} when you click "Send Test".
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
  const [recentDigests, setRecentDigests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecentDigests();
  }, []);

  const fetchRecentDigests = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/weekly-digest/recent");
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRecentDigests(data.data);
        } else {
          setError("Failed to load recent digests");
        }
      } else {
        setError("Failed to load recent digests");
      }
    } catch (err) {
      console.error("Error fetching recent digests:", err);
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

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
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`p-3 rounded-lg animate-pulse ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}
              >
                <div className="h-4 bg-gray-400 rounded mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className={`text-sm ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>
              {error}
            </p>
            <button
              onClick={fetchRecentDigests}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Try again
            </button>
          </div>
        ) : recentDigests.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className={`w-12 h-12 mx-auto mb-4 ${theme === "dark" ? "text-gray-600" : "text-gray-400"}`} />
            <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              No digests sent yet
            </p>
            <p className={`text-xs mt-1 ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
              Send your first digest to see it here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentDigests.map((digest) => (
              <div
                key={digest.id}
                className={`p-3 rounded-lg ${theme === "dark" ? "bg-gray-700" : "bg-gray-50"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-sm font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                      >
                        {digest.displayName}
                      </span>
                      {digest.digestType === 'test' && (
                        <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-full">
                          TEST
                        </span>
                      )}
                      {digest.status === 'failed' && (
                        <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-full">
                          FAILED
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"} mt-1`}
                    >
                      {digest.displayStatus} • {digest.sentAgo}
                    </p>
                    {digest.sender.name !== 'System' && (
                      <p
                        className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-500"} mt-0.5`}
                      >
                        Sent by {digest.sender.name}
                      </p>
                    )}
                  </div>
                  <button 
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    title="View digest details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyDigest;
