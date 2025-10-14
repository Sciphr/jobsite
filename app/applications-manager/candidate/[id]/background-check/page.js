// app/applications-manager/candidate/[id]/background-check/page.js
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useApplications } from "@/app/hooks/useAdminData";
import { motion } from "framer-motion";
import {
  Shield,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  FileText,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Download,
  RefreshCw,
  Home,
  ChevronRight,
  Info,
  Check,
  AlertTriangle,
} from "lucide-react";

export default function BackgroundCheckPage() {
  const { id: applicationId } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getButtonClasses } = useThemeClasses();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [certnEnabled, setCertnEnabled] = useState(false);
  const [checkingIntegration, setCheckingIntegration] = useState(true);
  const [existingCheck, setExistingCheck] = useState(null);
  const [loadingCheck, setLoadingCheck] = useState(true);

  // Get application data
  const { data: allApplications = [], isLoading: applicationsLoading } =
    useApplications();
  const application = allApplications.find((app) => app.id === applicationId);

  // Check package selection
  const [selectedPackage, setSelectedPackage] = useState("standard");
  const [consentObtained, setConsentObtained] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState({
    ssn: "",
    dob: "",
    middleName: "",
    previousNames: "",
    driverLicenseNumber: "",
    driverLicenseState: "",
  });

  // Available background check packages
  const packages = [
    {
      id: "basic",
      name: "Basic Criminal Check",
      price: "$29",
      duration: "1-2 business days",
      icon: Shield,
      color: "blue",
      includes: [
        "Canadian Criminal Record Check",
        "Identity Verification",
        "RCMP Database Search",
      ],
      recommended: false,
    },
    {
      id: "standard",
      name: "Standard Employment Check",
      price: "$49",
      duration: "3-5 business days",
      icon: Shield,
      color: "green",
      includes: [
        "Everything in Basic",
        "Enhanced Criminal Records Check",
        "Employment Verification (2 positions)",
        "Education Verification",
        "Reference Checks",
      ],
      recommended: true,
    },
    {
      id: "comprehensive",
      name: "Comprehensive Check",
      price: "$89",
      duration: "5-7 business days",
      icon: Shield,
      color: "purple",
      includes: [
        "Everything in Standard",
        "Extended Criminal Records (10 years)",
        "Employment Verification (unlimited)",
        "Professional License Verification",
        "Credit Report (if applicable)",
        "International Criminal Record Check",
      ],
      recommended: false,
    },
  ];

  useEffect(() => {
    checkCertnIntegration();
    loadExistingBackgroundCheck();
  }, []);

  const checkCertnIntegration = async () => {
    try {
      const response = await fetch("/api/admin/integrations/certn/status");
      if (response.ok) {
        const data = await response.json();
        setCertnEnabled(data.connected);
      }
    } catch (error) {
      console.error("Error checking CERTN integration:", error);
    } finally {
      setCheckingIntegration(false);
    }
  };

  const loadExistingBackgroundCheck = async () => {
    try {
      const response = await fetch(
        `/api/admin/background-checks?applicationId=${applicationId}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.backgroundCheck) {
          setExistingCheck(data.backgroundCheck);
        }
      }
    } catch (error) {
      console.error("Error loading background check:", error);
    } finally {
      setLoadingCheck(false);
    }
  };

  const handleSubmit = async () => {
    if (!consentObtained) {
      setError("Please confirm that candidate consent has been obtained");
      return;
    }

    if (!additionalInfo.ssn || !additionalInfo.dob) {
      setError("SSN and Date of Birth are required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/background-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          packageId: selectedPackage,
          candidateInfo: {
            email: application.email,
            firstName: application.name?.split(" ")[0],
            lastName: application.name?.split(" ").slice(1).join(" "),
            phone: application.phone,
            ...additionalInfo,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Background check initiated successfully!");
        setExistingCheck(data.backgroundCheck);
        queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });

        setTimeout(() => {
          router.push(`/applications-manager/candidate/${applicationId}`);
        }, 2000);
      } else {
        setError(data.error || "Failed to initiate background check");
      }
    } catch (error) {
      console.error("Error initiating background check:", error);
      setError("Failed to initiate background check. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefreshStatus = async () => {
    setLoadingCheck(true);
    try {
      const response = await fetch(
        `/api/admin/background-checks/${existingCheck.id}/refresh`,
        { method: "POST" }
      );

      if (response.ok) {
        const data = await response.json();
        setExistingCheck(data.backgroundCheck);
        queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });
      }
    } catch (error) {
      console.error("Error refreshing background check:", error);
    } finally {
      setLoadingCheck(false);
    }
  };

  if (checkingIntegration || applicationsLoading || loadingCheck) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!certnEnabled) {
    return (
      <div className="space-y-6">
        {/* Breadcrumbs */}
        <div className="flex items-center space-x-2 text-sm admin-text-light">
          <button
            onClick={() => router.push("/applications-manager")}
            className="hover:admin-text flex items-center space-x-1"
          >
            <Home className="h-4 w-4" />
            <span>Overview</span>
          </button>
          <ChevronRight className="h-4 w-4" />
          <button
            onClick={() =>
              router.push(`/applications-manager/candidate/${applicationId}`)
            }
            className="hover:admin-text"
          >
            {application?.name || "Candidate"}
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="admin-text font-medium">Background Check</span>
        </div>

        <div className="admin-card rounded-lg shadow-sm border admin-border p-12 text-center">
          <div className="max-w-md mx-auto">
            <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold admin-text mb-2">
              CERTN Integration Required
            </h3>
            <p className="admin-text-light mb-6">
              To run background checks, you need to connect your CERTN account
              first. This is a one-time setup that takes less than 2 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() =>
                  router.push("/applications-manager/settings?tab=hiring_integrations")
                }
                className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-lg ${getButtonClasses("primary")}`}
              >
                <Shield className="h-4 w-4" />
                <span>Connect CERTN Account</span>
              </button>
              <button
                onClick={() =>
                  router.push(`/applications-manager/candidate/${applicationId}`)
                }
                className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-lg ${getButtonClasses("secondary")}`}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Candidate</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium admin-text mb-2">
          Application Not Found
        </h3>
        <button
          onClick={() => router.push("/applications-manager")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${getButtonClasses("primary")} mx-auto mt-4`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Overview</span>
        </button>
      </div>
    );
  }

  // Show existing background check status
  if (existingCheck) {
    const statusConfig = {
      pending: {
        icon: Clock,
        color: "yellow",
        label: "In Progress",
        bgClass: "bg-yellow-50 dark:bg-yellow-900/20",
        borderClass: "border-yellow-200 dark:border-yellow-800",
        textClass: "text-yellow-700 dark:text-yellow-300",
        iconClass: "text-yellow-600 dark:text-yellow-400",
      },
      complete: {
        icon: CheckCircle,
        color: "green",
        label: "Complete",
        bgClass: "bg-green-50 dark:bg-green-900/20",
        borderClass: "border-green-200 dark:border-green-800",
        textClass: "text-green-700 dark:text-green-300",
        iconClass: "text-green-600 dark:text-green-400",
      },
      consider: {
        icon: AlertTriangle,
        color: "orange",
        label: "Review Required",
        bgClass: "bg-orange-50 dark:bg-orange-900/20",
        borderClass: "border-orange-200 dark:border-orange-800",
        textClass: "text-orange-700 dark:text-orange-300",
        iconClass: "text-orange-600 dark:text-orange-400",
      },
      suspended: {
        icon: XCircle,
        color: "red",
        label: "Suspended",
        bgClass: "bg-red-50 dark:bg-red-900/20",
        borderClass: "border-red-200 dark:border-red-800",
        textClass: "text-red-700 dark:text-red-300",
        iconClass: "text-red-600 dark:text-red-400",
      },
    };

    const config = statusConfig[existingCheck.status] || statusConfig.pending;
    const StatusIcon = config.icon;

    return (
      <div className="space-y-6">
        {/* Breadcrumbs */}
        <div className="flex items-center space-x-2 text-sm admin-text-light">
          <button
            onClick={() => router.push("/applications-manager")}
            className="hover:admin-text flex items-center space-x-1"
          >
            <Home className="h-4 w-4" />
            <span>Overview</span>
          </button>
          <ChevronRight className="h-4 w-4" />
          <button
            onClick={() =>
              router.push(`/applications-manager/candidate/${applicationId}`)
            }
            className="hover:admin-text"
          >
            {application.name || "Candidate"}
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="admin-text font-medium">Background Check</span>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg overflow-hidden text-white">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                  <Shield className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Background Check Status</h1>
                  <p className="text-blue-100">
                    {application.name} - {application.job?.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  router.push(`/applications-manager/candidate/${applicationId}`)
                }
                className="flex items-center space-x-2 px-4 py-2 rounded-lg border-2 border-white border-opacity-30 bg-white bg-opacity-15 hover:bg-opacity-25 transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Candidate</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div
          className={`admin-card rounded-lg shadow-sm border ${config.borderClass} p-6`}
        >
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start space-x-4">
              <div className={`p-3 ${config.bgClass} rounded-lg`}>
                <StatusIcon className={`h-6 w-6 ${config.iconClass}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold admin-text mb-1">
                  {config.label}
                </h3>
                <p className="admin-text-light text-sm">
                  {existingCheck.status === "pending" &&
                    "The background check is currently in progress"}
                  {existingCheck.status === "complete" &&
                    "Background check completed successfully"}
                  {existingCheck.status === "consider" &&
                    "Background check requires your review"}
                  {existingCheck.status === "suspended" &&
                    "Background check has been suspended"}
                </p>
              </div>
            </div>
            <button
              onClick={handleRefreshStatus}
              disabled={loadingCheck}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${getButtonClasses("secondary")} ${loadingCheck ? "opacity-50" : ""}`}
            >
              <RefreshCw
                className={`h-4 w-4 ${loadingCheck ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </button>
          </div>

          {/* Check Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="text-sm admin-text-light">Package</label>
              <p className="font-medium admin-text capitalize">
                {existingCheck.package_type?.replace("_", " ")}
              </p>
            </div>
            <div>
              <label className="text-sm admin-text-light">Initiated</label>
              <p className="font-medium admin-text">
                {new Date(existingCheck.initiated_at).toLocaleDateString()}
              </p>
            </div>
            {existingCheck.completed_at && (
              <div>
                <label className="text-sm admin-text-light">Completed</label>
                <p className="font-medium admin-text">
                  {new Date(existingCheck.completed_at).toLocaleDateString()}
                </p>
              </div>
            )}
            {existingCheck.checkr_report_id && (
              <div>
                <label className="text-sm admin-text-light">Report ID</label>
                <p className="font-mono text-sm admin-text">
                  {existingCheck.checkr_report_id.substring(0, 16)}...
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 pt-4 border-t admin-border">
            {existingCheck.checkr_report_url && (
              <a
                href={existingCheck.checkr_report_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${getButtonClasses("primary")}`}
              >
                <ExternalLink className="h-4 w-4" />
                <span>View Full Report</span>
              </a>
            )}
            {existingCheck.status === "complete" && (
              <button
                onClick={() => {
                  /* Download PDF */
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${getButtonClasses("secondary")}`}
              >
                <Download className="h-4 w-4" />
                <span>Download Report</span>
              </button>
            )}
          </div>
        </div>

        {/* Timeline/Activity */}
        {existingCheck.metadata?.timeline && (
          <div className="admin-card rounded-lg shadow-sm border admin-border p-6">
            <h4 className="font-semibold admin-text mb-4">Activity Timeline</h4>
            <div className="space-y-3">
              {existingCheck.metadata.timeline.map((event, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm admin-text">{event.description}</p>
                    <p className="text-xs admin-text-light">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // New background check flow
  const steps = [
    { id: 1, title: "Package", description: "Choose check type" },
    { id: 2, title: "Information", description: "Candidate details" },
    { id: 3, title: "Review", description: "Confirm & submit" },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-sm admin-text-light">
        <button
          onClick={() => router.push("/applications-manager")}
          className="hover:admin-text flex items-center space-x-1"
        >
          <Home className="h-4 w-4" />
          <span>Overview</span>
        </button>
        <ChevronRight className="h-4 w-4" />
        <button
          onClick={() =>
            router.push(`/applications-manager/candidate/${applicationId}`)
          }
          className="hover:admin-text"
        >
          {application.name || "Candidate"}
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="admin-text font-medium">Background Check</span>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg overflow-hidden text-white">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                <Shield className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Initiate Background Check</h1>
                <p className="text-blue-100">
                  {application.name} - {application.job?.title}
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                router.push(`/applications-manager/candidate/${applicationId}`)
              }
              className="flex items-center space-x-2 px-4 py-2 rounded-lg border-2 border-white border-opacity-30 bg-white bg-opacity-15 hover:bg-opacity-25 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Candidate</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-card rounded-lg shadow overflow-hidden">
        {/* Progress Steps */}
        <div className="px-6 py-4 border-b admin-border">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      currentStep >= step.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium admin-text">
                      {step.title}
                    </div>
                    <div className="text-xs admin-text-light">
                      {step.description}
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-full h-0.5 mx-4 transition-colors ${
                      currentStep > step.id
                        ? "bg-blue-600"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[600px]">
          {/* Error/Success Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4"
            >
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-700 dark:text-red-300 font-medium">
                  {error}
                </span>
              </div>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4"
            >
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-700 dark:text-green-300 font-medium">
                  {success}
                </span>
              </div>
            </motion.div>
          )}

          {/* Step 1: Package Selection */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-semibold admin-text mb-2">
                  Choose Background Check Package
                </h3>
                <p className="admin-text-light">
                  Select the level of screening that matches your hiring requirements.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {packages.map((pkg) => {
                  const PkgIcon = pkg.icon;
                  return (
                    <button
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg.id)}
                      className={`p-6 rounded-lg border-2 transition-all text-left relative ${
                        selectedPackage === pkg.id
                          ? `border-${pkg.color}-500 bg-${pkg.color}-50 dark:bg-${pkg.color}-900/20`
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 admin-card"
                      }`}
                    >
                      {pkg.recommended && (
                        <div className="absolute top-0 right-0 -mt-2 -mr-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            Recommended
                          </span>
                        </div>
                      )}
                      <div className="flex items-center space-x-3 mb-4">
                        <PkgIcon className="h-6 w-6 admin-text" />
                        <div>
                          <h4 className="font-semibold admin-text">{pkg.name}</h4>
                          <p className="text-xs admin-text-light">{pkg.duration}</p>
                        </div>
                      </div>
                      <div className="text-2xl font-bold admin-text mb-4">
                        {pkg.price}
                      </div>
                      <ul className="space-y-2">
                        {pkg.includes.map((item, index) => (
                          <li
                            key={index}
                            className="text-xs admin-text-light flex items-start"
                          >
                            <Check className="h-3 w-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 2: Candidate Information */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-semibold admin-text mb-2">
                  Candidate Information
                </h3>
                <p className="admin-text-light">
                  Provide additional information required for the background check.
                </p>
              </div>

              {/* Pre-filled Info */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border admin-border">
                <h4 className="font-medium admin-text mb-3">
                  From Application
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 admin-text-light" />
                    <span className="text-sm admin-text">{application.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 admin-text-light" />
                    <span className="text-sm admin-text">{application.email}</span>
                  </div>
                  {application.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 admin-text-light" />
                      <span className="text-sm admin-text">{application.phone}</span>
                    </div>
                  )}
                  {application.location && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 admin-text-light" />
                      <span className="text-sm admin-text">
                        {application.location}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium admin-text mb-2">
                      Social Security Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={additionalInfo.ssn}
                      onChange={(e) =>
                        setAdditionalInfo((prev) => ({
                          ...prev,
                          ssn: e.target.value,
                        }))
                      }
                      placeholder="XXX-XX-XXXX"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium admin-text mb-2">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={additionalInfo.dob}
                      onChange={(e) =>
                        setAdditionalInfo((prev) => ({
                          ...prev,
                          dob: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium admin-text mb-2">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={additionalInfo.middleName}
                    onChange={(e) =>
                      setAdditionalInfo((prev) => ({
                        ...prev,
                        middleName: e.target.value,
                      }))
                    }
                    placeholder="Optional"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text bg-white dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium admin-text mb-2">
                    Previous Names
                  </label>
                  <input
                    type="text"
                    value={additionalInfo.previousNames}
                    onChange={(e) =>
                      setAdditionalInfo((prev) => ({
                        ...prev,
                        previousNames: e.target.value,
                      }))
                    }
                    placeholder="If applicable, separate with commas"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text bg-white dark:bg-gray-800"
                  />
                </div>

                {(selectedPackage === "comprehensive" ||
                  selectedPackage === "standard") && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium admin-text mb-2">
                        Driver's License Number
                      </label>
                      <input
                        type="text"
                        value={additionalInfo.driverLicenseNumber}
                        onChange={(e) =>
                          setAdditionalInfo((prev) => ({
                            ...prev,
                            driverLicenseNumber: e.target.value,
                          }))
                        }
                        placeholder="Optional"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text bg-white dark:bg-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium admin-text mb-2">
                        Driver's License State
                      </label>
                      <input
                        type="text"
                        value={additionalInfo.driverLicenseState}
                        onChange={(e) =>
                          setAdditionalInfo((prev) => ({
                            ...prev,
                            driverLicenseState: e.target.value,
                          }))
                        }
                        placeholder="e.g., CA, NY"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Privacy Notice */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-medium mb-1">Privacy & Security</p>
                    <p>
                      All sensitive information is encrypted and transmitted
                      securely to CERTN. This data is used solely for background
                      verification purposes and is handled in compliance with Canadian
                      privacy regulations and PIPEDA.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Review & Consent */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-semibold admin-text mb-2">
                  Review & Submit
                </h3>
                <p className="admin-text-light">
                  Please review all information before submitting the background check request.
                </p>
              </div>

              {/* Package Summary */}
              <div className="admin-card border admin-border rounded-lg p-6">
                <h4 className="font-semibold admin-text mb-4">Selected Package</h4>
                {packages.find((p) => p.id === selectedPackage) && (
                  <div>
                    <p className="font-medium admin-text">
                      {packages.find((p) => p.id === selectedPackage).name}
                    </p>
                    <p className="text-sm admin-text-light mt-1">
                      {packages.find((p) => p.id === selectedPackage).price} •{" "}
                      {packages.find((p) => p.id === selectedPackage).duration}
                    </p>
                  </div>
                )}
              </div>

              {/* Candidate Summary */}
              <div className="admin-card border admin-border rounded-lg p-6">
                <h4 className="font-semibold admin-text mb-4">Candidate Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm admin-text-light">Full Name</label>
                    <p className="font-medium admin-text">{application.name}</p>
                  </div>
                  <div>
                    <label className="text-sm admin-text-light">Email</label>
                    <p className="font-medium admin-text">{application.email}</p>
                  </div>
                  <div>
                    <label className="text-sm admin-text-light">Date of Birth</label>
                    <p className="font-medium admin-text">
                      {additionalInfo.dob
                        ? new Date(additionalInfo.dob).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm admin-text-light">SSN</label>
                    <p className="font-medium admin-text">
                      {additionalInfo.ssn
                        ? `***-**-${additionalInfo.ssn.slice(-4)}`
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Consent Checkbox */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={consentObtained}
                    onChange={(e) => setConsentObtained(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="consent"
                      className="font-medium admin-text cursor-pointer"
                    >
                      Candidate Consent Confirmation
                    </label>
                    <p className="text-sm admin-text-light mt-1">
                      I confirm that the candidate has been informed about this
                      background check and has provided written consent as required
                      by the Fair Credit Reporting Act (FCRA). The candidate has
                      received and acknowledged the disclosure and authorization forms.
                    </p>
                  </div>
                </div>
              </div>

              {/* FCRA Notice */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border admin-border rounded-lg p-4">
                <p className="text-xs admin-text-light">
                  <strong>Important:</strong> Under the Fair Credit Reporting Act
                  (FCRA), you must obtain written consent from the candidate before
                  initiating a background check. Ensure proper disclosure and
                  authorization forms have been completed and signed by the candidate.
                  Failure to comply with FCRA requirements may result in legal
                  liability.
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t admin-border flex items-center justify-between">
          <button
            onClick={() => {
              if (currentStep > 1) setCurrentStep(currentStep - 1);
              else router.push(`/applications-manager/candidate/${applicationId}`);
            }}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center space-x-3">
            {currentStep < 3 ? (
              <button
                onClick={() => {
                  if (currentStep === 2 && (!additionalInfo.ssn || !additionalInfo.dob)) {
                    setError("SSN and Date of Birth are required");
                    return;
                  }
                  setError(null);
                  setCurrentStep(currentStep + 1);
                }}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg ${getButtonClasses("primary")}`}
              >
                <span>Continue</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !consentObtained}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg ${
                  isSubmitting || !consentObtained
                    ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                    : getButtonClasses("primary")
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    <span>Initiate Background Check</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
