"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useApplications } from "@/app/hooks/useAdminData";
import { ArrowLeft, Zap, User, FileText } from "lucide-react";
import Breadcrumb from "@/app/components/Breadcrumb";
import dynamic from "next/dynamic";

// Dynamically import the tab content components to reduce initial bundle
const QuickActionsTab = dynamic(() => import("./components/QuickActionsTab"), {
  loading: () => <div className="p-8 text-center admin-text-light">Loading...</div>,
});

const FullProfileTab = dynamic(() => import("./components/FullProfileTab"), {
  loading: () => <div className="p-8 text-center admin-text-light">Loading...</div>,
});

/**
 * Unified Application Detail View
 *
 * This page combines:
 * - Quick Actions tab: Status changes, quick emails, hire approval (from /admin/applications/[id])
 * - Full Profile tab: Comprehensive view with timeline, interviews, notes (from /applications-manager/candidate/[id])
 */
export default function ApplicationDetailPage() {
  const { id: applicationId } = useParams();
  const router = useRouter();
  const { getButtonClasses } = useThemeClasses();
  const [activeTab, setActiveTab] = useState("quick");

  // Get application data
  const { data: allApplications = [], isLoading } = useApplications();
  const application = allApplications.find((app) => app.id === applicationId);

  const tabs = [
    {
      id: "quick",
      label: "Quick Actions",
      icon: Zap,
      description: "Status updates & approvals",
    },
    {
      id: "profile",
      label: "Full Profile",
      icon: User,
      description: "Complete candidate details",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="admin-text-light">Loading application...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="h-12 w-12 admin-text-light mx-auto mb-4" />
          <h3 className="text-lg font-medium admin-text mb-2">Application Not Found</h3>
          <p className="admin-text-light mb-6">
            The application you're looking for doesn't exist or you don't have access to it.
          </p>
          <button
            onClick={() => router.back()}
            className={`${getButtonClasses("primary")} px-4 py-2 rounded-lg`}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Applications", href: "/admin/applications" },
          { label: application.name || "Applicant", current: true },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors admin-text"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold admin-text">
              {application.name || "Unnamed Applicant"}
            </h1>
            <p className="admin-text-light text-sm mt-1">
              Applied for: {application.job?.title || "Unknown Position"}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b admin-border">
        <nav className="flex space-x-1" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors duration-200
                  ${
                    isActive
                      ? "border-blue-500 admin-text font-medium"
                      : "border-transparent admin-text-light hover:admin-text hover:border-gray-300"
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-sm">{tab.label}</div>
                  <div className="text-xs opacity-75">{tab.description}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === "quick" && <QuickActionsTab applicationId={applicationId} />}
        {activeTab === "profile" && <FullProfileTab applicationId={applicationId} />}
      </div>
    </div>
  );
}
