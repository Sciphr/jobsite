// app/applications-manager/candidate/[id]/schedule-interview/page.js
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useApplications } from "@/app/hooks/useAdminData";
import CalendarPicker from "../../../components/CalendarPicker";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Phone,
  Video,
  MapPin,
  Calendar,
  Clock,
  Users,
  Globe,
  Send,
  Eye,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Home,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";

export default function ScheduleInterviewPage() {
  const { id: applicationId } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getButtonClasses } = useThemeClasses();
  const [currentStep, setCurrentStep] = useState(1);
  const [interviewData, setInterviewData] = useState({
    type: "video", // phone, video, in-person
    duration: 45, // minutes
    timeSlots: [], // array of selected time slots
    interviewers: [{ name: "", email: "" }],
    location: "",
    meetingLink: "",
    meetingProvider: "google", // google, zoom, custom
    notes: "",
    agenda: "",
    timezone: "America/Toronto",
  });
  const [businessAddress, setBusinessAddress] = useState("");
  const [availability, setAvailability] = useState({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sendEmailNotification, setSendEmailNotification] = useState(true);

  // Get application data
  const { data: allApplications = [], isLoading: applicationsLoading } =
    useApplications();
  const application = allApplications.find((app) => app.id === applicationId);

  // Dynamic steps based on available calendar providers
  const getSteps = () => {
    const baseSteps = [
      { id: 1, title: "Interview Type", description: "Choose interview format" }
    ];
    
    // Add calendar provider step if multiple providers available
    if (availableProviders.length > 1) {
      baseSteps.push({ id: 2, title: "Calendar Provider", description: "Choose calendar system" });
      baseSteps.push({ id: 3, title: "Time Slots", description: "Select available times" });
      baseSteps.push({ id: 4, title: "Details", description: "Configure interview settings" });
      baseSteps.push({ id: 5, title: "Review", description: "Review and send invitation" });
    } else {
      baseSteps.push({ id: 2, title: "Time Slots", description: "Select available times" });
      baseSteps.push({ id: 3, title: "Details", description: "Configure interview settings" });
      baseSteps.push({ id: 4, title: "Review", description: "Review and send invitation" });
    }
    
    return baseSteps;
  };
  
  const steps = getSteps();

  // Fetch available calendar providers
  useEffect(() => {
    const fetchCalendarProviders = async () => {
      try {
        setLoadingProviders(true);
        const providers = [];

        // Check Google Calendar integration
        try {
          const googleResponse = await fetch("/api/calendar/integration/status");
          if (googleResponse.ok) {
            const googleData = await googleResponse.json();
            if (googleData.connected) {
              providers.push({
                id: "google",
                name: "Google Calendar",
                description: "Use Google Calendar and Meet",
                icon: "🗓️",
                email: googleData.googleEmail
              });
            }
          }
        } catch (error) {
          console.error("Error checking Google integration:", error);
        }

        // Check Microsoft integration
        try {
          const microsoftResponse = await fetch("/api/microsoft/integration/status");
          if (microsoftResponse.ok) {
            const microsoftData = await microsoftResponse.json();
            if (microsoftData.connected) {
              providers.push({
                id: "microsoft",
                name: "Microsoft Calendar", 
                description: "Use Outlook Calendar and Teams",
                icon: "📅",
                email: microsoftData.microsoftEmail
              });
            }
          }
        } catch (error) {
          console.error("Error checking Microsoft integration:", error);
        }

        setAvailableProviders(providers);
        
        // Set default provider if only one is available
        if (providers.length === 1) {
          setInterviewData(prev => ({
            ...prev,
            meetingProvider: providers[0].id
          }));
        }
      } catch (error) {
        console.error("Error fetching calendar providers:", error);
      } finally {
        setLoadingProviders(false);
      }
    };

    fetchCalendarProviders();
  }, []);

  // Fetch business address setting
  useEffect(() => {
    const fetchBusinessAddress = async () => {
      try {
        const response = await fetch('/api/admin/settings');
        if (response.ok) {
          const data = await response.json();
          const businessAddressSetting = data.settings.find(
            setting => setting.key === 'business_address'
          );
          if (businessAddressSetting) {
            setBusinessAddress(businessAddressSetting.parsedValue || '');
          }
        }
      } catch (error) {
        console.error('Failed to fetch business address:', error);
      }
    };

    fetchBusinessAddress();
  }, []);

  // Initialize state when component mounts
  useEffect(() => {
    setInterviewData(prev => ({
      ...prev,
      location: businessAddress, // Pre-fill with business address
    }));
  }, [businessAddress]);

  const handleNext = async () => {
    const maxStep = availableProviders.length > 1 ? 5 : 4;
    if (currentStep < maxStep) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateInterviewData = (field, value) => {
    setInterviewData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const addInterviewer = () => {
    setInterviewData(prev => ({
      ...prev,
      interviewers: [...prev.interviewers, { name: "", email: "" }],
    }));
  };

  const removeInterviewer = (index) => {
    setInterviewData(prev => ({
      ...prev,
      interviewers: prev.interviewers.filter((_, i) => i !== index),
    }));
  };

  const updateInterviewer = (index, field, value) => {
    setInterviewData(prev => ({
      ...prev,
      interviewers: prev.interviewers.map((interviewer, i) =>
        i === index ? { ...interviewer, [field]: value } : interviewer
      ),
    }));
  };

  const canProceed = () => {
    const hasMultipleProviders = availableProviders.length > 1;
    
    switch (currentStep) {
      case 1:
        return interviewData.type;
      case 2:
        if (hasMultipleProviders) {
          // Calendar provider selection step
          return interviewData.meetingProvider;
        } else {
          // Time slots step (when no provider selection needed)
          return interviewData.timeSlots.length > 0;
        }
      case 3:
        if (hasMultipleProviders) {
          // Time slots step (when provider selection was shown)
          return interviewData.timeSlots.length > 0;
        } else {
          // Details step (when no provider selection)
          return interviewData.interviewers.some(i => i.name && i.email);
        }
      case 4:
        if (hasMultipleProviders) {
          // Details step (when provider selection was shown)
          return interviewData.interviewers.some(i => i.name && i.email);
        } else {
          // Review step (when no provider selection)
          return selectedTimeSlot !== null;
        }
      case 5:
        // Review step (when provider selection was shown)
        return selectedTimeSlot !== null;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!selectedTimeSlot) {
      setError("Please select a time slot");
      return;
    }

    setScheduling(true);
    setError("");

    try {
      const response = await fetch("/api/calendar/interview/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId: application.id,
          selectedTimeSlot,
          interviewData,
          sendEmailNotification,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess("Interview scheduled successfully!");
        
        // Invalidate React Query cache to refresh application status
        queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });
        
        // Navigate back after a brief success message
        setTimeout(() => {
          router.push(`/applications-manager/candidate/${applicationId}`);
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to schedule interview");
      }
    } catch (error) {
      console.error("Error scheduling interview:", error);
      setError("Failed to schedule interview. Please try again.");
    } finally {
      setScheduling(false);
    }
  };

  if (applicationsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Application Not Found
        </h3>
        <p className="text-gray-500 mb-4">
          The application you're looking for doesn't exist or has been removed.
        </p>
        <button
          onClick={() => router.push("/applications-manager")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${getButtonClasses("primary")}`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Overview</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <button
          onClick={() => router.push("/applications-manager")}
          className="hover:text-gray-900 flex items-center space-x-1"
        >
          <Home className="h-4 w-4" />
          <span>Overview</span>
        </button>
        <ChevronRightIcon className="h-4 w-4" />
        <button
          onClick={() =>
            router.push(`/applications-manager/jobs/${application.jobId}`)
          }
          className="hover:text-gray-900"
        >
          {application.job?.title}
        </button>
        <ChevronRightIcon className="h-4 w-4" />
        <button
          onClick={() => router.push(`/applications-manager/candidate/${applicationId}`)}
          className="hover:text-gray-900"
        >
          {application.name || "Anonymous Applicant"}
        </button>
        <ChevronRightIcon className="h-4 w-4" />
        <span className="text-gray-900 font-medium">Schedule Interview</span>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl shadow-lg overflow-hidden text-white">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                <Calendar className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Schedule Interview</h1>
                <p className="text-green-100">
                  {application.name} - {application.job?.title}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/applications-manager/candidate/${applicationId}`)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg border-2 border-white border-opacity-30 bg-white bg-opacity-15 hover:bg-opacity-25 hover:border-opacity-70 hover:shadow-lg hover:scale-105 transition-all duration-300 text-gray-800 font-medium backdrop-blur-md shadow-md"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Application</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      currentStep >= step.id
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {step.description}
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-4 transition-colors ${
                      currentStep > step.id ? "bg-green-600" : "bg-gray-200"
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
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-700 font-medium">Error</span>
              </div>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-700 font-medium">Success</span>
              </div>
              <p className="text-green-600 text-sm mt-1">{success}</p>
            </div>
          )}

          {/* Step 1: Interview Type */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Select Interview Type
                </h3>
                <p className="text-gray-600 mb-6">
                  Choose the format that works best for this interview.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    type: "phone",
                    icon: Phone,
                    title: "Phone Interview",
                    description: "Traditional phone call interview",
                    pros: ["Quick to set up", "No tech requirements"],
                  },
                  {
                    type: "video",
                    icon: Video,
                    title: "Video Interview",
                    description: "Google Meet or Zoom video call",
                    pros: ["Face-to-face interaction", "Screen sharing"],
                  },
                  {
                    type: "in-person",
                    icon: MapPin,
                    title: "In-Person Interview",
                    description: "Meet at your office location",
                    pros: ["Personal connection", "Office tour"],
                  },
                ].map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.type}
                      onClick={() => updateInterviewData("type", option.type)}
                      className={`p-6 rounded-lg border-2 transition-all text-left ${
                        interviewData.type === option.type
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <Icon className="h-6 w-6 text-gray-700" />
                        <h4 className="font-semibold text-gray-900">
                          {option.title}
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {option.description}
                      </p>
                      <ul className="space-y-1">
                        {option.pros.map((pro, index) => (
                          <li key={index} className="text-xs text-gray-500 flex items-center">
                            <Check className="h-3 w-3 text-green-500 mr-1" />
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>

              {/* Duration Selection */}
              <div>
                <h4 className="text-md font-semibold mb-3">Interview Duration</h4>
                <div className="flex items-center space-x-3">
                  {[30, 45, 60, 90].map((minutes) => (
                    <button
                      key={minutes}
                      onClick={() => updateInterviewData("duration", minutes)}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        interviewData.duration === minutes
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {minutes} min
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Calendar Provider Selection (only if multiple providers) */}
          {currentStep === 2 && availableProviders.length > 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Choose Calendar Provider
                </h3>
                <p className="text-gray-600 mb-6">
                  Select which calendar system to use for this interview.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {availableProviders.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => setInterviewData(prev => ({ ...prev, meetingProvider: provider.id }))}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      interviewData.meetingProvider === provider.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{provider.icon}</span>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{provider.name}</div>
                        <div className="text-sm text-gray-600">{provider.description}</div>
                        <div className="text-xs text-gray-500 mt-1">Connected: {provider.email}</div>
                      </div>
                      {interviewData.meetingProvider === provider.id && (
                        <CheckCircle className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2/3: Time Slots */}
          {((currentStep === 2 && availableProviders.length === 1) || 
            (currentStep === 3 && availableProviders.length > 1)) && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Select Available Time Slots
                </h3>
                <p className="text-gray-600 mb-6">
                  Choose multiple time options from your calendar. The candidate will receive these options and can select their preferred time.
                </p>
              </div>

              {/* Timezone Selection */}
              <div className="flex items-center justify-between bg-blue-50 rounded-lg p-4">
                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-1">
                    Timezone
                  </label>
                  <select
                    value={interviewData.timezone}
                    onChange={(e) => updateInterviewData("timezone", e.target.value)}
                    className="px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="America/Toronto">Eastern Time (Toronto)</option>
                    <option value="America/Vancouver">Pacific Time (Vancouver)</option>
                    <option value="America/New_York">Eastern Time (New York)</option>
                    <option value="America/Los_Angeles">Pacific Time (Los Angeles)</option>
                    <option value="Europe/London">GMT (London)</option>
                  </select>
                </div>
                <div className="text-right">
                  <div className="text-sm text-blue-700 font-medium">Interview Duration</div>
                  <div className="text-lg font-bold text-blue-900">{interviewData.duration} minutes</div>
                </div>
              </div>

              {/* Calendar Picker */}
              <CalendarPicker
                duration={interviewData.duration}
                timezone={interviewData.timezone}
                onTimeSlotsChange={(timeSlots) => {
                  setInterviewData(prev => ({
                    ...prev,
                    timeSlots: timeSlots
                  }));
                  // Clear availability data when slots change
                  setAvailability({});
                }}
                selectedTimeSlots={interviewData.timeSlots}
                provider={interviewData.meetingProvider}
              />
            </div>
          )}

          {/* Step 3/4: Interview Details */}
          {((currentStep === 3 && availableProviders.length === 1) || 
            (currentStep === 4 && availableProviders.length > 1)) && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Interview Details
                </h3>
                <p className="text-gray-600 mb-6">
                  Configure the interview panel, location, and additional details.
                </p>
              </div>

              {/* Interview Panel */}
              <div>
                <h4 className="text-md font-semibold mb-3">Interview Panel</h4>
                <div className="space-y-3">
                  {interviewData.interviewers.map((interviewer, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Interviewer name"
                          value={interviewer.name}
                          onChange={(e) => updateInterviewer(index, "name", e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                        <input
                          type="email"
                          placeholder="Email address"
                          value={interviewer.email}
                          onChange={(e) => updateInterviewer(index, "email", e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      {interviewData.interviewers.length > 1 && (
                        <button
                          onClick={() => removeInterviewer(index)}
                          className="p-2 text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addInterviewer}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors flex items-center justify-center space-x-2 text-gray-600"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Interviewer</span>
                  </button>
                </div>
              </div>

              {/* Meeting Setup */}
              <div>
                <h4 className="text-md font-semibold mb-3">Meeting Setup</h4>
                
                {interviewData.type === "video" && (
                  <div className="space-y-4">
                    {/* Meeting Provider Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Meeting Provider
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: "google", label: "Google Meet", icon: "📹", description: "Auto-generated" },
                          { value: "zoom", label: "Zoom", icon: "💻", description: "Manual link" },
                          { value: "custom", label: "Custom", icon: "🔗", description: "Other platform" }
                        ].map((provider) => (
                          <button
                            key={provider.value}
                            type="button"
                            onClick={() => {
                              updateInterviewData("meetingProvider", provider.value);
                              if (provider.value === "google") {
                                updateInterviewData("meetingLink", "");
                              }
                            }}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${
                              interviewData.meetingProvider === provider.value
                                ? "border-green-500 bg-green-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-lg">{provider.icon}</span>
                              <span className="font-medium text-sm">{provider.label}</span>
                            </div>
                            <p className="text-xs text-gray-600">{provider.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Meeting Link Input */}
                    {interviewData.meetingProvider === "google" ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg">📹</span>
                          <span className="font-medium text-blue-900">Google Meet</span>
                        </div>
                        <p className="text-sm text-blue-800">
                          A Google Meet link will be automatically generated when the interview is scheduled.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <input
                            type="text"
                            placeholder={
                              interviewData.meetingProvider === "zoom" 
                                ? "Enter your Zoom meeting link (e.g., https://zoom.us/j/123456789)"
                                : "Enter meeting link"
                            }
                            value={interviewData.meetingLink}
                            onChange={(e) => updateInterviewData("meetingLink", e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                        <p className="text-sm text-gray-500">
                          {interviewData.meetingProvider === "zoom" 
                            ? "You can use your personal Zoom meeting room or create a new meeting link."
                            : "Enter the meeting link for your chosen video platform."
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {interviewData.type === "in-person" && (
                  <div>
                    <textarea
                      placeholder="Meeting location and directions..."
                      value={interviewData.location}
                      onChange={(e) => updateInterviewData("location", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Pre-filled with your business address. You can edit this for specific interviews.
                    </p>
                  </div>
                )}

                {interviewData.type === "phone" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 text-sm">
                      <Phone className="h-4 w-4 inline mr-2" />
                      The interviewer will call the candidate at their provided phone number: <strong>{application.phone || "Not provided"}</strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Interview Agenda */}
              <div>
                <h4 className="text-md font-semibold mb-3">Interview Agenda</h4>
                <textarea
                  placeholder="Interview agenda, topics to cover, what to expect..."
                  value={interviewData.agenda}
                  onChange={(e) => updateInterviewData("agenda", e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Additional Notes */}
              <div>
                <h4 className="text-md font-semibold mb-3">Additional Notes</h4>
                <textarea
                  placeholder="Any additional information for the candidate..."
                  value={interviewData.notes}
                  onChange={(e) => updateInterviewData("notes", e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
          )}

          {/* Step 4/5: Review & Send */}
          {((currentStep === 4 && availableProviders.length === 1) || 
            (currentStep === 5 && availableProviders.length > 1)) && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Review Interview Details
                </h3>
                <p className="text-gray-600 mb-6">
                  Please select the final time slot and review all details before scheduling the interview.
                </p>
              </div>

              {/* Time Slot Selection */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Select Final Time Slot</h4>
                <p className="text-sm text-blue-700 mb-4">
                  Choose the specific time slot for this interview from your available options.
                </p>
                <div className="space-y-2">
                  {interviewData.timeSlots.map((slot) => (
                    <label key={slot.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border cursor-pointer hover:bg-blue-50 transition-colors">
                      <input
                        type="radio"
                        name="selectedTimeSlot"
                        value={slot.id}
                        checked={selectedTimeSlot?.id === slot.id}
                        onChange={() => setSelectedTimeSlot(slot)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">
                          {new Date(slot.date).toLocaleDateString()} at {slot.time}
                        </span>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                    </label>
                  ))}
                  
                  {interviewData.timeSlots.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                      <p>No time slots selected. Please go back and choose available times.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Interview Type & Duration */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Interview Format</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      {interviewData.type === "video" && <Video className="h-4 w-4 text-green-600" />}
                      {interviewData.type === "phone" && <Phone className="h-4 w-4 text-green-600" />}
                      {interviewData.type === "in-person" && <MapPin className="h-4 w-4 text-green-600" />}
                      <span className="capitalize">{interviewData.type} Interview</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{interviewData.duration} minutes</span>
                    </div>
                  </div>
                </div>

                {/* Interview Panel */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Interview Panel</h4>
                  <div className="space-y-1 text-sm">
                    {interviewData.interviewers
                      .filter(i => i.name && i.email)
                      .map((interviewer, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>{interviewer.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Time Slots */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Available Time Slots</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {interviewData.timeSlots.map((slot, index) => (
                    <div key={slot.id} className="flex items-center space-x-2 text-sm bg-white rounded p-2">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <span>
                        {new Date(slot.date).toLocaleDateString()} at {slot.time}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Timezone: {interviewData.timezone}
                </p>
              </div>

              {/* Meeting Details */}
              {(interviewData.meetingLink || interviewData.location) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Meeting Details</h4>
                  {interviewData.type === "video" && interviewData.meetingLink && (
                    <div className="text-sm">
                      <p className="text-gray-600">Video Link:</p>
                      <p className="font-mono text-blue-600 break-all">{interviewData.meetingLink}</p>
                    </div>
                  )}
                  {interviewData.type === "in-person" && interviewData.location && (
                    <div className="text-sm">
                      <p className="text-gray-600">Location:</p>
                      <p className="whitespace-pre-wrap">{interviewData.location}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Agenda & Notes */}
              {(interviewData.agenda || interviewData.notes) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Additional Information</h4>
                  {interviewData.agenda && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">Agenda:</p>
                      <p className="text-sm whitespace-pre-wrap">{interviewData.agenda}</p>
                    </div>
                  )}
                  {interviewData.notes && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Notes:</p>
                      <p className="text-sm whitespace-pre-wrap">{interviewData.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Email Notification Option */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Email Notification</h4>
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="sendEmailNotification"
                    checked={sendEmailNotification}
                    onChange={(e) => setSendEmailNotification(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <label htmlFor="sendEmailNotification" className="text-sm font-medium text-blue-900 cursor-pointer">
                      Send email invitation to candidate
                    </label>
                    <p className="text-xs text-blue-700 mt-1">
                      {sendEmailNotification 
                        ? "The candidate will receive an email with interview details and time options to accept/reschedule."
                        : "No email will be sent. The interview will be automatically marked as accepted, and you'll need to contact the candidate manually with interview details."
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                currentStep === 1
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push(`/applications-manager/candidate/${applicationId}`)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              {currentStep < (availableProviders.length > 1 ? 5 : 4) ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors ${
                    canProceed()
                      ? getButtonClasses("primary")
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canProceed() || scheduling}
                  className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors ${
                    (!canProceed() || scheduling)
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : getButtonClasses("primary")
                  }`}
                >
                  {scheduling ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>{scheduling ? "Scheduling..." : "Schedule Interview"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}