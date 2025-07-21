"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X, Copy, Check } from "lucide-react";

const AVAILABLE_VARIABLES = [
  // Basic Variables
  { name: "candidateName", description: "Candidate's full name", example: "John Smith", category: "Basic" },
  { name: "jobTitle", description: "Job position title", example: "Senior Software Engineer", category: "Basic" },
  { name: "companyName", description: "Company name", example: "Your Company", category: "Basic" },
  { name: "department", description: "Department name", example: "Engineering", category: "Basic" },
  { name: "senderName", description: "Hiring manager's name", example: "Hiring Manager", category: "Basic" },
  { name: "recipientEmail", description: "Candidate's email address", example: "candidate@email.com", category: "Basic" },
  
  // Application-related Variables
  { name: "reviewTimeframe", description: "Expected review timeframe", example: "1-2 weeks", category: "Application" },
  { name: "timeframe", description: "General timeframe", example: "1-2 weeks", category: "Application" },
  { name: "currentStage", description: "Current application stage", example: "review phase", category: "Application" },
  { name: "expectedDate", description: "Expected completion date", example: "12/31/2024", category: "Application" },
  { name: "nextSteps", description: "Next steps in process", example: "Initial review by hiring team", category: "Application" },
  { name: "timeline", description: "Complete timeline", example: "Application review: 3-5 business days", category: "Application" },
  
  // Interview-related Variables
  { name: "interviewDate", description: "Interview date", example: "TBD", category: "Interview" },
  { name: "interviewTime", description: "Interview time", example: "TBD", category: "Interview" },
  { name: "duration", description: "Interview duration", example: "45-60 minutes", category: "Interview" },
  { name: "interviewFormat", description: "Interview format", example: "Video call via Zoom", category: "Interview" },
  { name: "interviewLocation", description: "Interview location", example: "Virtual", category: "Interview" },
  { name: "interviewDetails", description: "Interview details", example: "Technical discussion and cultural fit assessment", category: "Interview" },
  { name: "interviewExpectations", description: "Interview expectations", example: "Brief introduction and background discussion", category: "Interview" },
  { name: "originalDate", description: "Original scheduled date", example: "TBD", category: "Interview" },
  { name: "originalTime", description: "Original scheduled time", example: "TBD", category: "Interview" },
  { name: "option1", description: "Interview option 1", example: "Option 1: TBD", category: "Interview" },
  { name: "option2", description: "Interview option 2", example: "Option 2: TBD", category: "Interview" },
  { name: "option3", description: "Interview option 3", example: "Option 3: TBD", category: "Interview" },
  
  // Onboarding Variables
  { name: "startDate", description: "Job start date", example: "TBD", category: "Onboarding" },
  { name: "officeAddress", description: "Office address", example: "123 Business St, City, State 12345", category: "Onboarding" },
  { name: "startTime", description: "Start time", example: "9:00 AM", category: "Onboarding" },
  { name: "supervisor", description: "Supervisor name", example: "Team Lead", category: "Onboarding" },
  { name: "supervisorEmail", description: "Supervisor email", example: "supervisor@company.com", category: "Onboarding" },
  { name: "parkingInfo", description: "Parking information", example: "Visitor parking available in front lot", category: "Onboarding" },
  { name: "missingDocuments", description: "Missing documents list", example: "ID verification, Tax forms", category: "Onboarding" },
  { name: "hrEmail", description: "HR email address", example: "hr@company.com", category: "Onboarding" },
  { name: "portalLink", description: "Onboarding portal link", example: "https://portal.company.com/onboarding", category: "Onboarding" },
  
  // Offer-related Variables
  { name: "salary", description: "Salary information", example: "Competitive salary based on experience", category: "Offer" },
  { name: "benefits", description: "Benefits package", example: "Health insurance, 401k, paid time off", category: "Offer" },
  
  // General Variables
  { name: "deadline", description: "Response deadline", example: "One week from today", category: "General" },
  { name: "retentionPeriod", description: "Data retention period", example: "6 months", category: "General" },
  { name: "requestedInfo", description: "Additional info requested", example: "Portfolio links, references", category: "General" },
  { name: "referenceName", description: "Reference contact name", example: "Reference", category: "General" },
  { name: "phoneNumber", description: "Contact phone number", example: "(555) 123-4567", category: "General" },
  { name: "email", description: "Contact email", example: "hiring@company.com", category: "General" },
];

export default function VariablesHelper({ trigger = "help" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedVariable, setCopiedVariable] = useState(null);

  const copyVariable = async (variableName) => {
    try {
      await navigator.clipboard.writeText(`{{${variableName}}}`);
      setCopiedVariable(variableName);
      setTimeout(() => setCopiedVariable(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Group variables by category
  const groupedVariables = AVAILABLE_VARIABLES.reduce((acc, variable) => {
    if (!acc[variable.category]) {
      acc[variable.category] = [];
    }
    acc[variable.category].push(variable);
    return acc;
  }, {});

  const TriggerComponent = trigger === "help" ? (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
    >
      <HelpCircle className="h-4 w-4" />
      <span>View all variables</span>
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className="px-3 py-1 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md transition-colors"
    >
      Variables ({AVAILABLE_VARIABLES.length})
    </button>
  );

  return (
    <>
      {TriggerComponent}
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div>
                  <h3 className="text-xl font-bold">Available Template Variables</h3>
                  <p className="text-blue-100 text-sm">Click any variable to copy it to your clipboard</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">How to use variables:</h4>
                  <p className="text-blue-800 text-sm">
                    Variables are automatically replaced with actual values when emails are sent. 
                    Use the format <code className="bg-blue-100 px-1 rounded">{"{{variableName}}"}</code> in your template content or subject line.
                  </p>
                </div>

                <div className="space-y-6">
                  {Object.entries(groupedVariables).map(([category, variables]) => (
                    <div key={category}>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                        {category} Variables
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {variables.map((variable) => (
                          <motion.div
                            key={variable.name}
                            whileHover={{ scale: 1.02 }}
                            className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
                            onClick={() => copyVariable(variable.name)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-blue-600">
                                    {"{{" + variable.name + "}}"}
                                  </code>
                                  {copiedVariable === variable.name ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Copy className="h-4 w-4 text-gray-400" />
                                  )}
                                </div>
                                <p className="text-sm text-gray-700 mb-1">{variable.description}</p>
                                <p className="text-xs text-gray-500">
                                  <span className="font-medium">Example:</span> {variable.example}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Usage Examples:</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p><strong>Subject:</strong> "Application Update - {"{{jobTitle}}"} Position"</p>
                    <p><strong>Content:</strong> "Dear {"{{candidateName}}"}, thank you for your interest in the {"{{jobTitle}}"} position at {"{{companyName}}"}..."</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}