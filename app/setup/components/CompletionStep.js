"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CompletionStep({ 
  token, 
  setupData, 
  onBack, 
  canGoBack, 
  isSubmitting, 
  setIsSubmitting 
}) {
  const [setupComplete, setSetupComplete] = useState(false);
  const [error, setError] = useState(null);
  const [adminCredentials, setAdminCredentials] = useState(null);
  const router = useRouter();

  useEffect(() => {
    completeSetup();
  }, []);

  const completeSetup = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/setup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          setupData
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSetupComplete(true);
        setAdminCredentials(result.adminCredentials);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Setup failed. Please try again.");
      }
    } catch (error) {
      console.error("Error completing setup:", error);
      setError("Failed to complete setup. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    completeSetup();
  };

  const handleGoToLogin = () => {
    router.push("/auth/signin");
  };

  if (isSubmitting) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              Completing Setup...
            </h2>
            <p className="text-sm text-gray-500">
              Please wait while we configure your application with the provided settings.
            </p>
            
            <div className="mt-6 space-y-2">
              <div className="text-sm text-gray-600">
                <div className="flex justify-between items-center">
                  <span>Creating admin account...</span>
                  <span className="text-blue-600">✓</span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <div className="flex justify-between items-center">
                  <span>Configuring email settings...</span>
                  <span className="text-blue-600">✓</span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <div className="flex justify-between items-center">
                  <span>Setting up company preferences...</span>
                  <span className="animate-pulse text-gray-400">⏳</span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <div className="flex justify-between items-center">
                  <span>Finalizing configuration...</span>
                  <span className="text-gray-400">⏳</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              Setup Failed
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {error}
            </p>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={onBack}
                disabled={!canGoBack}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Go Back
              </button>
              <button
                onClick={handleRetry}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (setupComplete) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              Setup Complete!
            </h2>
            <p className="text-sm text-gray-500 mb-8">
              Your application has been successfully configured and is ready to use.
            </p>

            {/* Setup Summary */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Setup Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Admin Account:</span>
                  <span className="text-gray-900">{setupData.admin?.email}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Email Notifications:</span>
                  <span className="text-gray-900">
                    {setupData.smtp?.enabled ? '✓ Enabled' : '✗ Disabled'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Company Name:</span>
                  <span className="text-gray-900">
                    {setupData.company?.companyName || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Timezone:</span>
                  <span className="text-gray-900">
                    {setupData.company?.timezone || 'America/Toronto'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Public Registration:</span>
                  <span className="text-gray-900">
                    {setupData.company?.allowPublicRegistration ? '✓ Enabled' : '✗ Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Login Info */}
            {adminCredentials && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                <h3 className="text-sm font-medium text-blue-900 mb-3">
                  🔑 Admin Login Credentials
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">Email:</span>
                    <span className="text-blue-900 font-mono">{adminCredentials.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">Role:</span>
                    <span className="text-blue-900">Administrator</span>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-3">
                  Use these credentials to log in and manage your application.
                </p>
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8 text-left">
              <h3 className="text-sm font-medium text-yellow-900 mb-3">
                📋 Next Steps
              </h3>
              <ul className="text-sm text-yellow-800 space-y-2">
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2">1.</span>
                  <span>Log in using your admin credentials</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2">2.</span>
                  <span>Review and adjust settings in the admin panel</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2">3.</span>
                  <span>Create additional user accounts if needed</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2">4.</span>
                  <span>Configure any additional integrations</span>
                </li>
                {!setupData.smtp?.enabled && (
                  <li className="flex items-start">
                    <span className="text-yellow-600 mr-2">5.</span>
                    <span>Set up email notifications in the admin settings</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Login Button */}
            <button
              onClick={handleGoToLogin}
              className="w-full px-6 py-3 text-base font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Login Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}