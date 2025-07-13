// app/applications-manager/communication/page.js
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useApplications, useJobsSimple } from "@/app/hooks/useAdminData";
import {
  Mail,
  Send,
  Users,
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Edit,
  Copy,
  Trash2,
  Target,
  Zap,
  ArrowRight,
  MessageSquare,
  Settings,
  BarChart3,
  Download,
  Upload,
  Star,
  Tag,
  UserCheck,
  Briefcase
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
      variables: ["candidateName", "jobTitle", "companyName", "department", "senderName"]
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
      variables: ["candidateName", "jobTitle", "companyName", "reviewTimeframe", "senderName"]
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
      variables: ["candidateName", "jobTitle", "companyName", "senderName"]
    }
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
      jobTitle: "Senior Developer"
    },
    {
      id: "2",
      subject: "Application Received - UX Designer", 
      recipientName: "Sarah Johnson",
      recipientEmail: "sarah@email.com",
      status: "opened",
      sentAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      template: "Application Received",
      jobTitle: "UX Designer"
    },
    {
      id: "3",
      subject: "Update on Marketing Manager Position",
      recipientName: "Mike Wilson",
      recipientEmail: "mike@email.com", 
      status: "sent",
      sentAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      template: "Position Filled - Thank You",
      jobTitle: "Marketing Manager"
    }
  ];

  // Filter applications for recipient selection
  const filteredApplications = useMemo(() => {
    let filtered = applications;

    if (selectedJob) {
      filtered = filtered.filter(app => app.jobId === selectedJob);
    }

    if (selectedStatus) {
      filtered = filtered.filter(app => app.status === selectedStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(app =>
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
  };

  const handleRecipientToggle = (application) => {
    setRecipients(prev => {
      const exists = prev.find(r => r.id === application.id);
      if (exists) {
        return prev.filter(r => r.id !== application.id);
      } else {
        return [...prev, {
          id: application.id,
          name: application.name || "Anonymous",
          email: application.email,
          jobTitle: application.job?.title
        }];
      }
    });
  };

  const isRecipientSelected = (applicationId) => {
    return recipients.some(r => r.id === applicationId);
  };

  const getEmailStatusColor = (status) => {
    const colors = {
      pending: "text-yellow-600 bg-yellow-100",
      sent: "text-blue-600 bg-blue-100", 
      delivered: "text-green-600 bg-green-100",
      opened: "text-purple-600 bg-purple-100",
      failed: "text-red-600 bg-red-100",
      bounced: "text-red-600 bg-red-100"
    };
    return colors[status] || "text-gray-600 bg-gray-100";
  };

  const tabs = [
    { id: "compose", label: "Compose Email", icon: Mail },
    { id: "templates", label: "Templates", icon: FileText }, 
    { id: "history", label: "Email History", icon: Clock },
    { id: "analytics", label: "Analytics", icon: BarChart3 }
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
            onClick={() => router.push('/applications-manager/communication/templates')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("secondary")}`}
          >
            <Settings className="h-4 w-4" />
            <span>Manage Templates</span>
          </button>
          <button
            onClick={() => router.push('/applications-manager')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("primary")}`}
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            <span>Back to Overview</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`stat-card admin-card p-6 rounded-lg shadow ${getStatCardClasses(0).border}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold admin-text">127</div>
              <div className="text-sm admin-text-light font-medium">Emails Sent This Week</div>
            </div>
            <div className={`stat-icon p-3 rounded-lg ${getStatCardClasses(0).bg}`}>
              <Send className={`h-6 w-6 ${getStatCardClasses(0).icon}`} />
            </div>
          </div>
        </div>

        <div className={`stat-card admin-card p-6 rounded-lg shadow ${getStatCardClasses(1).border}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold admin-text">94%</div>
              <div className="text-sm admin-text-light font-medium">Delivery Rate</div>
            </div>
            <div className={`stat-icon p-3 rounded-lg ${getStatCardClasses(1).bg}`}>
              <CheckCircle className={`h-6 w-6 ${getStatCardClasses(1).icon}`} />
            </div>
          </div>
        </div>

        <div className={`stat-card admin-card p-6 rounded-lg shadow ${getStatCardClasses(2).border}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold admin-text">67%</div>
              <div className="text-sm admin-text-light font-medium">Open Rate</div>
            </div>
            <div className={`stat-icon p-3 rounded-lg ${getStatCardClasses(2).bg}`}>
              <Eye className={`h-6 w-6 ${getStatCardClasses(2).icon}`} />
            </div>
          </div>
        </div>

        <div className={`stat-card admin-card p-6 rounded-lg shadow ${getStatCardClasses(3).border}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold admin-text">12</div>
              <div className="text-sm admin-text-light font-medium">Active Templates</div>
            </div>
            <div className={`stat-icon p-3 rounded-lg ${getStatCardClasses(3).bg}`}>
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
                        const template = emailTemplates.find(t => t.id === e.target.value);
                        if (template) handleTemplateSelect(template);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a template or write custom email</option>
                      {emailTemplates.map(template => (
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
                      Use variables like {{`candidateName`}}, {{`jobTitle`}}, {{`companyName`}} in your content
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {recipients.length} recipient{recipients.length !== 1 ? 's' : ''} selected
                    </div>
                    <div className="flex items-center space-x-3">
                      <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                        Save as Template
                      </button>
                      <button className={`flex items-center space-x-2 px-6 py-2 rounded-lg ${getButtonClasses("primary")}`}>
                        <Send className="h-4 w-4" />
                        <span>Send Email</span>
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
                    {jobs.map(job => (
                      <option key={job.id} value={job.id}>{job.title}</option>
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
                      <span className="font-medium">Candidates ({filteredApplications.length})</span>
                      <button
                        onClick={() => {
                          if (recipients.length === filteredApplications.length) {
                            setRecipients([]);
                          } else {
                            setRecipients(filteredApplications.map(app => ({
                              id: app.id,
                              name: app.name || "Anonymous",
                              email: app.email,
                              jobTitle: app.job?.title
                            })));
                          }
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {recipients.length === filteredApplications.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {filteredApplications.map(application => (
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
                            <p className="text-xs text-gray-500 truncate">{application.email}</p>
                            <p className="text-xs text-gray-400">{application.job?.title}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            application.status === 'Applied' ? 'bg-blue-100 text-blue-800' :
                            application.status === 'Reviewing' ? 'bg-yellow-100 text-yellow-800' :
                            application.status === 'Interview' ? 'bg-green-100 text-green-800' :
                            application.status === 'Hired' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-red-100 text-red-800'
                          }`}>
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

          {activeTab === "history" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recent Emails</h3>
                <div className="flex items-center space-x-2">
                  <button className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm ${getButtonClasses("secondary")}`}>
                    <Download className="h-4 w-4" />
                    <span>Export</span>
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
                        Sent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentEmails.map(email => (
                      <tr key={email.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-