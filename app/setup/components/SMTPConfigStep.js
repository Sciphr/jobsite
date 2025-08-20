"use client";

import { useState } from "react";

const SMTP_PRESETS = {
  gmail: {
    name: "Gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requiresAuth: true,
  },
  outlook: {
    name: "Outlook/Hotmail",
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false,
    requiresAuth: true,
  },
  yahoo: {
    name: "Yahoo Mail",
    host: "smtp.mail.yahoo.com",
    port: 587,
    secure: false,
    requiresAuth: true,
  },
  sendgrid: {
    name: "SendGrid",
    host: "smtp.sendgrid.net",
    port: 587,
    secure: false,
    requiresAuth: true,
  },
  mailgun: {
    name: "Mailgun",
    host: "smtp.mailgun.org",
    port: 587,
    secure: false,
    requiresAuth: true,
  },
  custom: {
    name: "Custom SMTP",
    host: "",
    port: 587,
    secure: false,
    requiresAuth: true,
  },
};

export default function SMTPConfigStep({ onComplete, onBack, canGoBack }) {
  const [preset, setPreset] = useState("gmail");
  const [formData, setFormData] = useState({
    enabled: true,
    host: SMTP_PRESETS.gmail.host,
    port: SMTP_PRESETS.gmail.port,
    secure: SMTP_PRESETS.gmail.secure,
    requiresAuth: SMTP_PRESETS.gmail.requiresAuth,
    username: "",
    password: "",
    fromName: "",
    fromEmail: "",
  });
  const [errors, setErrors] = useState({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handlePresetChange = (presetKey) => {
    setPreset(presetKey);
    const presetConfig = SMTP_PRESETS[presetKey];
    setFormData(prev => ({
      ...prev,
      host: presetConfig.host,
      port: presetConfig.port,
      secure: presetConfig.secure,
      requiresAuth: presetConfig.requiresAuth,
    }));
    setErrors({});
    setTestResult(null);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear specific field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    setTestResult(null);
  };

  const validateForm = () => {
    const newErrors = {};

    if (formData.enabled) {
      if (!formData.host.trim()) {
        newErrors.host = "SMTP host is required";
      }

      if (!formData.port || formData.port < 1 || formData.port > 65535) {
        newErrors.port = "Please enter a valid port number (1-65535)";
      }

      if (formData.requiresAuth) {
        if (!formData.username.trim()) {
          newErrors.username = "Username is required for authenticated SMTP";
        }
        if (!formData.password.trim()) {
          newErrors.password = "Password is required for authenticated SMTP";
        }
      }

      if (!formData.fromName.trim()) {
        newErrors.fromName = "From name is required";
      }

      if (!formData.fromEmail.trim()) {
        newErrors.fromEmail = "From email is required";
      } else if (!/\S+@\S+\.\S+/.test(formData.fromEmail)) {
        newErrors.fromEmail = "Please enter a valid email address";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestEmail = async () => {
    if (!validateForm()) {
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/setup/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      
      if (response.ok) {
        setTestResult({ success: true, message: result.message });
      } else {
        setTestResult({ success: false, message: result.error || "SMTP test failed" });
      }
    } catch (error) {
      console.error("Error testing SMTP:", error);
      setTestResult({ success: false, message: "Failed to test SMTP configuration" });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Pass SMTP configuration to next step
    onComplete(formData);
  };

  const handleSkip = () => {
    // Pass disabled SMTP configuration
    onComplete({ enabled: false });
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Email Configuration</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure SMTP settings to send emails from your application
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
        {/* Enable/Disable Email */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Enable Email Functionality</h3>
            <p className="text-sm text-gray-500">Turn on email notifications and communications</p>
          </div>
          <button
            type="button"
            onClick={() => handleInputChange("enabled", !formData.enabled)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              formData.enabled ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                formData.enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {formData.enabled && (
          <>
            {/* SMTP Preset */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Provider
              </label>
              <select
                value={preset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(SMTP_PRESETS).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.name}
                  </option>
                ))}
              </select>
            </div>

            {/* SMTP Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="host" className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Host *
                </label>
                <input
                  type="text"
                  id="host"
                  value={formData.host}
                  onChange={(e) => handleInputChange("host", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.host ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="smtp.example.com"
                />
                {errors.host && (
                  <p className="mt-1 text-sm text-red-600">{errors.host}</p>
                )}
              </div>

              <div>
                <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-2">
                  Port *
                </label>
                <input
                  type="number"
                  id="port"
                  value={formData.port}
                  onChange={(e) => handleInputChange("port", parseInt(e.target.value) || "")}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.port ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="587"
                  min="1"
                  max="65535"
                />
                {errors.port && (
                  <p className="mt-1 text-sm text-red-600">{errors.port}</p>
                )}
              </div>
            </div>

            {/* Authentication */}
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requiresAuth"
                  checked={formData.requiresAuth}
                  onChange={(e) => handleInputChange("requiresAuth", e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="requiresAuth" className="ml-2 block text-sm text-gray-900">
                  Requires authentication
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="secure"
                  checked={formData.secure}
                  onChange={(e) => handleInputChange("secure", e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="secure" className="ml-2 block text-sm text-gray-900">
                  Use SSL/TLS (secure connection)
                </label>
              </div>
            </div>

            {formData.requiresAuth && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                    Username *
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleInputChange("username", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.username ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="your-email@example.com"
                  />
                  {errors.username && (
                    <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.password ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="Your SMTP password"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>
              </div>
            )}

            {/* From Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fromName" className="block text-sm font-medium text-gray-700 mb-2">
                  From Name *
                </label>
                <input
                  type="text"
                  id="fromName"
                  value={formData.fromName}
                  onChange={(e) => handleInputChange("fromName", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.fromName ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="Your Company Name"
                />
                {errors.fromName && (
                  <p className="mt-1 text-sm text-red-600">{errors.fromName}</p>
                )}
              </div>

              <div>
                <label htmlFor="fromEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  From Email *
                </label>
                <input
                  type="email"
                  id="fromEmail"
                  value={formData.fromEmail}
                  onChange={(e) => handleInputChange("fromEmail", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.fromEmail ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="noreply@yourcompany.com"
                />
                {errors.fromEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.fromEmail}</p>
                )}
              </div>
            </div>

            {/* Test Email */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Test Configuration</h4>
                  <p className="text-sm text-gray-500">Send a test email to verify your settings</p>
                </div>
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={testing}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testing ? "Testing..." : "Send Test Email"}
                </button>
              </div>

              {testResult && (
                <div className={`p-4 rounded-md ${
                  testResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                }`}>
                  <p className={`text-sm ${
                    testResult.success ? "text-green-600" : "text-red-600"
                  }`}>
                    {testResult.message}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-6">
          <button
            type="button"
            onClick={onBack}
            disabled={!canGoBack}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleSkip}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Skip for Now
            </button>
            
            <button
              type="submit"
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Continue
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}