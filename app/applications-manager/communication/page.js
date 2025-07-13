// app/applications-manager/communication/page.js
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useApplications, useJobsSimple } from "@/app/hooks/useAdminData";
import {
  Mail,
  Send,
  MoreHorizontal,
  FileText,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  Eye,
  Edit,
  Copy,
  Target,
  ArrowRight,
  Settings,
  BarChart3,
  Download,
  Star,
  ExternalLink,
  Paperclip,
  TrendingUp,
  X,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export default function CommunicationHub() {
  const router = useRouter();
  const { getButtonClasses, getStatCardClasses } = useThemeClasses();

  // Data fetching
  const { data: applications = [] } = useApplications();
  const { data: jobs = [] } = useJobsSimple();

  // Local state
  const [activeTab, setActiveTab] = useState("compose");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [recipients, setRecipients] = useState([]);
  const [subject, setSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [selectedJob, setSelectedJob] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewRecipient, setPreviewRecipient] = useState(null);
  const [attachments, setAttachments] = useState([]);

  // Mock data for templates (would come from API)
  const emailTemplates = [
    {
      id: "1",
      name: "Interview Invitation",
      subject: "Interview Invitation - {{jobTitle}} Position",
      content: `Dear {{candidateName}},

Thank you for your interest in the {{jobTitle}} position at {{companyName}}. We were impressed with your application and would like to invite you for an interview.

Interview Details:
• Position: {{jobTitle}}
• Department: {{department}}
• Duration: 45 minutes
• Format: Video call via Zoom

Please let us know your availability for the next week, and we'll send you a calendar invitation with the meeting details.

We look forward to speaking with you!

Best regards,
{{senderName}}
{{companyName}} Hiring Team`,
      type: "interview_invite",
      isDefault: true,
      variables: [
        "candidateName",
        "jobTitle",
        "companyName",
        "department",
        "senderName",
      ],
    },
    {
      id: "2",
      name: "Application Received",
      subject: "Application Received - {{jobTitle}}",
      content: `Dear {{candidateName}},

Thank you for applying for the {{jobTitle}} position at {{companyName}}. We have received your application and our team will review it carefully.

We will be in touch within {{reviewTimeframe}} to let you know about next steps. In the meantime, feel free to explore more about our company and culture on our website.

Thank you for your interest in joining our team!

Best regards,
{{senderName}}
{{companyName}} Hiring Team`,
      type: "confirmation",
      isDefault: true,
      variables: [
        "candidateName",
        "jobTitle",
        "companyName",
        "reviewTimeframe",
        "senderName",
      ],
    },
    {
      id: "3",
      name: "Position Filled - Thank You",
      subject: "Update on {{jobTitle}} Position",
      content: `Dear {{candidateName}},

Thank you for your interest in the {{jobTitle}} position at {{companyName}} and for the time you invested in our application process.

After careful consideration, we have decided to move forward with another candidate whose background more closely matches our current needs. This was a difficult decision as we received many strong applications.

We were impressed with your qualifications and encourage you to apply for future opportunities that match your skills and experience. We'll keep your information on file and will reach out if a suitable position becomes available.

Thank you again for considering {{companyName}} as your next career opportunity.

Best regards,
{{senderName}}
{{companyName}} Hiring Team`,
      type: "rejection",
      isDefault: true,
      variables: ["candidateName", "jobTitle", "companyName", "senderName"],
    },
    {
      id: "4",
      name: "Follow-up After Interview",
      subject: "Thank you for interviewing - {{jobTitle}}",
      content: `Dear {{candidateName}},

Thank you for taking the time to interview for the {{jobTitle}} position with our team. It was a pleasure learning more about your background and experience.

We are currently reviewing all candidates and will make our decision by {{decisionDate}}. We will contact you with an update on your application status at that time.

If you have any questions in the meantime, please feel free to reach out.

Best regards,
{{senderName}}
{{companyName}} Hiring Team`,
      type: "follow_up",
      isDefault: true,
      variables: [
        "candidateName",
        "jobTitle",
        "companyName",
        "senderName",
        "decisionDate",
      ],
    },
    {
      id: "5",
      name: "Job Offer",
      subject: "Job Offer - {{jobTitle}} Position",
      content: `Dear {{candidateName}},

Congratulations! We are pleased to offer you the {{jobTitle}} position at {{companyName}}.

Offer Details:
• Position: {{jobTitle}}
• Department: {{department}}
• Start Date: {{startDate}}
• Salary: {{salary}}
• Benefits: {{benefits}}

Please review the attached offer letter for complete details. We would like to receive your response by {{responseDeadline}}.

We are excited about the possibility of you joining our team and look forward to your response.

Best regards,
{{senderName}}
{{companyName}} Hiring Team`,
      type: "offer",
      isDefault: true,
      variables: [
        "candidateName",
        "jobTitle",
        "companyName",
        "department",
        "startDate",
        "salary",
        "benefits",
        "responseDeadline",
        "senderName",
      ],
    },
  ];

  // Mock recent emails data
  const recentEmails = [
    {
      id: "1",
      subject: "Interview Invitation - Senior Developer",
      recipientName: "John Smith",
      recipientEmail: "john@email.com",
      status: "delivered",
      sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      template: "Interview Invitation",
      jobTitle: "Senior Developer",
      openedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      clickedAt: null,
    },
    {
      id: "2",
      subject: "Application Received - UX Designer",
      recipientName: "Sarah Johnson",
      recipientEmail: "sarah@email.com",
      status: "opened",
      sentAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      template: "Application Received",
      jobTitle: "UX Designer",
      openedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      clickedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: "3",
      subject: "Update on Marketing Manager Position",
      recipientName: "Mike Wilson",
      recipientEmail: "mike@email.com",
      status: "sent",
      sentAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      template: "Position Filled - Thank You",
      jobTitle: "Marketing Manager",
      openedAt: null,
      clickedAt: null,
    },
    {
      id: "4",
      subject: "Follow-up After Interview - Frontend Developer",
      recipientName: "Emma Davis",
      recipientEmail: "emma@email.com",
      status: "delivered",
      sentAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
      template: "Follow-up After Interview",
      jobTitle: "Frontend Developer",
      openedAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
      clickedAt: null,
    },
    {
      id: "5",
      subject: "Job Offer - Product Manager",
      recipientName: "Alex Chen",
      recipientEmail: "alex@email.com",
      status: "opened",
      sentAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      template: "Job Offer",
      jobTitle: "Product Manager",
      openedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
      clickedAt: new Date(Date.now() - 9 * 60 * 60 * 1000),
    },
  ];

  // Email analytics data
  const emailAnalytics = {
    totalSent: 247,
    delivered: 232,
    opened: 156,
    clicked: 89,
    bounced: 8,
    failed: 7,
    deliveryRate: 94,
    openRate: 67,
    clickRate: 36,
    bounceRate: 3,
  };

  // Filter applications for recipient selection
  const filteredApplications = useMemo(() => {
    let filtered = applications;

    if (selectedJob) {
      filtered = filtered.filter((app) => app.jobId === selectedJob);
    }

    if (selectedStatus) {
      filtered = filtered.filter((app) => app.status === selectedStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (app) =>
          app.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [applications, selectedJob, selectedStatus, searchTerm]);

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template.id);
    setSubject(template.subject);
    setEmailContent(template.content);
    setActiveTab("compose");
  };

  const handleRecipientToggle = (application) => {
    setRecipients((prev) => {
      const exists = prev.find((r) => r.id === application.id);
      if (exists) {
        return prev.filter((r) => r.id !== application.id);
      } else {
        return [
          ...prev,
          {
            id: application.id,
            name: application.name || "Anonymous",
            email: application.email,
            jobTitle: application.job?.title,
          },
        ];
      }
    });
  };

  const isRecipientSelected = (applicationId) => {
    return recipients.some((r) => r.id === applicationId);
  };

  const getEmailStatusColor = (status) => {
    const colors = {
      pending: "text-yellow-600 bg-yellow-100",
      sent: "text-blue-600 bg-blue-100",
      delivered: "text-green-600 bg-green-100",
      opened: "text-purple-600 bg-purple-100",
      failed: "text-red-600 bg-red-100",
      bounced: "text-red-600 bg-red-100",
    };
    return colors[status] || "text-gray-600 bg-gray-100";
  };

  // Replace variables in email content for preview
  const replaceVariables = (content, recipient) => {
    if (!recipient) return content;

    const job = jobs.find((j) => j.id === selectedJob);
    const variables = {
      candidateName: recipient.name || "Candidate",
      jobTitle: job?.title || "Position",
      companyName: "Your Company",
      department: job?.department || "Department",
      senderName: "Hiring Manager",
      reviewTimeframe: "1-2 weeks",
      decisionDate: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toLocaleDateString(),
      startDate: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000
      ).toLocaleDateString(),
      salary: "$75,000 - $90,000",
      benefits: "Health, Dental, Vision, 401k",
      responseDeadline: new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000
      ).toLocaleDateString(),
    };

    let processedContent = content;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      processedContent = processedContent.replace(regex, value);
    });

    return processedContent;
  };

  const handleSendEmail = async () => {
    if (recipients.length === 0 || !subject || !emailContent) {
      alert("Please select recipients and fill in all required fields.");
      return;
    }

    setIsSending(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Here you would make actual API calls to send emails
    console.log("Sending emails to:", recipients);
    console.log("Subject:", subject);
    console.log("Content:", emailContent);

    setIsSending(false);
    alert(`Successfully sent ${recipients.length} email(s)!`);

    // Reset form
    setRecipients([]);
    setSubject("");
    setEmailContent("");
    setSelectedTemplate("");
  };

  const handlePreview = (recipient) => {
    setPreviewRecipient(recipient);
    setShowPreview(true);
  };

  const tabs = [
    { id: "compose", label: "Compose Email", icon: Mail },
    { id: "templates", label: "Templates", icon: FileText },
    { id: "history", label: "Email History", icon: Clock },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold admin-text flex items-center space-x-3">
            <Target className="h-8 w-8 text-blue-600" />
            <span>Communication Hub</span>
          </h1>
          <p className="admin-text-light mt-2">
            Manage candidate communication with templates and bulk messaging
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() =>
              router.push("/applications-manager/communication/templates")
            }
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("secondary")}`}
          >
            <Settings className="h-4 w-4" />
            <span>Manage Templates</span>
          </button>
          <button
            onClick={() => router.push("/applications-manager")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("primary")}`}
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            <span>Back to Overview</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div
          className={`stat-card admin-card p-6 rounded-lg shadow ${getStatCardClasses(0).border}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold admin-text">
                {emailAnalytics.totalSent}
              </div>
              <div className="text-sm admin-text-light font-medium">
                Emails Sent This Week
              </div>
            </div>
            <div
              className={`stat-icon p-3 rounded-lg ${getStatCardClasses(0).bg}`}
            >
              <Send className={`h-6 w-6 ${getStatCardClasses(0).icon}`} />
            </div>
          </div>
        </div>

        <div
          className={`stat-card admin-card p-6 rounded-lg shadow ${getStatCardClasses(1).border}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold admin-text">
                {emailAnalytics.deliveryRate}%
              </div>
              <div className="text-sm admin-text-light font-medium">
                Delivery Rate
              </div>
            </div>
            <div
              className={`stat-icon p-3 rounded-lg ${getStatCardClasses(1).bg}`}
            >
              <CheckCircle
                className={`h-6 w-6 ${getStatCardClasses(1).icon}`}
              />
            </div>
          </div>
        </div>

        <div
          className={`stat-card admin-card p-6 rounded-lg shadow ${getStatCardClasses(2).border}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold admin-text">
                {emailAnalytics.openRate}%
              </div>
              <div className="text-sm admin-text-light font-medium">
                Open Rate
              </div>
            </div>
            <div
              className={`stat-icon p-3 rounded-lg ${getStatCardClasses(2).bg}`}
            >
              <Eye className={`h-6 w-6 ${getStatCardClasses(2).icon}`} />
            </div>
          </div>
        </div>

        <div
          className={`stat-card admin-card p-6 rounded-lg shadow ${getStatCardClasses(3).border}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold admin-text">
                {emailTemplates.length}
              </div>
              <div className="text-sm admin-text-light font-medium">
                Active Templates
              </div>
            </div>
            <div
              className={`stat-icon p-3 rounded-lg ${getStatCardClasses(3).bg}`}
            >
              <FileText className={`h-6 w-6 ${getStatCardClasses(3).icon}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-card rounded-lg shadow overflow-hidden">
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
        <div className="p-6">
          {activeTab === "compose" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Email Composer */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Compose Email</h3>

                  {/* Template Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Template
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => {
                        const template = emailTemplates.find(
                          (t) => t.id === e.target.value
                        );
                        if (template) handleTemplateSelect(template);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">
                        Select a template or write custom email
                      </option>
                      {emailTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} ({template.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject Line
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Enter email subject..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Email Content */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Content
                    </label>
                    <textarea
                      value={emailContent}
                      onChange={(e) => setEmailContent(e.target.value)}
                      placeholder="Write your email content here..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      rows={12}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Use variables like {"{candidateName}"}, {"{jobTitle}"},{" "}
                      {"{companyName}"} in your content
                    </p>
                  </div>

                  {/* Attachments */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attachments
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Paperclip className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Drop files here or click to upload
                      </p>
                      <input type="file" multiple className="hidden" />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {recipients.length} recipient
                      {recipients.length !== 1 ? "s" : ""} selected
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() =>
                          recipients.length > 0 && handlePreview(recipients[0])
                        }
                        disabled={recipients.length === 0}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Preview
                      </button>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                        Save as Template
                      </button>
                      <button
                        onClick={handleSendEmail}
                        disabled={isSending || recipients.length === 0}
                        className={`flex items-center space-x-2 px-6 py-2 rounded-lg ${getButtonClasses("primary")} disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            <span>Send Email</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recipient Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Select Recipients</h3>

                {/* Filters */}
                <div className="space-y-3">
                  <select
                    value={selectedJob}
                    onChange={(e) => setSelectedJob(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">All Jobs</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">All Statuses</option>
                    <option value="Applied">Applied</option>
                    <option value="Reviewing">Reviewing</option>
                    <option value="Interview">Interview</option>
                    <option value="Hired">Hired</option>
                    <option value="Rejected">Rejected</option>
                  </select>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search candidates..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* Candidates List */}
                <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        Candidates ({filteredApplications.length})
                      </span>
                      <button
                        onClick={() => {
                          if (
                            recipients.length === filteredApplications.length
                          ) {
                            setRecipients([]);
                          } else {
                            setRecipients(
                              filteredApplications.map((app) => ({
                                id: app.id,
                                name: app.name || "Anonymous",
                                email: app.email,
                                jobTitle: app.job?.title,
                              }))
                            );
                          }
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {recipients.length === filteredApplications.length
                          ? "Deselect All"
                          : "Select All"}
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-200">
                    {filteredApplications.map((application) => (
                      <div
                        key={application.id}
                        className="p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleRecipientToggle(application)}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isRecipientSelected(application.id)}
                            onChange={() => handleRecipientToggle(application)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {application.name || "Anonymous"}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {application.email}
                            </p>
                            <p className="text-xs text-gray-400">
                              {application.job?.title}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              application.status === "Applied"
                                ? "bg-blue-100 text-blue-800"
                                : application.status === "Reviewing"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : application.status === "Interview"
                                    ? "bg-green-100 text-green-800"
                                    : application.status === "Hired"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-red-100 text-red-800"
                            }`}
                          >
                            {application.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "templates" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Email Templates</h3>
                <button
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${getButtonClasses("primary")}`}
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Template</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {emailTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {template.name}
                        </h4>
                        <p className="text-sm text-gray-500 capitalize">
                          {template.type.replace("_", " ")}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {template.isDefault && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                            Default
                          </span>
                        )}
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Subject:
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {template.subject}
                      </p>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Preview:
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {template.content.substring(0, 120)}...
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {template.variables?.length || 0} variables
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleTemplateSelect(template)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Use Template
                        </button>
                        <button className="text-sm text-gray-500 hover:text-gray-700">
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recent Emails</h3>
                <div className="flex items-center space-x-2">
                  <button
                    className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm ${getButtonClasses("secondary")}`}
                  >
                    <Download className="h-4 w-4" />
                    <span>Export</span>
                  </button>
                  <button
                    className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm ${getButtonClasses("secondary")}`}
                  >
                    <Filter className="h-4 w-4" />
                    <span>Filter</span>
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recipient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Engagement
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentEmails.map((email) => (
                      <tr key={email.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {email.subject}
                            </p>
                            <p className="text-xs text-gray-500">
                              {email.template}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {email.recipientName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {email.recipientEmail}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getEmailStatusColor(email.status)}`}
                          >
                            {email.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-4 text-xs">
                            <div className="flex items-center space-x-1">
                              <Eye
                                className={`h-3 w-3 ${email.openedAt ? "text-green-500" : "text-gray-400"}`}
                              />
                              <span
                                className={
                                  email.openedAt
                                    ? "text-green-600"
                                    : "text-gray-500"
                                }
                              >
                                {email.openedAt ? "Opened" : "Not opened"}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <ExternalLink
                                className={`h-3 w-3 ${email.clickedAt ? "text-blue-500" : "text-gray-400"}`}
                              />
                              <span
                                className={
                                  email.clickedAt
                                    ? "text-blue-600"
                                    : "text-gray-500"
                                }
                              >
                                {email.clickedAt ? "Clicked" : "No clicks"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {email.sentAt.toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {email.sentAt.toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                              title="Resend"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                            <button
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              title="More options"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing 1 to {recentEmails.length} of {recentEmails.length}{" "}
                  results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                    disabled
                  >
                    Previous
                  </button>
                  <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                    1
                  </button>
                  <button
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                    disabled
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Email Analytics</h3>
                <div className="flex items-center space-x-2">
                  <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>Last 3 months</option>
                  </select>
                  <button
                    className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm ${getButtonClasses("secondary")}`}
                  >
                    <Download className="h-4 w-4" />
                    <span>Export Report</span>
                  </button>
                </div>
              </div>

              {/* Analytics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Total Sent
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {emailAnalytics.totalSent}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Send className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600">
                      +12% from last week
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Delivered
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {emailAnalytics.delivered}
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-sm text-gray-600">
                      {emailAnalytics.deliveryRate}% delivery rate
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Opened
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {emailAnalytics.opened}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Eye className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-sm text-gray-600">
                      {emailAnalytics.openRate}% open rate
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Clicked
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {emailAnalytics.clicked}
                      </p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <ExternalLink className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-sm text-gray-600">
                      {emailAnalytics.clickRate}% click rate
                    </span>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold mb-4">
                    Email Performance Over Time
                  </h4>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>Chart placeholder - Email performance timeline</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold mb-4">
                    Template Performance
                  </h4>
                  <div className="space-y-4">
                    {emailTemplates.slice(0, 3).map((template, index) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {template.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {Math.floor(Math.random() * 50) + 20} emails sent
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {Math.floor(Math.random() * 30) + 60}%
                          </p>
                          <p className="text-xs text-gray-500">open rate</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Issues and Recommendations */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold mb-4">
                  Issues & Recommendations
                </h4>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">
                        High bounce rate detected
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        {emailAnalytics.bounced} emails bounced (
                        {emailAnalytics.bounceRate}% bounce rate). Consider
                        cleaning your email list.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <Star className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800">
                        Optimization opportunity
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        Your "Interview Invitation" template has a 85% open
                        rate. Consider using similar subject lines for other
                        templates.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800">
                        Great performance
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        Your overall delivery rate of{" "}
                        {emailAnalytics.deliveryRate}% is excellent and above
                        industry average.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email Preview Modal */}
      {showPreview && previewRecipient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Email Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="text-sm text-gray-600 mb-4">
                  <strong>To:</strong> {previewRecipient.name} &lt;
                  {previewRecipient.email}&gt;
                  <br />
                  <strong>Subject:</strong>{" "}
                  {replaceVariables(subject, previewRecipient)}
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-gray-900 leading-relaxed">
                      {replaceVariables(emailContent, previewRecipient)}
                    </pre>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    handleSendEmail();
                  }}
                  className={`flex items-center space-x-2 px-6 py-2 rounded-lg ${getButtonClasses("primary")}`}
                >
                  <Send className="h-4 w-4" />
                  <span>Send Email</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
