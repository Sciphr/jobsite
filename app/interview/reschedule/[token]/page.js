// app/interview/reschedule/[token]/page.js
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Send,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

export default function InterviewReschedulePage() {
  const params = useParams();
  const token = params.token;
  
  const [interviewData, setInterviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  
  const [responseType, setResponseType] = useState(""); // "alternative_times" or "written_response"
  const [alternativeTimes, setAlternativeTimes] = useState([
    { date: "", time: "", note: "" }
  ]);
  const [writtenResponse, setWrittenResponse] = useState("");

  useEffect(() => {
    if (token) {
      fetchInterviewData();
    }
  }, [token]);

  const fetchInterviewData = async () => {
    try {
      const response = await fetch(`/api/interview/reschedule/${token}`);
      if (response.ok) {
        const data = await response.json();
        setInterviewData(data.interview);
      } else {
        setError("Interview not found or link has expired");
      }
    } catch (error) {
      console.error("Error fetching interview data:", error);
      setError("Failed to load interview information");
    } finally {
      setLoading(false);
    }
  };

  const addAlternativeTime = () => {
    setAlternativeTimes([...alternativeTimes, { date: "", time: "", note: "" }]);
  };

  const removeAlternativeTime = (index) => {
    setAlternativeTimes(alternativeTimes.filter((_, i) => i !== index));
  };

  const updateAlternativeTime = (index, field, value) => {
    setAlternativeTimes(alternativeTimes.map((time, i) => 
      i === index ? { ...time, [field]: value } : time
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        responseType,
        ...(responseType === "alternative_times" ? { alternativeTimes } : { writtenResponse })
      };

      const response = await fetch(`/api/interview/reschedule/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to submit response");
      }
    } catch (error) {
      console.error("Error submitting response:", error);
      setError("Failed to submit response. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !interviewData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Interview Not Found</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Response Submitted</h2>
          <p className="text-gray-600 mb-4">
            Thank you for your response. The hiring team will review your availability and get back to you soon.
          </p>
          <div className="text-sm text-gray-500">
            You can now close this page.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8 text-white">
            <div className="flex items-center space-x-3 mb-4">
              <Calendar className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">Interview Reschedule Request</h1>
                <p className="text-blue-100">We'd like to find a time that works better for you</p>
              </div>
            </div>
          </div>

          {/* Interview Details */}
          <div className="px-6 py-6 bg-blue-50 border-b border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Original Interview Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-700">Position</p>
                  <p className="font-medium text-blue-900">{interviewData?.jobTitle}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-700">Duration</p>
                  <p className="font-medium text-blue-900">{interviewData?.duration} minutes</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-700">Original Time</p>
                  <p className="font-medium text-blue-900">
                    {interviewData?.originalDateTime && new Date(interviewData.originalDateTime).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-700">Format</p>
                  <p className="font-medium text-blue-900 capitalize">{interviewData?.type} Interview</p>
                </div>
              </div>
            </div>
          </div>

          {/* Response Options */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  How would you like to respond?
                </h3>
                
                <div className="space-y-4">
                  <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      value="alternative_times"
                      checked={responseType === "alternative_times"}
                      onChange={(e) => setResponseType(e.target.value)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Suggest Alternative Times</div>
                      <div className="text-sm text-gray-600">
                        Provide specific dates and times that work better for you
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      value="written_response"
                      checked={responseType === "written_response"}
                      onChange={(e) => setResponseType(e.target.value)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Written Response</div>
                      <div className="text-sm text-gray-600">
                        Describe your availability or explain any scheduling constraints
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Alternative Times Section */}
              {responseType === "alternative_times" && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Suggest Alternative Times</h4>
                  {alternativeTimes.map((timeSlot, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Preferred Date
                          </label>
                          <input
                            type="date"
                            value={timeSlot.date}
                            onChange={(e) => updateAlternativeTime(index, "date", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Preferred Time
                          </label>
                          <input
                            type="time"
                            value={timeSlot.time}
                            onChange={(e) => updateAlternativeTime(index, "time", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div className="flex items-end">
                          {alternativeTimes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeAlternativeTime(index)}
                              className="px-3 py-2 text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Note (optional)
                        </label>
                        <input
                          type="text"
                          value={timeSlot.note}
                          onChange={(e) => updateAlternativeTime(index, "note", e.target.value)}
                          placeholder="Any additional notes about this time..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={addAlternativeTime}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Add Another Time Option</span>
                  </button>
                </div>
              )}

              {/* Written Response Section */}
              {responseType === "written_response" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe Your Availability
                  </label>
                  <textarea
                    value={writtenResponse}
                    onChange={(e) => setWrittenResponse(e.target.value)}
                    rows={6}
                    placeholder="Please describe your availability, preferred times, or any scheduling constraints..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Be as specific as possible to help us find a mutually convenient time.
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span className="text-red-700 font-medium">Error</span>
                  </div>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  We'll review your response and get back to you within 24 hours.
                </div>
                <button
                  type="submit"
                  disabled={!responseType || submitting}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
                    !responseType || submitting
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>{submitting ? "Submitting..." : "Submit Response"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}