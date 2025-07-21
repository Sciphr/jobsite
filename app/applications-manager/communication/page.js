// app/applications-manager/communication/page.js - Refactored with components
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useApplications, useJobsSimple, useUsers } from "@/app/hooks/useAdminData";
import { useEmailTemplates, useEmailHistory, useEmailAuditHistory, useEmailSender, useEmailExport } from "@/app/hooks/useCommunicationData";
import {
  Target,
  ArrowRight,
  Settings,
  Send,
  CheckCircle,
  Eye,
  FileText,
  Mail,
  Clock,
  BarChart3,
} from "lucide-react";

// Import components
import {
  EmailComposer,
  RecipientSelection,
  EmailTemplates,
  EmailHistory,
  EmailAnalytics,
  TemplateModal,
  EmailPreviewModal,
} from "./components";
import EnhancedEmailHistory from "./components/EnhancedEmailHistory";
import DefaultTemplateConfirmModal from "./components/DefaultTemplateConfirmModal";

export default function CommunicationHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
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
    category: "",
    description: "",
    isDefault: false,
    isActive: true,
  });

  // Default template confirmation modal state
  const [showDefaultConfirmModal, setShowDefaultConfirmModal] = useState(false);
  const [existingDefaultTemplate, setExistingDefaultTemplate] = useState(null);
  const [pendingTemplateData, setPendingTemplateData] = useState(null);

  // Filter states for history
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
  const [historyJob, setHistoryJob] = useState("");
  const [historyTemplate, setHistoryTemplate] = useState("");
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");
  
  // Enhanced audit history states
  const [useAuditData, setUseAuditData] = useState(false);
  const [historySeverity, setHistorySeverity] = useState("");
  const [historyActor, setHistoryActor] = useState("");
  const [includeFailures, setIncludeFailures] = useState(true);

  // Data fetching
  const { data: applications = [] } = useApplications();
  const { data: jobs = [] } = useJobsSimple();
  const { data: users = [] } = useUsers();

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
  
  // Enhanced audit-based email history
  const { data: auditEmailHistory = [], stats: auditEmailStats, loading: auditHistoryLoading } = useEmailAuditHistory({
    search: historySearch,
    status: historyStatus,
    jobId: historyJob,
    templateId: historyTemplate,
    dateFrom: historyDateFrom,
    dateTo: historyDateTo,
    actorId: historyActor,
    severity: historySeverity,
    includeFailures: includeFailures,
  }, { page: 1, limit: 50 });
  
  const { sendEmail, loading: sendingEmail } = useEmailSender();
  const { exportEmails, loading: exportingEmails } = useEmailExport();

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

  // Handle recipient pre-selection from URL parameters (e.g., from quick actions)
  useEffect(() => {
    const recipientId = searchParams.get('recipient');
    const recipientEmails = searchParams.get('recipients'); // For bulk emails
    const emailType = searchParams.get('emailType');
    const jobId = searchParams.get('jobId');
    
    if (applications.length > 0) {
      // Handle single recipient
      if (recipientId && !recipients.find(r => r.id === recipientId)) {
        const application = applications.find(app => app.id === recipientId);
        if (application) {
          setRecipients([{
            id: application.id,
            name: application.name || 'Anonymous',
            email: application.email,
            jobTitle: application.job?.title || 'Unknown Position',
            status: application.status
          }]);
          setActiveTab("compose");
          console.log('📧 Pre-filled recipient from quick action:', application.name || application.email);
        }
      }
      
      // Handle multiple recipients (bulk email)
      if (recipientEmails && recipients.length === 0) {
        const emails = recipientEmails.split(',');
        const selectedApps = applications.filter(app => emails.includes(app.email));
        
        if (selectedApps.length > 0) {
          const newRecipients = selectedApps.map(app => ({
            id: app.id,
            name: app.name || 'Anonymous',
            email: app.email,
            jobTitle: app.job?.title || 'Unknown Position',
            status: app.status,
            applicationId: app.id,
            jobId: app.jobId
          }));
          
          setRecipients(newRecipients);
          setActiveTab("compose");
          
          // Pre-select job filter if provided
          if (jobId) {
            setSelectedJob(jobId);
          }
          
          console.log('📧 Pre-filled bulk recipients:', newRecipients.length, 'recipients');
        }
      }
      
      // Handle email type and template pre-selection
      if (emailType && emailTemplates.length > 0 && !selectedTemplate) {
        const template = emailTemplates.find(t => 
          t.type === emailType && t.isDefault
        ) || emailTemplates.find(t => t.type === emailType);
        
        if (template) {
          handleTemplateSelect(template);
          console.log('📧 Pre-selected template:', template.name);
        }
      }
      
      // Clear URL parameters to avoid re-processing on page refresh
      if (recipientId || recipientEmails || emailType) {
        const newUrl = new URL(window.location);
        newUrl.searchParams.delete('recipient');
        newUrl.searchParams.delete('recipients');
        newUrl.searchParams.delete('emailType');
        newUrl.searchParams.delete('jobId');
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [searchParams, applications, emailTemplates, recipients.length, selectedTemplate]);

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
            applicationId: application.id,
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

  const handleToggleAuditData = () => {
    setUseAuditData(!useAuditData);
  };

  const replaceVariables = (content, recipient) => {
    if (!recipient) return content;

    const job = jobs.find((j) => j.id === selectedJob);
    
    // Comprehensive variable replacement matching backend
    const variables = {
      candidateName: recipient.name || "Candidate",
      jobTitle: job?.title || "Position",
      companyName: "Your Company",
      department: job?.department || "Department",
      senderName: "Hiring Manager",
      recipientEmail: recipient.email || "candidate@email.com",
      
      // Application-related variables
      reviewTimeframe: "1-2 weeks",
      timeframe: "1-2 weeks",
      currentStage: "review phase",
      expectedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      nextSteps: "• Initial review by hiring team\n• Technical assessment (if applicable)\n• Interview scheduling",
      timeline: "• Application review: 3-5 business days\n• Initial interview: 1-2 weeks\n• Final decision: 2-3 weeks",
      
      // Interview-related variables
      interviewDate: "TBD",
      interviewTime: "TBD",
      duration: "45-60 minutes",
      interviewFormat: "Video call via Zoom",
      interviewLocation: "Virtual",
      interviewDetails: "The interview will include a technical discussion and cultural fit assessment",
      interviewExpectations: "• Brief introduction and background discussion\n• Technical questions related to the role\n• Questions about your experience and projects\n• Opportunity for you to ask questions",
      originalDate: "TBD",
      originalTime: "TBD",
      option1: "Option 1: TBD",
      option2: "Option 2: TBD", 
      option3: "Option 3: TBD",
      
      // Onboarding variables
      startDate: "TBD",
      officeAddress: "123 Business St, City, State 12345",
      startTime: "9:00 AM",
      supervisor: "Team Lead",
      supervisorEmail: "supervisor@company.com",
      parkingInfo: "Visitor parking available in front lot",
      missingDocuments: "• ID verification\n• Tax forms\n• Emergency contact information",
      hrEmail: "hr@company.com",
      portalLink: "https://portal.company.com/onboarding",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      
      // Offer-related variables
      salary: "Competitive salary based on experience",
      benefits: "Health insurance, 401k, paid time off",
      
      // General variables
      retentionPeriod: "6 months",
      requestedInfo: "Portfolio links, references, or additional documents",
      
      // Reference check variables
      referenceName: "Reference",
      phoneNumber: "(555) 123-4567",
      email: "hiring@company.com",
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

    if (!session?.user?.id) {
      alert("You must be logged in as an admin to send emails.");
      return;
    }

    try {
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
        sentBy: session?.user?.id
      };

      const result = await sendEmail(emailData);
      
      if (result.success) {
        alert(`Successfully sent ${result.summary.successful} email(s)! ${result.summary.failed > 0 ? `${result.summary.failed} failed.` : ""}`);
        
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
      category: "",
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
        category: template.category || "",
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

    if (!session?.user?.id) {
      alert("You must be logged in as an admin to manage templates.");
      return;
    }

    try {
      const templateData = {
        ...templateForm,
        createdBy: session?.user?.id
      };

      // Check if trying to set as default and if there's already a default for this category
      if (templateForm.isDefault) {

        const response = await fetch('/api/admin/communication/templates/check-default', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: templateForm.category,
            excludeId: editingTemplate?.id
          })
        });

        const result = await response.json();

        if (result.hasExistingDefault) {
          
          // Show confirmation modal
          setExistingDefaultTemplate(result.existingTemplate);
          setPendingTemplateData(templateData);
          setShowDefaultConfirmModal(true);
          return; // Don't save yet, wait for user confirmation
        }
      }

      // Save template (either no conflict or not setting as default)
      await saveTemplateData(templateData);
    } catch (error) {
      alert(`Failed to ${editingTemplate ? "update" : "create"} template: ${error.message}`);
    }
  };

  const saveTemplateData = async (templateData) => {
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, templateData);
        alert("Template updated successfully!");
      } else {
        await createTemplate(templateData);
        alert("Template created successfully!");
      }
      
      closeTemplateModal();
      refetchTemplates();
      
      // Reset modal states
      setShowDefaultConfirmModal(false);
      setExistingDefaultTemplate(null);
      setPendingTemplateData(null);
    } catch (error) {
      throw error;
    }
  };

  const handleConfirmReplaceDefault = async () => {
    if (pendingTemplateData) {
      await saveTemplateData(pendingTemplateData);
    }
  };

  const handleKeepCurrentDefault = async () => {
    if (pendingTemplateData) {
      const templateDataWithoutDefault = {
        ...pendingTemplateData,
        isDefault: false
      };
      await saveTemplateData(templateDataWithoutDefault);
    }
  };

  const handleCloseDefaultConfirm = () => {
    setShowDefaultConfirmModal(false);
    setExistingDefaultTemplate(null);
    setPendingTemplateData(null);
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

  const handleExportEmails = async () => {
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

  // Show loading state while session is loading
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check admin permissions (same as layout)
  if (!session?.user?.privilegeLevel || session.user.privilegeLevel < 1) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">
            You need admin privileges to access the Communication Hub.
          </p>
        </div>
      </div>
    );
  }

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
          <nav className="flex px-6 relative">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-4 mr-6 border-b-2 font-medium text-sm transition-colors relative z-10 ${
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
                  <EmailComposer
                    emailTemplates={emailTemplates}
                    selectedTemplate={selectedTemplate}
                    setSelectedTemplate={setSelectedTemplate}
                    subject={subject}
                    setSubject={setSubject}
                    emailContent={emailContent}
                    setEmailContent={setEmailContent}
                    recipients={recipients}
                    sendingEmail={sendingEmail}
                    onTemplateSelect={handleTemplateSelect}
                    onPreview={handlePreview}
                    onSendEmail={handleSendEmail}
                  />
                  
                  <RecipientSelection
                    jobs={jobs}
                    selectedJob={selectedJob}
                    setSelectedJob={setSelectedJob}
                    selectedStatus={selectedStatus}
                    setSelectedStatus={setSelectedStatus}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    filteredApplications={filteredApplications}
                    recipients={recipients}
                    onRecipientToggle={handleRecipientToggle}
                    isRecipientSelected={isRecipientSelected}
                  />
                </div>
              )}

              {activeTab === "templates" && (
                <EmailTemplates
                  emailTemplates={emailTemplates}
                  onTemplateSelect={handleTemplateSelect}
                  onTemplateEdit={openTemplateModal}
                  onTemplateDelete={handleTemplateDelete}
                  onCreateTemplate={() => openTemplateModal()}
                />
              )}

              {activeTab === "history" && (
                <EnhancedEmailHistory
                  emails={emailHistory}
                  loading={historyLoading}
                  jobs={jobs}
                  emailTemplates={emailTemplates}
                  historySearch={historySearch}
                  setHistorySearch={setHistorySearch}
                  historyStatus={historyStatus}
                  setHistoryStatus={setHistoryStatus}
                  historyJob={historyJob}
                  setHistoryJob={setHistoryJob}
                  historyTemplate={historyTemplate}
                  setHistoryTemplate={setHistoryTemplate}
                  historyDateFrom={historyDateFrom}
                  setHistoryDateFrom={setHistoryDateFrom}
                  historyDateTo={historyDateTo}
                  setHistoryDateTo={setHistoryDateTo}
                  onExport={handleExportEmails}
                  exportingEmails={exportingEmails}
                  getEmailStatusColor={getEmailStatusColor}
                  stats={emailStats}
                  users={users}
                  // Enhanced audit props
                  auditEmails={auditEmailHistory}
                  auditLoading={auditHistoryLoading}
                  auditStats={auditEmailStats}
                  useAuditData={useAuditData}
                  onToggleAuditData={handleToggleAuditData}
                  historySeverity={historySeverity}
                  setHistorySeverity={setHistorySeverity}
                  historyActor={historyActor}
                  setHistoryActor={setHistoryActor}
                  includeFailures={includeFailures}
                  setIncludeFailures={setIncludeFailures}
                />
              )}

              {activeTab === "analytics" && (
                <EmailAnalytics
                  emailAnalytics={emailAnalytics}
                  emailTemplates={emailTemplates}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Template Modal */}
      <TemplateModal
        showModal={showTemplateModal}
        editingTemplate={editingTemplate}
        templateForm={templateForm}
        setTemplateForm={setTemplateForm}
        onSubmit={handleTemplateSubmit}
        onClose={closeTemplateModal}
      />

      {/* Email Preview Modal */}
      <EmailPreviewModal
        showPreview={showPreview}
        previewRecipient={previewRecipient}
        subject={subject}
        emailContent={emailContent}
        replaceVariables={replaceVariables}
        onClose={() => setShowPreview(false)}
        onSendEmail={handleSendEmail}
      />

      {/* Default Template Confirmation Modal */}
      <DefaultTemplateConfirmModal
        isOpen={showDefaultConfirmModal}
        onClose={handleCloseDefaultConfirm}
        onConfirm={handleConfirmReplaceDefault}
        onCancel={handleKeepCurrentDefault}
        existingTemplate={existingDefaultTemplate}
        newTemplateName={templateForm.name}
        templateType={templateForm.category}
      />
    </div>
  );
}