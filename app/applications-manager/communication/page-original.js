// app/applications-manager/communication/page.js - Complete rewrite with proper transitions
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useApplications, useJobsSimple } from "@/app/hooks/useAdminData";
import { useEmailTemplates, useEmailHistory, useEmailSender, useEmailExport } from "@/app/hooks/useCommunicationData";
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

  // Local state
  const [activeTab, setActiveTab] = useState("compose");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [recipients, setRecipients] = useState([]);
  const [subject, setSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [selectedJob, setSelectedJob] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewRecipient, setPreviewRecipient] = useState(null);
  
  // Template management states
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    subject: "",
    content: "",
    type: "",
    description: "",
    isDefault: false,
    isActive: true,
  });

  // Filter states for history
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
  const [historyJob, setHistoryJob] = useState("");
  const [historyTemplate, setHistoryTemplate] = useState("");
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");

  // Data fetching
  const { data: applications = [] } = useApplications();
  const { data: jobs = [] } = useJobsSimple();
  
  // Communication data
  const { data: emailTemplates = [], loading: templatesLoading, refetch: refetchTemplates, createTemplate, updateTemplate, deleteTemplate } = useEmailTemplates();
  const { data: emailHistory = [], stats: emailStats, loading: historyLoading } = useEmailHistory({
    search: historySearch,
    status: historyStatus,
    jobId: historyJob,
    templateId: historyTemplate,
    dateFrom: historyDateFrom,
    dateTo: historyDateTo,
  }, { page: 1, limit: 50 });
  const { sendEmail, loading: sendingEmail } = useEmailSender();
  const { exportEmails, loading: exportingEmails } = useEmailExport();

  // Use real email history instead of mock data
  const recentEmails = emailHistory;

  // Use real email analytics from API
  const emailAnalytics = {
    totalSent: emailStats.total || 0,
    delivered: emailStats.delivered || 0,
    opened: emailStats.opened || 0,
    clicked: emailStats.clicked || 0,
    bounced: emailStats.bounced || 0,
    failed: emailStats.failed || 0,
    deliveryRate: emailStats.total > 0 ? Math.round((emailStats.delivered / emailStats.total) * 100) : 0,
    openRate: emailStats.delivered > 0 ? Math.round((emailStats.opened / emailStats.delivered) * 100) : 0,
    clickRate: emailStats.opened > 0 ? Math.round((emailStats.clicked / emailStats.opened) * 100) : 0,
    bounceRate: emailStats.total > 0 ? Math.round((emailStats.bounced / emailStats.total) * 100) : 0,
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

    try {
      // Prepare email data
      const emailData = {
        recipients: recipients.map(recipient => ({
          name: recipient.name,
          email: recipient.email,
          applicationId: recipient.applicationId,
          jobId: selectedJob,
          jobTitle: recipient.jobTitle,
          department: jobs.find(j => j.id === selectedJob)?.department
        })),
        subject,
        content: emailContent,
        templateId: selectedTemplate || null,
        sentBy: "current-user-id" // TODO: Get actual user ID from auth context
      };

      const result = await sendEmail(emailData);
      
      if (result.success) {
        alert(`Successfully sent ${result.summary.successful} email(s)! ${result.summary.failed > 0 ? `${result.summary.failed} failed.` : ""}`);
        
        // Reset form
        setRecipients([]);
        setSubject("");
        setEmailContent("");
        setSelectedTemplate("");
      }
    } catch (error) {
      alert(`Failed to send email: ${error.message}`);
    }
  };

  const handlePreview = (recipient) => {
    setPreviewRecipient(recipient);
    setShowPreview(true);
  };

  // Template management functions
  const resetTemplateForm = () => {
    setTemplateForm({
      name: "",
      subject: "",
      content: "",
      type: "",
      description: "",
      isDefault: false,
      isActive: true,
    });
    setEditingTemplate(null);
  };

  const openTemplateModal = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        name: template.name,
        subject: template.subject,
        content: template.content,
        type: template.type,
        description: template.description || "",
        isDefault: template.isDefault,
        isActive: template.isActive,
      });
    } else {
      resetTemplateForm();
    }
    setShowTemplateModal(true);
  };

  const closeTemplateModal = () => {
    setShowTemplateModal(false);
    resetTemplateForm();
  };

  const handleTemplateSubmit = async (e) => {
    e.preventDefault();
    
    if (!templateForm.name || !templateForm.subject || !templateForm.content || !templateForm.type) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      const templateData = {
        ...templateForm,
        createdBy: "current-user-id" // TODO: Get actual user ID from auth context
      };

      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, templateData);
        alert("Template updated successfully!");
      } else {
        await createTemplate(templateData);
        alert("Template created successfully!");
      }
      
      closeTemplateModal();
      refetchTemplates();
    } catch (error) {
      alert(`Failed to ${editingTemplate ? "update" : "create"} template: ${error.message}`);
    }
  };

  const handleTemplateDelete = async (template) => {
    if (!confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
      return;
    }

    try {
      await deleteTemplate(template.id);
      alert("Template deleted successfully!");
      refetchTemplates();
    } catch (error) {
      alert(`Failed to delete template: ${error.message}`);
    }
  };

  // Tab configuration
  const tabs = [
    {
      id: "compose",
      label: "Compose Email",
      icon: Mail,
      description: "Create and send emails to candidates",
    },
    {
      id: "templates",
      label: "Templates",
      icon: FileText,
      description: "Manage email templates",
    },
    {
      id: "history",
      label: "Email History",
      icon: Clock,
      description: "View sent emails and engagement",
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      description: "Email performance metrics",
    },
  ];

  // Animation variants
  const tabContentVariants = {
    hidden: {
      opacity: 0,
      x: 20,
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      x: -20,
      transition: {
        duration: 0.2,
        ease: "easeIn",
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold admin-text flex items-center space-x-3">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Target className="h-8 w-8 text-blue-600" />
            </motion.div>
            <span>Communication Hub</span>
          </h1>
          <p className="admin-text-light mt-2">
            Manage candidate communication with templates and bulk messaging
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() =>
              router.push("/applications-manager/communication/templates")
            }
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("secondary")}`}
          >
            <Settings className="h-4 w-4" />
            <span>Manage Templates</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/applications-manager")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("primary")}`}
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            <span>Back to Overview</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        {[
          {
            label: "Emails Sent This Week",
            value: emailAnalytics.totalSent,
            icon: Send,
            index: 0,
          },
          {
            label: "Delivery Rate",
            value: `${emailAnalytics.deliveryRate}%`,
            icon: CheckCircle,
            index: 1,
          },
          {
            label: "Open Rate",
            value: `${emailAnalytics.openRate}%`,
            icon: Eye,
            index: 2,
          },
          {
            label: "Active Templates",
            value: emailTemplates.length,
            icon: FileText,
            index: 3,
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + stat.index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className={`stat-card admin-card p-6 rounded-lg shadow ${getStatCardClasses(stat.index).border}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold admin-text">
                  {stat.value}
                </div>
                <div className="text-sm admin-text-light font-medium">
                  {stat.label}
                </div>
              </div>
              <div
                className={`stat-icon p-3 rounded-lg ${getStatCardClasses(stat.index).bg}`}
              >
                <stat.icon
                  className={`h-6 w-6 ${getStatCardClasses(stat.index).icon}`}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Content with Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="admin-card rounded-lg shadow overflow-hidden"
      >
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-white">
          <nav className="flex space-x-8 px-6 relative">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors relative z-10 ${
                    isActive
                      ? "text-white"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* Animated background for active tab */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabBackground"
                      className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-lg"
                      style={{ zIndex: -1 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                      initial={false}
                    />
                  )}

                  <div className="flex items-center space-x-2 relative">
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </div>
                </motion.button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={tabContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {activeTab === "compose" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Email Composer */}
                  <div className="lg:col-span-2 space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">
                        Compose Email
                      </h3>

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
                          Use variables like {"{candidateName}"}, {"{jobTitle}"}
                          , {"{companyName}"} in your content
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          {recipients.length} recipient
                          {recipients.length !== 1 ? "s" : ""} selected
                        </div>
                        <div className="flex items-center space-x-3">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() =>
                              recipients.length > 0 &&
                              handlePreview(recipients[0])
                            }
                            disabled={recipients.length === 0}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Preview
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSendEmail}
                            disabled={sendingEmail || recipients.length === 0}
                            className={`flex items-center space-x-2 px-6 py-2 rounded-lg ${getButtonClasses("primary")} disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {sendingEmail ? (
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
                          </motion.button>
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
                                recipients.length ===
                                filteredApplications.length
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
                                onChange={() =>
                                  handleRecipientToggle(application)
                                }
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
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => openTemplateModal()}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${getButtonClasses("primary")}`}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create Template</span>
                    </motion.button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {emailTemplates.map((template) => (
                      <motion.div
                        key={template.id}
                        whileHover={{ scale: 1.02, y: -2 }}
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
                            <button 
                              onClick={() => openTemplateModal(template)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Edit template"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleTemplateDelete(template)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Delete template"
                            >
                              <X className="h-4 w-4" />
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
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleTemplateSelect(template)}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              Use Template
                            </motion.button>
                            <button className="text-sm text-gray-500 hover:text-gray-700">
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "history" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Email History</h3>
                    <div className="flex items-center space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={async () => {
                          try {
                            await exportEmails({
                              search: historySearch,
                              status: historyStatus,
                              jobId: historyJob,
                              templateId: historyTemplate,
                              dateFrom: historyDateFrom,
                              dateTo: historyDateTo,
                            });
                          } catch (error) {
                            alert(`Export failed: ${error.message}`);
                          }
                        }}
                        disabled={exportingEmails}
                        className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm ${getButtonClasses("secondary")} disabled:opacity-50`}
                      >
                        {exportingEmails ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        <span>{exportingEmails ? "Exporting..." : "Export"}</span>
                      </motion.button>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          placeholder="Search emails..."
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <select
                        value={historyStatus}
                        onChange={(e) => setHistoryStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="">All Statuses</option>
                        <option value="sent">Sent</option>
                        <option value="delivered">Delivered</option>
                        <option value="opened">Opened</option>
                        <option value="failed">Failed</option>
                        <option value="pending">Pending</option>
                      </select>
                      <select
                        value={historyJob}
                        onChange={(e) => setHistoryJob(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="">All Jobs</option>
                        {jobs.map((job) => (
                          <option key={job.id} value={job.id}>
                            {job.title}
                          </option>
                        ))}
                      </select>
                      <select
                        value={historyTemplate}
                        onChange={(e) => setHistoryTemplate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="">All Templates</option>
                        {emailTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={historyDateFrom}
                        onChange={(e) => setHistoryDateFrom(e.target.value)}
                        placeholder="From date"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <input
                        type="date"
                        value={historyDateTo}
                        onChange={(e) => setHistoryDateTo(e.target.value)}
                        placeholder="To date"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    {historyLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-600">Loading email history...</span>
                    </div>
                  ) : recentEmails.length > 0 ? (
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
                            <motion.tr
                              key={email.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-6 py-4">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {email.subject}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {email.template?.name || "Custom Email"}
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {email.recipientName || "Unknown"}
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
                                  {email.sentAt ? new Date(email.sentAt).toLocaleDateString() : ""}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {email.sentAt ? new Date(email.sentAt).toLocaleTimeString() : ""}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-2">
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="View details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                    title="Resend"
                                  >
                                    <Send className="h-4 w-4" />
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                    title="More options"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </motion.button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No emails found
                      </h3>
                      <p className="text-gray-500">
                        {historySearch || historyStatus || historyJob || historyTemplate
                          ? "Try adjusting your filters to see more results."
                          : "No emails have been sent yet."}
                      </p>
                    </div>
                  )}
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
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm ${getButtonClasses("secondary")}`}
                      >
                        <Download className="h-4 w-4" />
                        <span>Export Report</span>
                      </motion.button>
                    </div>
                  </div>

                  {/* Analytics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      {
                        label: "Total Sent",
                        value: emailAnalytics.totalSent,
                        icon: Send,
                        color: "blue",
                        trend: "+12% from last week",
                      },
                      {
                        label: "Delivered",
                        value: emailAnalytics.delivered,
                        icon: CheckCircle,
                        color: "green",
                        subtitle: `${emailAnalytics.deliveryRate}% delivery rate`,
                      },
                      {
                        label: "Opened",
                        value: emailAnalytics.opened,
                        icon: Eye,
                        color: "purple",
                        subtitle: `${emailAnalytics.openRate}% open rate`,
                      },
                      {
                        label: "Clicked",
                        value: emailAnalytics.clicked,
                        icon: ExternalLink,
                        color: "orange",
                        subtitle: `${emailAnalytics.clickRate}% click rate`,
                      },
                    ].map((metric, index) => (
                      <motion.div
                        key={metric.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="bg-white border border-gray-200 rounded-lg p-6"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">
                              {metric.label}
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                              {metric.value}
                            </p>
                          </div>
                          <div
                            className={`p-3 rounded-lg ${
                              metric.color === 'blue' ? 'bg-blue-100' :
                              metric.color === 'green' ? 'bg-green-100' :
                              metric.color === 'purple' ? 'bg-purple-100' :
                              metric.color === 'orange' ? 'bg-orange-100' :
                              'bg-gray-100'
                            }`}
                          >
                            <metric.icon
                              className={`h-6 w-6 ${
                                metric.color === 'blue' ? 'text-blue-600' :
                                metric.color === 'green' ? 'text-green-600' :
                                metric.color === 'purple' ? 'text-purple-600' :
                                metric.color === 'orange' ? 'text-orange-600' :
                                'text-gray-600'
                              }`}
                            />
                          </div>
                        </div>
                        {metric.trend && (
                          <div className="mt-4 flex items-center">
                            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                            <span className="text-sm text-green-600">
                              {metric.trend}
                            </span>
                          </div>
                        )}
                        {metric.subtitle && (
                          <div className="mt-4">
                            <span className="text-sm text-gray-600">
                              {metric.subtitle}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {/* Charts placeholder */}
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
                          <motion.div
                            key={template.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: 1.02 }}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-gray-900">
                                {template.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {Math.floor(Math.random() * 50) + 20} emails
                                sent
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">
                                {Math.floor(Math.random() * 30) + 60}%
                              </p>
                              <p className="text-xs text-gray-500">open rate</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Template Modal */}
      <AnimatePresence>
        {showTemplateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold">
                  {editingTemplate ? "Edit Template" : "Create New Template"}
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={closeTemplateModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>
              
              <form onSubmit={handleTemplateSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Template Name *
                      </label>
                      <input
                        type="text"
                        value={templateForm.name}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter template name..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Template Type *
                      </label>
                      <select
                        value={templateForm.type}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Select type...</option>
                        <option value="welcome">Welcome</option>
                        <option value="confirmation">Application Confirmation</option>
                        <option value="interview_invite">Interview Invitation</option>
                        <option value="rejection">Rejection</option>
                        <option value="offer">Job Offer</option>
                        <option value="follow_up">Follow Up</option>
                        <option value="general">General</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject Line *
                      </label>
                      <input
                        type="text"
                        value={templateForm.subject}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Enter subject line..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={templateForm.description}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Optional description..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isDefault"
                          checked={templateForm.isDefault}
                          onChange={(e) => setTemplateForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="isDefault" className="text-sm text-gray-700">
                          Set as default template for this type
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={templateForm.isActive}
                          onChange={(e) => setTemplateForm(prev => ({ ...prev, isActive: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="isActive" className="text-sm text-gray-700">
                          Template is active
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Content *
                    </label>
                    <textarea
                      value={templateForm.content}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Enter email content..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      rows={16}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Use variables like {{candidateName}}, {{jobTitle}}, {{companyName}}, {{department}}, {{senderName}}, {{reviewTimeframe}} in your content
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={closeTemplateModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center space-x-2 px-6 py-2 rounded-lg ${getButtonClasses("primary")}`}
                  >
                    <span>{editingTemplate ? "Update Template" : "Create Template"}</span>
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Preview Modal */}
      <AnimatePresence>
        {showPreview && previewRecipient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Email Preview</h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </motion.button>
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
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowPreview(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowPreview(false);
                      handleSendEmail();
                    }}
                    className={`flex items-center space-x-2 px-6 py-2 rounded-lg ${getButtonClasses("primary")}`}
                  >
                    <Send className="h-4 w-4" />
                    <span>Send Email</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
