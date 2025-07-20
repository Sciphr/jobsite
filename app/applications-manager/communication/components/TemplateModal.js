"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";

export default function TemplateModal({
  showModal,
  editingTemplate,
  templateForm,
  setTemplateForm,
  onSubmit,
  onClose,
}) {
  const { getButtonClasses } = useThemeClasses();

  return (
    <AnimatePresence>
      {showModal && (
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
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            <form onSubmit={onSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) =>
                        setTemplateForm((prev) => ({ ...prev, name: e.target.value }))
                      }
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
                      onChange={(e) =>
                        setTemplateForm((prev) => ({ ...prev, type: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select type...</option>
                      <option value="application_received">Application Received</option>
                      <option value="application_under_review">Application Under Review</option>
                      <option value="interview_invitation">Interview Invitation</option>
                      <option value="interview_reminder">Interview Reminder</option>
                      <option value="interview_feedback">Interview Feedback</option>
                      <option value="offer_extended">Offer Extended</option>
                      <option value="offer_accepted">Offer Accepted</option>
                      <option value="offer_declined">Offer Declined</option>
                      <option value="rejection_general">Rejection - General</option>
                      <option value="rejection_interview">Rejection - Post Interview</option>
                      <option value="onboarding_welcome">Onboarding Welcome</option>
                      <option value="document_request">Document Request</option>
                      <option value="follow_up">Follow Up</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject Line *
                    </label>
                    <input
                      type="text"
                      value={templateForm.subject}
                      onChange={(e) =>
                        setTemplateForm((prev) => ({ ...prev, subject: e.target.value }))
                      }
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
                      onChange={(e) =>
                        setTemplateForm((prev) => ({ ...prev, description: e.target.value }))
                      }
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
                        onChange={(e) =>
                          setTemplateForm((prev) => ({ ...prev, isDefault: e.target.checked }))
                        }
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
                        onChange={(e) =>
                          setTemplateForm((prev) => ({ ...prev, isActive: e.target.checked }))
                        }
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
                    onChange={(e) =>
                      setTemplateForm((prev) => ({ ...prev, content: e.target.value }))
                    }
                    placeholder="Enter email content..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={16}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Use variables like {"{candidateName}"}, {"{jobTitle}"}, {"{companyName}"}, {"{department}"}, {"{senderName}"}, {"{reviewTimeframe}"} in your content
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
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
  );
}