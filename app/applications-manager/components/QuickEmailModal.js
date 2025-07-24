// app/applications-manager/components/QuickEmailModal.js
"use client";

import { useState, useEffect } from "react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import {
  X,
  Mail,
  Send,
  Eye,
  Edit,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export default function QuickEmailModal({
  application,
  isOpen,
  onClose,
  onSent,
}) {
  const { getButtonClasses } = useThemeClasses();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [emailContent, setEmailContent] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");

  // Load templates when modal opens
  useEffect(() => {
    if (isOpen && application) {
      loadTemplates();
    }
  }, [isOpen, application]);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch(
        `/api/admin/email-templates?default_only=true`
      );
      
      if (!response.ok) throw new Error("Failed to load templates");
      
      const data = await response.json();
      setTemplates(data);
      
      // Auto-select the first template if available
      if (data.length > 0) {
        handleTemplateSelect(data[0]);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
      setError("Failed to load email templates");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    
    // Replace variables in subject and content
    const processedSubject = replaceVariables(template.subject);
    const processedContent = replaceVariables(template.content);
    
    setEmailSubject(processedSubject);
    setEmailContent(processedContent);
  };

  const replaceVariables = (text) => {
    if (!text || !application) return text;

    // Define variable mappings
    const variables = {
      candidateName: application.name || "Candidate",
      jobTitle: application.job?.title || "Position",
      companyName: "JobSite Company", // You might want to get this from settings
      department: application.job?.department || "Department",
      senderName: "Hiring Team", // You might want to get this from user session
      reviewTimeframe: "5-7 business days",
      interviewDate: "TBD",
      interviewTime: "TBD", 
      duration: "45 minutes",
      interviewFormat: "Video call",
      interviewLocation: "TBD",
      startDate: "TBD",
      salary: application.job?.salaryMin && application.job?.salaryMax 
        ? `$${application.job.salaryMin.toLocaleString()} - $${application.job.salaryMax.toLocaleString()}`
        : "Competitive",
      benefits: "Comprehensive benefits package",
      deadline: "One week from today",
      requestedInfo: "Portfolio links, references, or additional documents",
      interviewDetails: "Meeting link will be provided",
      interviewExpectations: "Technical discussion and team fit assessment",
    };

    // Replace all variables in the format {{variableName}}
    let processedText = text;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processedText = processedText.replace(regex, value);
    });

    return processedText;
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailContent.trim()) {
      setError("Subject and content are required");
      return;
    }

    setIsSending(true);
    setError("");

    try {
      // This would integrate with your email sending system
      const response = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: application.email,
          toName: application.name,
          subject: emailSubject,
          content: emailContent,
          applicationId: application.id,
          templateId: selectedTemplate?.id,
        }),
      });

      if (!response.ok) throw new Error("Failed to send email");

      if (onSent) onSent();
      onClose();
    } catch (error) {
      console.error("Error sending email:", error);
      setError("Failed to send email. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const openInCommunicationHub = () => {
    // Navigate to communication hub with pre-filled data
    const params = new URLSearchParams({
      recipient: application.email,
      subject: emailSubject,
      content: emailContent,
    });
    window.open(`/applications-manager/communication?${params}`, '_blank');
  };

  if (!isOpen || !application) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail className="h-6 w-6" />
              <div>
                <h2 className="text-xl font-bold">Quick Email</h2>
                <p className="text-blue-100">
                  To: {application.name} ({application.email})
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

        <div className="p-6 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading templates...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Template Selection */}
              {templates.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Select Template (Default Templates)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        className={`text-left p-4 rounded-lg border-2 transition-colors ${
                          selectedTemplate?.id === template.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <div className="font-medium text-gray-900">
                          {template.name}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {template.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Composition */}
              {selectedTemplate && (
                <div className="space-y-4">
                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Content
                    </label>
                    {!showPreview ? (
                      <textarea
                        value={emailContent}
                        onChange={(e) => setEmailContent(e.target.value)}
                        rows={12}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      />
                    ) : (
                      <div className="w-full min-h-[288px] px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                        <div className="whitespace-pre-wrap text-sm">{emailContent}</div>
                      </div>
                    )}
                  </div>

                  {/* Preview Mode Toggle */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        showPreview
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <Eye className="h-4 w-4" />
                      <span>{showPreview ? "Edit" : "Preview"}</span>
                    </button>
                  </div>

                </div>
              )}

              {/* No Templates Message */}
              {!isLoading && templates.length === 0 && (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Templates Available
                  </h3>
                  <p className="text-gray-600 mb-4">
                    No email templates found for "{application.status}" status.
                  </p>
                  <button
                    onClick={openInCommunicationHub}
                    className={`flex items-center space-x-2 mx-auto px-4 py-2 rounded-lg ${getButtonClasses("secondary")}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Open Communication Hub</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedTemplate && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <button
                onClick={openInCommunicationHub}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                <Edit className="h-4 w-4" />
                <span>Advanced Editor</span>
              </button>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={isSending || !emailSubject.trim() || !emailContent.trim()}
                  className={`flex items-center space-x-2 px-6 py-2 rounded-lg ${getButtonClasses("primary")} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>{isSending ? "Sending..." : "Send Email"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}