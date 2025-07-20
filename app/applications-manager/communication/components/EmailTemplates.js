"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Edit, Copy, X, Search, Filter } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";

export default function EmailTemplates({
  emailTemplates,
  onTemplateSelect,
  onTemplateEdit,
  onTemplateDelete,
  onCreateTemplate,
}) {
  const { getButtonClasses } = useThemeClasses();

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Get unique categories and types from templates
  const categories = useMemo(() => {
    const cats = [...new Set(emailTemplates?.map(t => t.category).filter(Boolean))];
    return cats.sort();
  }, [emailTemplates]);

  const types = useMemo(() => {
    const typeList = [...new Set(emailTemplates?.map(t => t.type).filter(Boolean))];
    return typeList.sort();
  }, [emailTemplates]);

  // Filter templates based on current filters
  const filteredTemplates = useMemo(() => {
    if (!emailTemplates) return [];

    return emailTemplates.filter(template => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          template.name?.toLowerCase().includes(searchLower) ||
          template.subject?.toLowerCase().includes(searchLower) ||
          template.description?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategory !== "all" && template.category !== selectedCategory) {
        return false;
      }

      // Type filter
      if (selectedType !== "all" && template.type !== selectedType) {
        return false;
      }

      // Active only filter
      if (showActiveOnly && !template.isActive) {
        return false;
      }

      return true;
    });
  }, [emailTemplates, searchTerm, selectedCategory, selectedType, showActiveOnly]);

  const formatTypeLabel = (type) => {
    return type?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "";
  };

  const formatCategoryLabel = (category) => {
    return category?.charAt(0).toUpperCase() + category?.slice(1) || "";
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Email Templates</h3>
          <p className="text-sm text-gray-500 mt-1">
            {filteredTemplates.length} of {emailTemplates?.length || 0} templates
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCreateTemplate}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${getButtonClasses("primary")}`}
        >
          <Plus className="h-4 w-4" />
          <span>Create Template</span>
        </motion.button>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
          <Filter className="h-4 w-4" />
          <span>Filter Templates</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {formatCategoryLabel(category)}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            {types.map(type => (
              <option key={type} value={type}>
                {formatTypeLabel(type)}
              </option>
            ))}
          </select>

          {/* Active Only Toggle */}
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Active only</span>
          </label>
        </div>

        {/* Clear Filters Button */}
        {(searchTerm || selectedCategory !== "all" || selectedType !== "all" || showActiveOnly) && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("all");
                setSelectedType("all");
                setShowActiveOnly(false);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {emailTemplates && emailTemplates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">No email templates found</p>
          <p className="text-gray-400 text-sm">Create your first template to get started</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">No templates match your filters</p>
          <p className="text-gray-400 text-sm">Try adjusting your search criteria or clear the filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
          <motion.div
            key={template.id}
            whileHover={{ scale: 1.02, y: -2 }}
            className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{template.name}</h4>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                    {formatCategoryLabel(template.category)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTypeLabel(template.type)}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {template.isDefault && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                    Default
                  </span>
                )}
                {!template.isActive && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                    Inactive
                  </span>
                )}
                <button
                  onClick={() => onTemplateEdit(template)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Edit template"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onTemplateDelete(template)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="Delete template"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Subject:</p>
              <p className="text-sm text-gray-600 truncate">{template.subject}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Preview:</p>
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
                  onClick={() => onTemplateSelect(template)}
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
      )}
    </div>
  );
}