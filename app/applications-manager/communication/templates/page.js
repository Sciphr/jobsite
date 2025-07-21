"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useEmailTemplates } from "@/app/hooks/useCommunicationData";
import {
  ArrowLeft,
  Settings,
  Search,
  Filter,
  Grid,
  List,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  BarChart3,
  Tag,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Mail,
  Users,
  TrendingUp,
  Activity,
  Zap,
  Archive,
} from "lucide-react";
import DefaultTemplateConfirmModal from "../components/DefaultTemplateConfirmModal";

export default function TemplateManagement() {
  const router = useRouter();
  const { data: session } = useSession();
  const { getButtonClasses, getStatCardClasses } = useThemeClasses();

  // Data fetching
  const { 
    data: emailTemplates = [], 
    loading: templatesLoading, 
    refetch: refetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate 
  } = useEmailTemplates();

  // State management
  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState("templates");

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: "",
    subject: "",
    content: "",
    type: "",
    description: "",
    category: "",
    tags: [],
    isDefault: false,
    isActive: true,
  });

  // Default conflict modal state
  const [showDefaultConfirmModal, setShowDefaultConfirmModal] = useState(false);
  const [existingDefaultTemplate, setExistingDefaultTemplate] = useState(null);
  const [pendingTemplateData, setPendingTemplateData] = useState(null);

  // Template categories for organization
  const templateCategories = [
    { id: "application", label: "Application Status", icon: FileText, color: "blue" },
    { id: "interview", label: "Interview Process", icon: Users, color: "green" },
    { id: "onboarding", label: "Onboarding", icon: CheckCircle, color: "purple" },
    { id: "rejection", label: "Rejection", icon: AlertCircle, color: "red" },
    { id: "general", label: "General", icon: Mail, color: "gray" },
    { id: "follow_up", label: "Follow Up", icon: Clock, color: "orange" },
  ];

  // Template types for specific use cases
  const templateTypes = [
    "application_received",
    "application_under_review",
    "interview_invitation",
    "interview_reminder",
    "interview_feedback",
    "offer_extended",
    "offer_accepted",
    "offer_declined",
    "rejection_general",
    "rejection_interview",
    "onboarding_welcome",
    "document_request",
    "follow_up",
    "custom"
  ];

  // Analytics data using actual category field
  const templateAnalytics = useMemo(() => {
    return {
      totalTemplates: emailTemplates.length,
      activeTemplates: emailTemplates.filter(t => t.isActive).length,
      defaultTemplates: emailTemplates.filter(t => t.isDefault).length,
      recentlyUsed: emailTemplates
        .filter(t => t.lastUsedAt)
        .sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt))
        .slice(0, 5),
      mostUsed: emailTemplates
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, 3),
      categoryBreakdown: templateCategories.map(cat => ({
        ...cat,
        count: emailTemplates.filter(t => t.category === cat.id).length
      })),
    };
  }, [emailTemplates]);

  // Filter and search logic
  const filteredTemplates = useMemo(() => {
    let filtered = [...emailTemplates];

    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category using the actual category field
    if (selectedCategory !== "all") {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    if (selectedType !== "all") {
      filtered = filtered.filter(template => template.type === selectedType);
    }

    if (selectedStatus !== "all") {
      if (selectedStatus === "active") {
        filtered = filtered.filter(template => template.isActive);
      } else if (selectedStatus === "inactive") {
        filtered = filtered.filter(template => !template.isActive);
      } else if (selectedStatus === "default") {
        filtered = filtered.filter(template => template.isDefault);
      }
    }

    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === "usage") {
        aValue = a.usageCount || 0;
        bValue = b.usageCount || 0;
      } else if (sortBy === "created") {
        aValue = new Date(a.createdAt);
        bValue = new Date(b.createdAt);
      } else if (sortBy === "updated") {
        aValue = new Date(a.updatedAt);
        bValue = new Date(b.updatedAt);
      }

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [emailTemplates, searchTerm, selectedCategory, selectedType, selectedStatus, sortBy, sortOrder]);

  // Template selection handlers
  const handleTemplateSelect = (templateId) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTemplates.length === filteredTemplates.length) {
      setSelectedTemplates([]);
    } else {
      setSelectedTemplates(filteredTemplates.map(t => t.id));
    }
  };

  // Template CRUD operations
  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: "",
      subject: "",
      content: "",
      type: "",
      description: "",
      category: "",
      tags: [],
      isDefault: false,
      isActive: true,
    });
    setShowCreateModal(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      content: template.content,
      type: template.type,
      description: template.description || "",
      category: template.category || "",
      tags: template.tags || [],
      isDefault: template.isDefault,
      isActive: template.isActive,
    });
    setShowCreateModal(true);
  };

  const handleSaveTemplate = async () => {
    try {
      console.log('💾 handleSaveTemplate called with:', {
        isEditing: !!editingTemplate,
        templateId: editingTemplate?.id,
        templateName: templateForm.name,
        category: templateForm.category,
        isDefault: templateForm.isDefault
      });

      const templateData = {
        ...templateForm,
        createdBy: session?.user?.id
      };

      // Check if trying to set as default and if there's already a default for this type
      if (templateForm.isDefault) {
        console.log('🔍 Checking for existing default template:', {
          category: templateForm.category,
          excludeId: editingTemplate?.id,
          templateName: templateForm.name
        });

        const response = await fetch('/api/admin/communication/templates/check-default', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: templateForm.category,
            excludeId: editingTemplate?.id
          })
        });

        const result = await response.json();
        console.log('📋 Default template check result:', result);

        if (result.hasExistingDefault) {
          console.log('⚠️ Existing default found, showing confirmation modal');
          // Show confirmation modal
          setExistingDefaultTemplate(result.existingTemplate);
          setPendingTemplateData(templateData);
          setShowDefaultConfirmModal(true);
          return; // Don't save yet, wait for user confirmation
        } else {
          console.log('✅ No existing default found, proceeding with save');
        }
      }

      // Save template (either no conflict or not setting as default)
      await saveTemplateData(templateData);
    } catch (error) {
      console.error("Error saving template:", error);
    }
  };

  const saveTemplateData = async (templateData) => {
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, templateData);
      } else {
        await createTemplate(templateData);
      }

      setShowCreateModal(false);
      refetchTemplates();
      
      // Reset states
      setShowDefaultConfirmModal(false);
      setExistingDefaultTemplate(null);
      setPendingTemplateData(null);
    } catch (error) {
      console.error("Error saving template:", error);
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

  const handleDeleteTemplate = async (template) => {
    if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
      try {
        await deleteTemplate(template.id);
        refetchTemplates();
      } catch (error) {
        console.error("Error deleting template:", error);
      }
    }
  };

  const handleDuplicateTemplate = (template) => {
    setEditingTemplate(null);
    setTemplateForm({
      name: `${template.name} (Copy)`,
      subject: template.subject,
      content: template.content,
      type: template.type,
      description: template.description || "",
      category: template.category || "",
      tags: template.tags || [],
      isDefault: false,
      isActive: true,
    });
    setShowCreateModal(true);
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    if (confirm(`Delete ${selectedTemplates.length} selected templates?`)) {
      try {
        await Promise.all(selectedTemplates.map(id => deleteTemplate(id)));
        setSelectedTemplates([]);
        refetchTemplates();
      } catch (error) {
        console.error("Error in bulk delete:", error);
      }
    }
  };

  const handleBulkActivate = async () => {
    try {
      await Promise.all(selectedTemplates.map(id => {
        const template = emailTemplates.find(t => t.id === id);
        return updateTemplate(id, { ...template, isActive: true });
      }));
      setSelectedTemplates([]);
      refetchTemplates();
    } catch (error) {
      console.error("Error in bulk activate:", error);
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      await Promise.all(selectedTemplates.map(id => {
        const template = emailTemplates.find(t => t.id === id);
        return updateTemplate(id, { ...template, isActive: false });
      }));
      setSelectedTemplates([]);
      refetchTemplates();
    } catch (error) {
      console.error("Error in bulk deactivate:", error);
    }
  };

  // Preview handler
  const handlePreviewTemplate = (template) => {
    setPreviewTemplate(template);
    setShowPreviewModal(true);
  };

  // Tab configuration
  const tabs = [
    {
      id: "templates",
      label: "Templates",
      icon: FileText,
      count: emailTemplates.length,
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      count: null,
    },
    {
      id: "categories",
      label: "Categories",
      icon: Tag,
      count: templateCategories.length,
    },
  ];

  if (templatesLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
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
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold admin-text flex items-center space-x-3">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Settings className="h-8 w-8 text-blue-600" />
            </motion.div>
            <span>Template Management</span>
          </h1>
          <p className="admin-text-light mt-2">
            Create, manage, and analyze email templates with enterprise features
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/applications-manager/communication")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("secondary")}`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Communication</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateTemplate}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("primary")}`}
          >
            <Plus className="h-4 w-4" />
            <span>Create Template</span>
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
            label: "Total Templates",
            value: templateAnalytics.totalTemplates,
            icon: FileText,
            color: "blue",
            change: "+12%",
          },
          {
            label: "Active Templates",
            value: templateAnalytics.activeTemplates,
            icon: CheckCircle,
            color: "green",
            change: "+8%",
          },
          {
            label: "Default Templates",
            value: templateAnalytics.defaultTemplates,
            icon: Star,
            color: "yellow",
            change: "0%",
          },
          {
            label: "Categories",
            value: templateCategories.length,
            icon: Tag,
            color: "purple",
            change: "+2",
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className={`admin-card p-6 rounded-lg shadow ${getStatCardClasses(index).border}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold admin-text">{stat.value}</div>
                <div className="text-sm admin-text-light font-medium">{stat.label}</div>
                <div className="text-xs text-green-600 font-medium mt-1">
                  {stat.change} from last month
                </div>
              </div>
              <div className={`p-3 rounded-lg ${getStatCardClasses(index).bg}`}>
                <stat.icon className={`h-6 w-6 ${getStatCardClasses(index).icon}`} />
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
                    {tab.count !== null && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isActive ? "bg-white bg-opacity-90 text-gray-800" : "bg-gray-100 text-gray-600"
                      }`}>
                        {tab.count}
                      </span>
                    )}
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
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === "templates" && (
                <div className="space-y-6">
                  {/* Search and Filters */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search templates..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-3">
                      {/* Bulk Actions */}
                      {selectedTemplates.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">
                            {selectedTemplates.length} selected
                          </span>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={handleBulkActivate}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Activate Selected"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={handleBulkDeactivate}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Deactivate Selected"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                            <button
                              onClick={handleBulkDelete}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Selected"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* View Mode Toggle */}
                      <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => setViewMode("grid")}
                          className={`p-2 rounded transition-colors ${
                            viewMode === "grid" ? "bg-white shadow" : ""
                          }`}
                        >
                          <Grid className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setViewMode("list")}
                          className={`p-2 rounded transition-colors ${
                            viewMode === "list" ? "bg-white shadow" : ""
                          }`}
                        >
                          <List className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Filters */}
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                          showFilters ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <Filter className="h-4 w-4" />
                        <span>Filters</span>
                      </button>

                      {/* Sort */}
                      <select
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => {
                          const [field, order] = e.target.value.split("-");
                          setSortBy(field);
                          setSortOrder(order);
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="name-asc">Name A-Z</option>
                        <option value="name-desc">Name Z-A</option>
                        <option value="created-desc">Newest First</option>
                        <option value="created-asc">Oldest First</option>
                        <option value="updated-desc">Recently Updated</option>
                        <option value="usage-desc">Most Used</option>
                      </select>
                    </div>
                  </div>

                  {/* Filters Panel */}
                  <AnimatePresence>
                    {showFilters && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border border-gray-200 rounded-lg p-4 space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Category
                            </label>
                            <select
                              value={selectedCategory}
                              onChange={(e) => setSelectedCategory(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="all">All Categories</option>
                              {templateCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Type
                            </label>
                            <select
                              value={selectedType}
                              onChange={(e) => setSelectedType(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="all">All Types</option>
                              {templateTypes.map(type => (
                                <option key={type} value={type}>
                                  {type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Status
                            </label>
                            <select
                              value={selectedStatus}
                              onChange={(e) => setSelectedStatus(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="all">All Status</option>
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                              <option value="default">Default</option>
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Select All Checkbox */}
                  {filteredTemplates.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedTemplates.length === filteredTemplates.length}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">
                        Select All ({filteredTemplates.length})
                      </span>
                    </div>
                  )}

                  {/* Templates Display */}
                  {filteredTemplates.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No templates found
                      </h3>
                      <p className="text-gray-500 mb-4">
                        {searchTerm ? "Try adjusting your search terms" : "Get started by creating your first template"}
                      </p>
                      <button
                        onClick={handleCreateTemplate}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors mx-auto ${getButtonClasses("primary")}`}
                      >
                        <Plus className="h-4 w-4" />
                        <span>Create Template</span>
                      </button>
                    </div>
                  ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredTemplates.map((template, index) => {
                        const category = templateCategories.find(cat => cat.id === template.category);
                        const isSelected = selectedTemplates.includes(template.id);

                        return (
                          <motion.div
                            key={template.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.02, y: -2 }}
                            className={`border rounded-lg p-6 transition-all relative ${
                              isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
                            }`}
                          >
                            {/* Selection Checkbox */}
                            <div className="absolute top-4 left-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleTemplateSelect(template.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </div>

                            {/* Status Badges */}
                            <div className="absolute top-4 right-4 flex items-center space-x-2">
                              {template.isDefault && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                                  Default
                                </span>
                              )}
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                template.isActive 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                {template.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>

                            {/* Template Content */}
                            <div className="mt-8">
                              {/* Category Icon using actual category field */}
                              {(() => {
                                const templateCategory = templateCategories.find(cat => cat.id === template.category);
                                
                                if (templateCategory) {
                                  return (
                                    <div className="inline-flex p-2 rounded-lg mb-4 bg-blue-100">
                                      <templateCategory.icon className="h-5 w-5 text-blue-600" />
                                    </div>
                                  );
                                }
                                return null;
                              })()}

                              {/* Template Info */}
                              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                                {template.name}
                              </h3>
                              <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                                {template.subject}
                              </p>
                              {template.description && (
                                <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                                  {template.description}
                                </p>
                              )}

                              {/* Meta Info */}
                              <div className="text-xs text-gray-500 space-y-1">
                                <div className="flex items-center space-x-2">
                                  <Clock className="h-3 w-3" />
                                  <span>Updated {new Date(template.updatedAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Activity className="h-3 w-3" />
                                  <span>Used {template.usageCount || 0} times</span>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handlePreviewTemplate(template)}
                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="Preview"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEditTemplate(template)}
                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDuplicateTemplate(template)}
                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="Duplicate"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleDeleteTemplate(template)}
                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    /* List View */
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <input
                                type="checkbox"
                                checked={selectedTemplates.length === filteredTemplates.length && filteredTemplates.length > 0}
                                onChange={handleSelectAll}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Template
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Category
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Updated
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredTemplates.map((template, index) => {
                            const isSelected = selectedTemplates.includes(template.id);
                            
                            // Get category from actual category field
                            const templateCategory = templateCategories.find(cat => cat.id === template.category);

                            return (
                              <motion.tr
                                key={template.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.02 }}
                                className={`hover:bg-gray-50 ${isSelected ? "bg-blue-50" : ""}`}
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleTemplateSelect(template.id)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                                      <span>{template.name}</span>
                                      {template.isDefault && (
                                        <Star className="h-4 w-4 text-yellow-500" />
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500 truncate max-w-xs">
                                      {template.subject}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {templateCategory && (
                                    <div className="flex items-center space-x-2">
                                      <templateCategory.icon className="h-4 w-4 text-blue-600" />
                                      <span className="text-sm text-gray-900">{templateCategory.label}</span>
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">
                                    {template.type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    template.isActive 
                                      ? "bg-green-100 text-green-800" 
                                      : "bg-gray-100 text-gray-600"
                                  }`}>
                                    {template.isActive ? "Active" : "Inactive"}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(template.updatedAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => handlePreviewTemplate(template)}
                                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                      title="Preview"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleEditTemplate(template)}
                                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                      title="Edit"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDuplicateTemplate(template)}
                                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                      title="Duplicate"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTemplate(template)}
                                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "analytics" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Usage Trends</h3>
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="h-64 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                          <p>Analytics chart would go here</p>
                          <p className="text-sm">Integration with charting library needed</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Used</h3>
                      <div className="space-y-3">
                        {templateAnalytics.mostUsed.map((template, index) => (
                          <div key={template.id} className="flex items-center space-x-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                              index === 0 ? "bg-yellow-100 text-yellow-800" :
                              index === 1 ? "bg-gray-100 text-gray-600" :
                              "bg-orange-100 text-orange-600"
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {template.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {template.usageCount || 0} uses
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Templates by Category</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {templateAnalytics.categoryBreakdown.map((category) => (
                        <motion.div 
                          key={category.id} 
                          className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer"
                          onClick={() => {
                            setActiveTab("templates");
                            setSelectedCategory(category.id);
                          }}
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="p-2 rounded-lg bg-blue-100">
                            <category.icon className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{category.label}</p>
                            <p className="text-sm text-gray-500">{category.count} templates</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "categories" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templateCategories.map((category) => {
                      // Use actual category field to count templates
                      const categoryTemplates = emailTemplates.filter(t => t.category === category.id);
                      
                      return (
                        <motion.div
                          key={category.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ scale: 1.02 }}
                          className="bg-white border border-gray-200 rounded-lg p-6"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-lg bg-blue-100">
                              <category.icon className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-gray-900">{categoryTemplates.length}</div>
                              <div className="text-sm text-gray-500">templates</div>
                            </div>
                          </div>
                          
                          <h3 className="font-semibold text-gray-900 mb-2">{category.label}</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Templates for {category.label.toLowerCase()} communications
                          </p>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">
                              {categoryTemplates.filter(t => t.isActive).length} active
                            </span>
                            <button 
                              onClick={() => {
                                setActiveTab("templates");
                                setSelectedCategory(category.id);
                              }}
                              className="text-blue-600 hover:text-blue-700 transition-colors"
                            >
                              View all →
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Template Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingTemplate ? "Edit Template" : "Create New Template"}
                </h2>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Application Received"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type *
                    </label>
                    <select
                      value={templateForm.type}
                      onChange={(e) => setTemplateForm({...templateForm, type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select type...</option>
                      {templateTypes.map(type => (
                        <option key={type} value={type}>
                          {type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={templateForm.category}
                      onChange={(e) => setTemplateForm({...templateForm, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select category...</option>
                      {templateCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isDefault"
                        checked={templateForm.isDefault}
                        onChange={(e) => setTemplateForm({...templateForm, isDefault: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
                        Set as default
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={templateForm.isActive}
                        onChange={(e) => setTemplateForm({...templateForm, isActive: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                        Active
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Subject *
                  </label>
                  <input
                    type="text"
                    value={templateForm.subject}
                    onChange={(e) => setTemplateForm({...templateForm, subject: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Thank you for your application to {{jobTitle}}"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description of when to use this template"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Content *
                  </label>
                  <textarea
                    value={templateForm.content}
                    onChange={(e) => setTemplateForm({...templateForm, content: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={12}
                    placeholder={`Dear {{candidateName}},

Thank you for your interest in the {{jobTitle}} position at {{companyName}}.

We have received your application and our team will review it carefully. You can expect to hear back from us within {{reviewTimeframe}}.

Best regards,
{{senderName}}
{{companyName}} Recruitment Team`}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Available variables: candidateName, jobTitle, companyName, department, senderName, reviewTimeframe
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log('🔘 Save button clicked!');
                    handleSaveTemplate();
                  }}
                  disabled={!templateForm.name || !templateForm.subject || !templateForm.content || !templateForm.type}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    templateForm.name && templateForm.subject && templateForm.content && templateForm.type
                      ? getButtonClasses("primary")
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {editingTemplate ? "Update Template" : "Create Template"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && previewTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Template Preview</h2>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Template Name</h3>
                    <p className="text-gray-900">{previewTemplate.name}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Subject</h3>
                    <p className="text-gray-900">{previewTemplate.subject}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Content</h3>
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <pre className="whitespace-pre-wrap font-sans text-gray-900">
                        {previewTemplate.content}
                      </pre>
                    </div>
                  </div>

                  {previewTemplate.description && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Description</h3>
                      <p className="text-gray-600">{previewTemplate.description}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    handleEditTemplate(previewTemplate);
                  }}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("primary")}`}
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit Template</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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