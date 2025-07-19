"use client";

import { motion } from "framer-motion";
import { Plus, Edit, Copy, X } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";

export default function EmailTemplates({
  emailTemplates,
  onTemplateSelect,
  onTemplateEdit,
  onTemplateDelete,
  onCreateTemplate,
}) {
  const { getButtonClasses } = useThemeClasses();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Email Templates</h3>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {emailTemplates.map((template) => (
          <motion.div
            key={template.id}
            whileHover={{ scale: 1.02, y: -2 }}
            className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-semibold text-gray-900">{template.name}</h4>
                <p className="text-sm text-gray-500 capitalize">
                  {template.type?.replace("_", " ")}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {template.isDefault && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                    Default
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
    </div>
  );
}