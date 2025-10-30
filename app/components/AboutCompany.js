"use client";

import { useState, useEffect } from "react";
import { Building, Users, Heart, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

export default function AboutCompany() {
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    about: true,
    culture: false,
    values: false,
    benefits: false,
  });

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const response = await fetch("/api/settings/company-info");
        if (response.ok) {
          const data = await response.json();
          setCompanyInfo(data);
        }
      } catch (error) {
        console.error("Error fetching company info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyInfo();
  }, []);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Don't render if no company info is available
  if (loading) return null;
  if (!companyInfo || (!companyInfo.about && !companyInfo.culture && !companyInfo.values && !companyInfo.benefits)) {
    return null;
  }

  return (
    <div className="mt-12 pt-12 border-t border-gray-200 dark:border-gray-700">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          About the Company
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Learn more about our mission, culture, and what makes us unique
        </p>
      </div>

      <div className="space-y-4">
        {/* About Section */}
        {companyInfo.about && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200">
            <button
              onClick={() => toggleSection("about")}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                  Our Company
                </h3>
              </div>
              {expandedSections.about ? (
                <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              )}
            </button>
            {expandedSections.about && (
              <div className="px-6 pb-6">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {companyInfo.about}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Culture Section */}
        {companyInfo.culture && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200">
            <button
              onClick={() => toggleSection("culture")}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                  Our Culture
                </h3>
              </div>
              {expandedSections.culture ? (
                <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              )}
            </button>
            {expandedSections.culture && (
              <div className="px-6 pb-6">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {companyInfo.culture}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Values Section */}
        {companyInfo.values && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200">
            <button
              onClick={() => toggleSection("values")}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Heart className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                  Our Values
                </h3>
              </div>
              {expandedSections.values ? (
                <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              )}
            </button>
            {expandedSections.values && (
              <div className="px-6 pb-6">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {companyInfo.values}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Benefits Section */}
        {companyInfo.benefits && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200">
            <button
              onClick={() => toggleSection("benefits")}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Sparkles className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                  Benefits & Perks
                </h3>
              </div>
              {expandedSections.benefits ? (
                <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              )}
            </button>
            {expandedSections.benefits && (
              <div className="px-6 pb-6">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {companyInfo.benefits}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
