"use client";

import { useState, useEffect } from "react";
import { Building, Users, Heart, Sparkles, Save, Loader2 } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";

export default function CompanyInfo({ settings, onSave, saving }) {
  const { getButtonClasses, getThemedClass } = useThemeClasses();
  const [localSettings, setLocalSettings] = useState({
    company_about: settings?.company_about || "",
    company_culture: settings?.company_culture || "",
    company_benefits: settings?.company_benefits || "",
    company_values: settings?.company_values || "",
  });

  const [unsavedChanges, setUnsavedChanges] = useState(false);

  useEffect(() => {
    setLocalSettings({
      company_about: settings?.company_about || "",
      company_culture: settings?.company_culture || "",
      company_benefits: settings?.company_benefits || "",
      company_values: settings?.company_values || "",
    });
  }, [settings]);

  const handleChange = (key, value) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!unsavedChanges) return;

    await onSave(localSettings);
    setUnsavedChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${getThemedClass("text-primary")}`}>
            Company Information
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            This information will be displayed on job pages and the careers section to help candidates learn about your company.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!unsavedChanges || saving}
          className={`${getButtonClasses(
            "primary"
          )} disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {unsavedChanges && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            You have unsaved changes. Click "Save Changes" to apply them.
          </p>
        </div>
      )}

      {/* About Company */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">About the Company</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A brief overview of your company, its mission, and what you do.
            </p>
          </div>
        </div>
        <textarea
          value={localSettings.company_about}
          onChange={(e) => handleChange("company_about", e.target.value)}
          placeholder="Write about your company's mission, history, and what makes it unique..."
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors duration-200 resize-y"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          This will be displayed on the job details page and careers section. Supports plain text and line breaks.
        </p>
      </div>

      {/* Company Culture */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">Company Culture</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Describe your work environment, team dynamics, and company values.
            </p>
          </div>
        </div>
        <textarea
          value={localSettings.company_culture}
          onChange={(e) => handleChange("company_culture", e.target.value)}
          placeholder="Describe your company culture, work environment, team collaboration style, and what it's like to work here..."
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-colors duration-200 resize-y"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Help candidates understand what it's like to work at your company.
        </p>
      </div>

      {/* Company Values */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
            <Heart className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">Core Values</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              The principles and values that guide your company.
            </p>
          </div>
        </div>
        <textarea
          value={localSettings.company_values}
          onChange={(e) => handleChange("company_values", e.target.value)}
          placeholder="List your company's core values (e.g., Innovation, Integrity, Collaboration, Customer Focus)..."
          rows={5}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 transition-colors duration-200 resize-y"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          One value per line, or write as a paragraph. These will be highlighted on your careers page.
        </p>
      </div>

      {/* Benefits & Perks */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <Sparkles className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">Benefits & Perks</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Highlight the benefits, perks, and compensation extras you offer.
            </p>
          </div>
        </div>
        <textarea
          value={localSettings.company_benefits}
          onChange={(e) => handleChange("company_benefits", e.target.value)}
          placeholder="List benefits like health insurance, 401k, flexible PTO, remote work options, professional development, etc..."
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 transition-colors duration-200 resize-y"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          These benefits will be displayed prominently to attract top talent.
        </p>
      </div>

      {/* Save Button (duplicate at bottom for convenience) */}
      <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSave}
          disabled={!unsavedChanges || saving}
          className={`${getButtonClasses(
            "primary"
          )} disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
