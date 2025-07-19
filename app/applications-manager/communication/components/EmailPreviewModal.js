"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Send } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";

export default function EmailPreviewModal({
  showPreview,
  previewRecipient,
  subject,
  emailContent,
  replaceVariables,
  onClose,
  onSendEmail,
}) {
  const { getButtonClasses } = useThemeClasses();

  return (
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
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="text-sm text-gray-600 mb-4">
                  <strong>To:</strong> {previewRecipient.name} &lt;{previewRecipient.email}&gt;
                  <br />
                  <strong>Subject:</strong> {replaceVariables(subject, previewRecipient)}
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
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onClose();
                    onSendEmail();
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
  );
}