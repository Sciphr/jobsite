"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, CheckCircle, XCircle } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";

export default function DefaultTemplateConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  existingTemplate,
  newTemplateName,
  templateType,
}) {
  const { getButtonClasses } = useThemeClasses();

  if (!isOpen || !existingTemplate) return null;

  const formatTemplateType = (type) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6" />
                <div>
                  <h3 className="text-xl font-bold">Default Template Conflict</h3>
                  <p className="text-amber-100 text-sm">
                    Another template is already set as default for this type
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

          {/* Content */}
          <div className="p-6">
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                You're trying to set <strong>"{newTemplateName}"</strong> as the default template for{" "}
                <strong>{formatTemplateType(templateType)}</strong>, but there's already a default template for this category.
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-800 mb-2">Current Default Template:</h4>
                <div className="text-sm text-amber-700">
                  <p><strong>Name:</strong> {existingTemplate.name}</p>
                  <p><strong>Type:</strong> {formatTemplateType(existingTemplate.type)}</p>
                  <p><strong>Created by:</strong> {existingTemplate.createdBy}</p>
                  <p><strong>Created:</strong> {formatDate(existingTemplate.created_at)}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">What would you like to do?</h4>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 border border-green-200 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">Replace the current default</p>
                    <p className="text-sm text-green-700">
                      Make "{newTemplateName}" the new default and remove the default flag from "{existingTemplate.name}"
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 border border-blue-200 bg-blue-50 rounded-lg">
                  <XCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">Keep the current default</p>
                    <p className="text-sm text-blue-700">
                      Save "{newTemplateName}" as a regular template (not default) and keep "{existingTemplate.name}" as the default
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> Only one template per type can be set as default. Default templates are used in the Quick Email feature and are prioritized in template selections.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Keep Current Default
              </button>
              <button
                onClick={onConfirm}
                className={`px-6 py-2 rounded-lg text-white ${getButtonClasses("primary")} hover:bg-orange-600 transition-colors`}
              >
                Replace with New Default
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}