"use client";

import { useState } from "react";
import AdminUserStep from "./AdminUserStep";
import SMTPConfigStep from "./SMTPConfigStep";
import CompanySettingsStep from "./CompanySettingsStep";
import CompletionStep from "./CompletionStep";

const STEPS = [
  { id: "admin", title: "Admin Account", component: AdminUserStep },
  { id: "smtp", title: "Email Settings", component: SMTPConfigStep },
  { id: "company", title: "Company Details", component: CompanySettingsStep },
  { id: "complete", title: "Complete", component: CompletionStep },
];

export default function SetupWizard({ token }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [setupData, setSetupData] = useState({
    admin: {},
    smtp: {},
    company: {},
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStepComplete = (stepData) => {
    const stepId = STEPS[currentStep].id;
    setSetupData(prev => ({
      ...prev,
      [stepId]: stepData
    }));

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const CurrentStepComponent = STEPS[currentStep].component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Application Setup
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Configure your application for first-time use
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <nav aria-label="Progress">
              <ol className="flex items-center">
                {STEPS.map((step, index) => (
                  <li key={step.id} className={`relative ${index !== STEPS.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                    <div className="flex items-center">
                      <div
                        className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                          index < currentStep
                            ? 'bg-blue-600'
                            : index === currentStep
                            ? 'border-2 border-blue-600 bg-white'
                            : 'border-2 border-gray-300 bg-white'
                        }`}
                      >
                        {index < currentStep ? (
                          <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <span
                            className={`text-sm font-medium ${
                              index === currentStep ? 'text-blue-600' : 'text-gray-500'
                            }`}
                          >
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <span
                        className={`ml-4 text-sm font-medium ${
                          index <= currentStep ? 'text-gray-900' : 'text-gray-500'
                        }`}
                      >
                        {step.title}
                      </span>
                    </div>
                    {index !== STEPS.length - 1 && (
                      <div
                        className={`absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 ${
                          index < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                        } hidden sm:block`}
                      />
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CurrentStepComponent
          token={token}
          setupData={setupData}
          onComplete={handleStepComplete}
          onBack={handleBack}
          canGoBack={currentStep > 0}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
        />
      </div>
    </div>
  );
}