"use client";

import { useState } from "react";

export default function CompanySettingsStep({ onComplete, onBack, canGoBack }) {
  const [formData, setFormData] = useState({
    companyName: "",
    companyWebsite: "",
    companyDescription: "",
    timezone: "America/Toronto",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12",
    currency: "USD",
    language: "en",
    allowPublicRegistration: false,
    requireEmailVerification: true,
    defaultUserRole: "user",
    applicationUrl: "",
  });
  const [errors, setErrors] = useState({});

  const timezones = [
    { value: "America/Toronto", label: "Eastern Time (Toronto)" },
    { value: "America/New_York", label: "Eastern Time (New York)" },
    { value: "America/Chicago", label: "Central Time" },
    { value: "America/Denver", label: "Mountain Time" },
    { value: "America/Los_Angeles", label: "Pacific Time" },
    { value: "America/Vancouver", label: "Pacific Time (Vancouver)" },
    { value: "Europe/London", label: "GMT (London)" },
    { value: "Europe/Paris", label: "CET (Paris)" },
    { value: "Asia/Tokyo", label: "JST (Tokyo)" },
    { value: "Australia/Sydney", label: "AEST (Sydney)" },
  ];

  const currencies = [
    { value: "USD", label: "US Dollar ($)" },
    { value: "CAD", label: "Canadian Dollar (C$)" },
    { value: "EUR", label: "Euro (€)" },
    { value: "GBP", label: "British Pound (£)" },
    { value: "JPY", label: "Japanese Yen (¥)" },
    { value: "AUD", label: "Australian Dollar (A$)" },
  ];

  const languages = [
    { value: "en", label: "English" },
    { value: "fr", label: "French" },
    { value: "es", label: "Spanish" },
    { value: "de", label: "German" },
    { value: "it", label: "Italian" },
    { value: "pt", label: "Portuguese" },
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear specific field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = "Company name is required";
    }

    if (formData.companyWebsite && !isValidUrl(formData.companyWebsite)) {
      newErrors.companyWebsite = "Please enter a valid website URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url) => {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Normalize website URL
    let website = formData.companyWebsite.trim();
    if (website && !website.startsWith('http')) {
      website = `https://${website}`;
    }

    const companyData = {
      ...formData,
      companyWebsite: website,
      companyName: formData.companyName.trim(),
      companyDescription: formData.companyDescription.trim(),
    };

    onComplete(companyData);
  };

  const handleSkip = () => {
    // Pass minimal company data
    onComplete({
      companyName: "My Company",
      timezone: "America/Toronto",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12",
      currency: "USD",
      language: "en",
      allowPublicRegistration: false,
      requireEmailVerification: true,
      defaultUserRole: "user",
    });
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Company & Application Settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure your company information and application preferences
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
        {/* Company Information */}
        <div className="space-y-6">
          <h3 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2">
            Company Information
          </h3>

          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              id="companyName"
              value={formData.companyName}
              onChange={(e) => handleInputChange("companyName", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.companyName ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="Enter your company name"
            />
            {errors.companyName && (
              <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
            )}
          </div>

          <div>
            <label htmlFor="companyWebsite" className="block text-sm font-medium text-gray-700 mb-2">
              Company Website
            </label>
            <input
              type="text"
              id="companyWebsite"
              value={formData.companyWebsite}
              onChange={(e) => handleInputChange("companyWebsite", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.companyWebsite ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="https://www.yourcompany.com"
            />
            {errors.companyWebsite && (
              <p className="mt-1 text-sm text-red-600">{errors.companyWebsite}</p>
            )}
          </div>

          <div>
            <label htmlFor="companyDescription" className="block text-sm font-medium text-gray-700 mb-2">
              Company Description
            </label>
            <textarea
              id="companyDescription"
              rows={3}
              value={formData.companyDescription}
              onChange={(e) => handleInputChange("companyDescription", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of your company..."
            />
          </div>
        </div>

        {/* Regional Settings */}
        <div className="space-y-6">
          <h3 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2">
            Regional Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                id="timezone"
                value={formData.timezone}
                onChange={(e) => handleInputChange("timezone", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timezones.map(tz => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                id="currency"
                value={formData.currency}
                onChange={(e) => handleInputChange("currency", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {currencies.map(curr => (
                  <option key={curr.value} value={curr.value}>
                    {curr.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dateFormat" className="block text-sm font-medium text-gray-700 mb-2">
                Date Format
              </label>
              <select
                id="dateFormat"
                value={formData.dateFormat}
                onChange={(e) => handleInputChange("dateFormat", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (European)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
              </select>
            </div>

            <div>
              <label htmlFor="timeFormat" className="block text-sm font-medium text-gray-700 mb-2">
                Time Format
              </label>
              <select
                id="timeFormat"
                value={formData.timeFormat}
                onChange={(e) => handleInputChange("timeFormat", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="12">12-hour (AM/PM)</option>
                <option value="24">24-hour</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
              Default Language
            </label>
            <select
              id="language"
              value={formData.language}
              onChange={(e) => handleInputChange("language", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {languages.map(lang => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* User Management Settings */}
        <div className="space-y-6">
          <h3 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2">
            User Management
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Allow Public Registration</h4>
                <p className="text-sm text-gray-500">Let users register without invitation</p>
              </div>
              <button
                type="button"
                onClick={() => handleInputChange("allowPublicRegistration", !formData.allowPublicRegistration)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  formData.allowPublicRegistration ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.allowPublicRegistration ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Require Email Verification</h4>
                <p className="text-sm text-gray-500">Users must verify their email before accessing the application</p>
              </div>
              <button
                type="button"
                onClick={() => handleInputChange("requireEmailVerification", !formData.requireEmailVerification)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  formData.requireEmailVerification ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.requireEmailVerification ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div>
              <label htmlFor="defaultUserRole" className="block text-sm font-medium text-gray-700 mb-2">
                Default User Role
              </label>
              <select
                id="defaultUserRole"
                value={formData.defaultUserRole}
                onChange={(e) => handleInputChange("defaultUserRole", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="user">User</option>
                <option value="editor">Editor</option>
                <option value="moderator">Moderator</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Role assigned to new users when they register
              </p>
            </div>
          </div>
        </div>

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
              Use Defaults
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