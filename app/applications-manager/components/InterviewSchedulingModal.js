// app/applications-manager/components/InterviewSchedulingModal.js
"use client";

import { useState, useEffect } from "react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import CalendarPicker from "./CalendarPicker";
import {
  X,
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
} from "lucide-react";

export default function InterviewSchedulingModal({
  application,
  isOpen,
  onClose,
  onScheduled,
}) {
  const { getButtonClasses } = useThemeClasses();
  const [currentStep, setCurrentStep] = useState(1);
  const [interviewData, setInterviewData] = useState({
    type: "video", // phone, video, in-person
    duration: 45, // minutes
    timeSlots: [], // array of selected time slots
    interviewers: [{ name: "", email: "" }],
    location: "",
    meetingLink: "",
    notes: "",
    agenda: "",
    timezone: "America/Toronto",
  });
  const [availability, setAvailability] = useState({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const steps = [
    { id: 1, title: "Interview Type", description: "Choose interview format" },
    { id: 2, title: "Time Slots", description: "Select available times" },
    { id: 3, title: "Details", description: "Configure interview settings" },
    { id: 4, title: "Review", description: "Review and send invitation" },
  ];

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setInterviewData({
        type: "video",
        duration: 45,
        timeSlots: [],
        interviewers: [{ name: "", email: "" }],
        location: "",
        meetingLink: "",
        notes: "",
        agenda: "",
        timezone: "America/Toronto",
      });
      setAvailability({});
      setSelectedTimeSlot(null);
      setScheduling(false);
      setError("");
      setSuccess("");
    }
  }, [isOpen]);

  const handleNext = async () => {
    if (currentStep < 4) {
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

  const generateMeetingLink = () => {
    // Simulate generating a Google Meet link
    const meetingId = Math.random().toString(36).substring(2, 15);
    updateInterviewData("meetingLink", `https://meet.google.com/${meetingId}`);
  };


  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return interviewData.type;
      case 2:
        return interviewData.timeSlots.length > 0;
      case 3:
        return interviewData.interviewers.some(i => i.name && i.email);
      case 4:
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
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess("Interview scheduled successfully!");
        
        // Close modal after a brief success message
        setTimeout(() => {
          if (onScheduled) onScheduled();
          onClose();
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

  if (!isOpen || !application) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="h-6 w-6" />
              <div>
                <h2 className="text-xl font-bold">Schedule Interview</h2>
                <p className="text-green-100">
                  {application.name} - {application.job?.title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

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
        <div className="flex-1 overflow-y-auto p-6">
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

          {/* Step 2: Time Slots */}
          {currentStep === 2 && (
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
              />
            </div>
          )}

          {/* Step 3: Interview Details */}
          {currentStep === 3 && (
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
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        placeholder="Meeting link (auto-generated or custom)"
                        value={interviewData.meetingLink}
                        onChange={(e) => updateInterviewData("meetingLink", e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <button
                        onClick={generateMeetingLink}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        Generate Meet Link
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">
                      A Google Meet link will be automatically generated if left empty.
                    </p>
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

          {/* Step 4: Review & Send */}
          {currentStep === 4 && (
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

              {/* Email Preview */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Email Preview</h4>
                <div className="bg-white border border-gray-100 rounded p-4 text-sm">
                  <div className="border-b border-gray-200 pb-2 mb-3">
                    <p><strong>To:</strong> {application.name} &lt;{application.email}&gt;</p>
                    <p><strong>Subject:</strong> Interview Invitation - {application.job?.title}</p>
                  </div>
                  <div className="space-y-3 text-gray-700">
                    <p>Dear {application.name},</p>
                    <p>
                      Thank you for your interest in the {application.job?.title} position. 
                      We would like to invite you to an interview.
                    </p>
                    <p>
                      Please select one of the following time slots that work best for you:
                    </p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      {interviewData.timeSlots.map((slot, index) => (
                        <li key={slot.id}>
                          {new Date(slot.date).toLocaleDateString()} at {slot.time}
                        </li>
                      ))}
                    </ul>
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p><strong>Interview Details:</strong></p>
                      <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                        <li><strong>Format:</strong> {interviewData.type.charAt(0).toUpperCase() + interviewData.type.slice(1)} Interview</li>
                        <li><strong>Duration:</strong> {interviewData.duration} minutes</li>
                        {interviewData.type === 'video' && (
                          <>
                            <li>A Google Meet link will be included in your calendar invitation</li>
                            <li>Please test your camera and microphone beforehand</li>
                          </>
                        )}
                        {interviewData.type === 'phone' && (
                          <>
                            <li>We will call you at your provided phone number</li>
                            <li>Please ensure you have good phone reception</li>
                          </>
                        )}
                        {interviewData.type === 'in-person' && interviewData.location && (
                          <li><strong>Location:</strong> {interviewData.location}</li>
                        )}
                        {interviewData.type === 'in-person' && (
                          <li>Please arrive 10-15 minutes early</li>
                        )}
                      </ul>
                    </div>
                    
                    {interviewData.agenda && (
                      <div>
                        <p><strong>Interview Agenda:</strong></p>
                        <p className="whitespace-pre-wrap ml-4 bg-gray-50 p-2 rounded">{interviewData.agenda}</p>
                      </div>
                    )}
                    {interviewData.notes && (
                      <div>
                        <p><strong>Additional Information:</strong></p>
                        <p className="whitespace-pre-wrap ml-4 bg-gray-50 p-2 rounded">{interviewData.notes}</p>
                      </div>
                    )}
                    <p>Please reply to this email with your preferred time slot.</p>
                    <p>
                      Best regards,<br />
                      {interviewData.interviewers.find(i => i.name)?.name || "Hiring Team"}
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
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              {currentStep < 4 ? (
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