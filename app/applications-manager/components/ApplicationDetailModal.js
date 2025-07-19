// app/applications-manager/components/ApplicationDetailModal.js
"use client";

import { useState, useEffect } from "react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import QuickEmailModal from "./QuickEmailModal";
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  FileText,
  Download,
  Star,
  MessageSquare,
  Send,
  Save,
  AlertCircle,
  Eye,
  ExternalLink,
  Phone as PhoneIcon,
  Video,
  Plus,
  Hash,
  DollarSign,
} from "lucide-react";

export default function ApplicationDetailModal({
  application,
  isOpen,
  onClose,
  onStatusUpdate,
}) {
  const { getButtonClasses } = useThemeClasses();
  const [activeTab, setActiveTab] = useState("overview");
  const [notes, setNotes] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [applicationNotes, setApplicationNotes] = useState([]);
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [isSchedulingInterview, setIsSchedulingInterview] = useState(false);
  const [showQuickEmail, setShowQuickEmail] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && application) {
      setNotes(application.notes || "");
      setApplicationNotes([
        // Mock timeline data - in real app this would come from API
        {
          id: 1,
          type: "status_change",
          content: "Application received",
          status: "Applied",
          timestamp: application.appliedAt,
          author: "System",
        },
        {
          id: 2,
          type: "note",
          content: "Strong technical background, good communication skills",
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          author: "Sarah Wilson",
        },
      ]);
      setRating(3); // Default rating
      setTags(["Remote OK", "Senior Level"]);
    }
  }, [isOpen, application]);

  if (!isOpen || !application) return null;

  const statusOptions = [
    "Applied",
    "Reviewing",
    "Interview",
    "Hired",
    "Rejected",
  ];

  const getStatusColor = (status) => {
    const colors = {
      Applied: "bg-blue-100 text-blue-800 border-blue-200",
      Reviewing: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Interview: "bg-green-100 text-green-800 border-green-200",
      Hired: "bg-emerald-100 text-emerald-800 border-emerald-200",
      Rejected: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const handleStatusChange = async (newStatus) => {
    if (onStatusUpdate) {
      await onStatusUpdate(application.id, newStatus);
    }
  };

  const handleAddNote = () => {
    if (notes.trim()) {
      const newNote = {
        id: Date.now(),
        type: "note",
        content: notes.trim(),
        timestamp: new Date(),
        author: "Current User", // Would be actual user name
      };
      setApplicationNotes((prev) => [...prev, newNote]);
      setNotes("");
      setIsAddingNote(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags((prev) => [...prev, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  const handleCallCandidate = () => {
    if (application.phone) {
      // Use tel: protocol to trigger phone call
      window.location.href = `tel:${application.phone}`;
    } else {
      alert("No phone number available for this candidate");
    }
  };

  const handleSendEmail = () => {
    setShowQuickEmail(true);
  };

  const handleEmailSent = () => {
    // Optionally add a success message or update application status
    console.log("Email sent successfully!");
  };

  const formatSalary = (min, max, currency) => {
    if (!min && !max) return "Not specified";
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "CAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    if (min && max) {
      return `${formatter.format(min)} - ${formatter.format(max)}`;
    }
    return formatter.format(min || max);
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: User },
    { id: "timeline", label: "Timeline", icon: Clock },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "interview", label: "Interview", icon: Video },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {application.name || "Anonymous Applicant"}
                </h2>
                <p className="text-blue-100">{application.job?.title}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div
                className={`px-3 py-1 rounded-full border ${getStatusColor(application.status)}`}
              >
                {application.status}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Sidebar */}
          <div className="w-80 border-r border-gray-200 bg-gray-50">
            {/* Quick Actions */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={handleSendEmail}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${getButtonClasses("primary")}`}
                >
                  <Send className="h-4 w-4" />
                  <span>Send Email</span>
                </button>
                <button className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                  <Video className="h-4 w-4" />
                  <span>Schedule Interview</span>
                </button>
                <button 
                  onClick={handleCallCandidate}
                  disabled={!application.phone}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    application.phone 
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200" 
                      : "bg-gray-50 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <PhoneIcon className="h-4 w-4" />
                  <span>Call Candidate</span>
                </button>
              </div>
            </div>

            {/* Status Update */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Update Status
              </h3>
              <select
                value={application.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Rating
              </h3>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1"
                  >
                    <Star
                      className={`h-5 w-5 ${
                        star <= rating
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">({rating}/5)</span>
              </div>
            </div>

            {/* Tags */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                  >
                    <Hash className="h-3 w-3 mr-1" />
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-blue-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addTag()}
                  placeholder="Add tag..."
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={addTag}
                  className="p-1 text-blue-600 hover:text-blue-800"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Key Info */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Key Information
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Applied{" "}
                    {new Date(application.appliedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>3 days in pipeline</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{application.job?.location}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <DollarSign className="h-4 w-4" />
                  <span>
                    {formatSalary(
                      application.job?.salaryMin,
                      application.job?.salaryMax,
                      application.job?.salaryCurrency
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Tabs */}
            <div className="border-b border-gray-200 bg-white">
              <nav className="flex space-x-8 px-6">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Contact Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium">{application.email}</p>
                        </div>
                      </div>
                      {application.phone && (
                        <div className="flex items-center space-x-3">
                          <Phone className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600">Phone</p>
                            <p className="font-medium">{application.phone}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cover Letter */}
                  {application.coverLetter && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-4">
                        Cover Letter
                      </h3>
                      <div className="prose max-w-none">
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {application.coverLetter}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Job Details */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">
                      Position Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Department</p>
                        <p className="font-medium">
                          {application.job?.department}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Employment Type</p>
                        <p className="font-medium">
                          {application.job?.employmentType}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Experience Level
                        </p>
                        <p className="font-medium">
                          {application.job?.experienceLevel}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Remote Policy</p>
                        <p className="font-medium">
                          {application.job?.remotePolicy}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "timeline" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      Application Timeline
                    </h3>
                    <button
                      onClick={() => setIsAddingNote(!isAddingNote)}
                      className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm ${getButtonClasses("secondary")}`}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Note</span>
                    </button>
                  </div>

                  {isAddingNote && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add a note about this candidate..."
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={3}
                      />
                      <div className="flex items-center justify-end space-x-2 mt-3">
                        <button
                          onClick={() => setIsAddingNote(false)}
                          className="px-3 py-1 text-gray-600 hover:text-gray-800 text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddNote}
                          className={`flex items-center space-x-1 px-3 py-1 rounded text-sm ${getButtonClasses("primary")}`}
                        >
                          <Save className="h-4 w-4" />
                          <span>Save Note</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {applicationNotes.map((note) => (
                      <div key={note.id} className="flex space-x-4">
                        <div className="flex-shrink-0">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              note.type === "status_change"
                                ? "bg-blue-100"
                                : "bg-green-100"
                            }`}
                          >
                            {note.type === "status_change" ? (
                              <AlertCircle className="h-4 w-4 text-blue-600" />
                            ) : (
                              <MessageSquare className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">
                              {note.author}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(note.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm">
                            {note.content}
                          </p>
                          {note.status && (
                            <span
                              className={`inline-block mt-2 px-2 py-1 rounded-full text-xs ${getStatusColor(note.status)}`}
                            >
                              {note.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "documents" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Documents & Files</h3>

                  {/* Resume */}
                  {application.resumeUrl && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <p className="font-medium">Resume</p>
                            <p className="text-sm text-gray-600">
                              PDF Document
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-green-600 transition-colors">
                            <Download className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Documents Placeholder */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">
                      No additional documents
                    </p>
                    <p className="text-sm text-gray-500">
                      Cover letters, portfolios, and references will appear here
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "interview" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      Interview Management
                    </h3>
                    <button
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${getButtonClasses("primary")}`}
                    >
                      <Video className="h-4 w-4" />
                      <span>Schedule Interview</span>
                    </button>
                  </div>

                  {/* Interview placeholder */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">
                      No interviews scheduled
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      Schedule phone, video, or in-person interviews
                    </p>
                    <div className="flex items-center justify-center space-x-3">
                      <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                        <PhoneIcon className="h-4 w-4" />
                        <span>Phone Call</span>
                      </button>
                      <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                        <Video className="h-4 w-4" />
                        <span>Video Call</span>
                      </button>
                      <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                        <MapPin className="h-4 w-4" />
                        <span>In Person</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Email Modal */}
      <QuickEmailModal
        application={application}
        isOpen={showQuickEmail}
        onClose={() => setShowQuickEmail(false)}
        onSent={handleEmailSent}
      />
    </div>
  );
}
