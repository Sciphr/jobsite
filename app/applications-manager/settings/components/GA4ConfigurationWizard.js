"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  CheckCircle,
  AlertCircle,
  Upload,
  Eye,
  EyeOff,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Globe,
  BarChart3,
  Shield,
  Zap
} from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";

export default function GA4ConfigurationWizard({ onClose, onSuccess }) {
  const { getButtonClasses } = useThemeClasses();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    propertyId: "",
    measurementId: "", 
    serviceAccountEmail: "",
    serviceAccountPrivateKey: "",
    showPrivateKey: false
  });
  
  // Validation errors
  const [errors, setErrors] = useState({});

  const steps = [
    {
      id: 1,
      title: "Google Analytics Setup",
      description: "Let's connect your Google Analytics 4 property"
    },
    {
      id: 2, 
      title: "Property Configuration",
      description: "Enter your GA4 property details"
    },
    {
      id: 3,
      title: "Service Account",
      description: "Configure API access credentials"
    },
    {
      id: 4,
      title: "Test Connection",
      description: "Verify your configuration works"
    }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 2:
        if (!formData.propertyId) newErrors.propertyId = "Property ID is required";
        if (!formData.measurementId) newErrors.measurementId = "Measurement ID is required";
        if (formData.measurementId && !formData.measurementId.startsWith('G-')) {
          newErrors.measurementId = "Measurement ID should start with 'G-'";
        }
        break;
      case 3:
        if (!formData.serviceAccountEmail) newErrors.serviceAccountEmail = "Service Account Email is required";
        if (!formData.serviceAccountPrivateKey) newErrors.serviceAccountPrivateKey = "Private Key is required";
        if (formData.serviceAccountEmail && !formData.serviceAccountEmail.includes('@')) {
          newErrors.serviceAccountEmail = "Please enter a valid email address";
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          handleInputChange('serviceAccountEmail', jsonData.client_email || '');
          handleInputChange('serviceAccountPrivateKey', jsonData.private_key || '');
        } catch (error) {
          setErrors({ serviceAccountPrivateKey: "Invalid JSON file" });
        }
      };
      reader.readAsText(file);
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/admin/analytics/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      setTestResult(result);
      
      if (result.success) {
        setTimeout(() => {
          onSuccess?.(formData);
        }, 2000);
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        error: "Failed to connect to server" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfiguration = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/admin/analytics/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        onSuccess?.(formData);
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <BarChart3 className="h-12 w-12 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold admin-text mb-2">Connect Google Analytics 4</h3>
              <p className="admin-text-light">
                Integrate your GA4 property to unlock powerful analytics insights for your job site.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Globe className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-sm font-medium admin-text">Real-time Analytics</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Zap className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium admin-text">Job Performance</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Shield className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <p className="text-sm font-medium admin-text">User Journey</p>
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
              <p className="text-sm admin-text-light">
                <strong>Prerequisites:</strong> You'll need a Google Analytics 4 property and a service account with Viewer permissions.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold admin-text mb-2">GA4 Property Details</h3>
              <p className="admin-text-light">Enter your Google Analytics 4 property information</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium admin-text mb-2">
                  Property ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.propertyId}
                  onChange={(e) => handleInputChange('propertyId', e.target.value)}
                  placeholder="e.g., 123456789"
                  className={`w-full px-4 py-3 rounded-lg border admin-card admin-text ${
                    errors.propertyId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.propertyId && (
                  <p className="text-red-500 text-sm mt-1">{errors.propertyId}</p>
                )}
                <p className="text-xs admin-text-light mt-1">
                  Found in GA4 Admin → Property Settings → Property ID
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium admin-text mb-2">
                  Measurement ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.measurementId}
                  onChange={(e) => handleInputChange('measurementId', e.target.value)}
                  placeholder="e.g., G-XXXXXXXXXX"
                  className={`w-full px-4 py-3 rounded-lg border admin-card admin-text ${
                    errors.measurementId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.measurementId && (
                  <p className="text-red-500 text-sm mt-1">{errors.measurementId}</p>
                )}
                <p className="text-xs admin-text-light mt-1">
                  Found in GA4 Admin → Data Streams → Web → Measurement ID
                </p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <ExternalLink className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Need help finding these IDs?</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Visit your Google Analytics property and follow our{' '}
                    <a href="#" className="underline">setup guide</a> for detailed instructions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold admin-text mb-2">Service Account Configuration</h3>
              <p className="admin-text-light">Set up API access for analytics data retrieval</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium admin-text mb-2">
                  Upload Service Account JSON (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 admin-text-light mx-auto mb-2" />
                  <p className="text-sm admin-text-light mb-2">
                    Upload your service account JSON file to auto-fill credentials
                  </p>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="serviceAccountFile"
                  />
                  <label
                    htmlFor="serviceAccountFile"
                    className={`cursor-pointer inline-flex items-center px-4 py-2 rounded-lg text-sm ${getButtonClasses("secondary")}`}
                  >
                    Choose File
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium admin-text mb-2">
                  Service Account Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.serviceAccountEmail}
                  onChange={(e) => handleInputChange('serviceAccountEmail', e.target.value)}
                  placeholder="e.g., my-service-account@project.iam.gserviceaccount.com"
                  className={`w-full px-4 py-3 rounded-lg border admin-card admin-text ${
                    errors.serviceAccountEmail ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.serviceAccountEmail && (
                  <p className="text-red-500 text-sm mt-1">{errors.serviceAccountEmail}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium admin-text mb-2">
                  Private Key <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <textarea
                    rows={4}
                    value={formData.serviceAccountPrivateKey}
                    onChange={(e) => handleInputChange('serviceAccountPrivateKey', e.target.value)}
                    type={formData.showPrivateKey ? 'text' : 'password'}
                    placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                    className={`w-full px-4 py-3 rounded-lg border admin-card admin-text resize-none font-mono text-xs ${
                      errors.serviceAccountPrivateKey ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formData.showPrivateKey ? '' : 'text-security-disc'
                    }`}
                    style={formData.showPrivateKey ? {} : { WebkitTextSecurity: 'disc' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleInputChange('showPrivateKey', !formData.showPrivateKey)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {formData.showPrivateKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.serviceAccountPrivateKey && (
                  <p className="text-red-500 text-sm mt-1">{errors.serviceAccountPrivateKey}</p>
                )}
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Shield className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Security Note</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Your credentials will be encrypted and stored securely. Make sure the service account has "Viewer" permissions in your GA4 property.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold admin-text mb-2">Test Your Connection</h3>
              <p className="admin-text-light">Let's verify that everything is configured correctly</p>
            </div>

            {!testResult && !isLoading && (
              <div className="text-center">
                <button
                  onClick={testConnection}
                  className={`inline-flex items-center px-6 py-3 rounded-lg ${getButtonClasses("primary")}`}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Test Connection
                </button>
              </div>
            )}

            {isLoading && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin admin-text-light mx-auto mb-4" />
                <p className="admin-text-light">Testing connection to Google Analytics...</p>
              </div>
            )}

            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-lg ${
                  testResult.success
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {testResult.success ? (
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                  )}
                  <div>
                    <h4 className={`font-semibold ${
                      testResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                    }`}>
                      {testResult.success ? 'Connection Successful!' : 'Connection Failed'}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      testResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                    }`}>
                      {testResult.success
                        ? 'Your Google Analytics 4 property is successfully connected and ready to use.'
                        : testResult.error || 'There was an error testing your connection.'}
                    </p>
                    {testResult.success && testResult.data && (
                      <div className="mt-3 space-y-1 text-sm text-green-700 dark:text-green-300">
                        <p>✓ Property ID: {testResult.data.propertyId}</p>
                        <p>✓ Active Users (last 7 days): {testResult.data.activeUsers}</p>
                        <p>✓ API Access: Verified</p>
                      </div>
                    )}
                  </div>
                </div>

                {testResult.success && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={saveConfiguration}
                      disabled={isLoading}
                      className={`inline-flex items-center px-6 py-3 rounded-lg ${getButtonClasses("primary")}`}
                    >
                      {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Complete Setup
                    </button>
                  </div>
                )}

                {!testResult.success && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={testConnection}
                      className={`inline-flex items-center px-4 py-2 rounded-lg ${getButtonClasses("secondary")}`}
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="admin-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-6 border-b admin-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold admin-text">Google Analytics 4 Setup</h2>
              <p className="text-sm admin-text-light mt-1">
                Step {currentStep} of {steps.length}: {steps[currentStep - 1]?.title}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : currentStep === step.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 admin-text-light'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      step.id
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-1 mx-2 ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t admin-border flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`inline-flex items-center px-4 py-2 rounded-lg ${
              currentStep === 1
                ? 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-gray-700 text-gray-400'
                : getButtonClasses("secondary")
            }`}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </button>

          <div className="text-sm admin-text-light">
            {currentStep} of {steps.length}
          </div>

          {currentStep < steps.length && currentStep !== 4 && (
            <button
              onClick={handleNext}
              className={`inline-flex items-center px-4 py-2 rounded-lg ${getButtonClasses("primary")}`}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          )}

          {currentStep === steps.length && !testResult?.success && (
            <div className="w-20" /> // Placeholder for spacing
          )}
        </div>
      </motion.div>
    </div>
  );
}