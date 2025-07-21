"use client";

import { motion } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import VariablesHelper from "./VariablesHelper";

export default function EmailComposer({
  emailTemplates,
  selectedTemplate,
  setSelectedTemplate,
  subject,
  setSubject,
  emailContent,
  setEmailContent,
  recipients,
  sendingEmail,
  onTemplateSelect,
  onPreview,
  onSendEmail,
}) {
  const { getButtonClasses } = useThemeClasses();

  return (
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
              const template = emailTemplates.find((t) => t.id === e.target.value);
              if (template) onTemplateSelect(template);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a template or write custom email</option>
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
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              Use variables like {"{candidateName}"}, {"{jobTitle}"}, {"{companyName}"} in your content
            </p>
            <VariablesHelper trigger="button" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {recipients.length} recipient{recipients.length !== 1 ? "s" : ""} selected
          </div>
          <div className="flex items-center space-x-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => recipients.length > 0 && onPreview(recipients[0])}
              disabled={recipients.length === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Preview
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onSendEmail}
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
  );
}