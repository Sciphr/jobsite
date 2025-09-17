// app/auth/signin/page.js
"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, LogIn } from "lucide-react";
import { ThemedButton } from "../../components/ThemedButton";

export default function SignIn() {
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authMethod, setAuthMethod] = useState("credentials"); // 'credentials', 'ldap', or 'saml'
  const [isLDAPEnabled, setIsLDAPEnabled] = useState(false);
  const [isSAMLEnabled, setIsSAMLEnabled] = useState(false);
  const [isLocalAuthEnabled, setIsLocalAuthEnabled] = useState(true);
  const [isLoadingAuthStatus, setIsLoadingAuthStatus] = useState(true);
  const [authLabels, setAuthLabels] = useState({
    local_auth_label: 'Local Login',
    local_auth_description: 'For external candidates and contractors',
    ldap_auth_label: 'Employee Login',
    ldap_auth_description: 'Use your company credentials',
    saml_auth_label: 'Company Login',
    saml_auth_description: 'Use your single sign-on account',
    auth_show_descriptions: true,
    auth_default_method: 'local'
  });
  const router = useRouter();
  const [callbackUrl, setCallbackUrl] = useState("/profile");
  const [isProcessingSAML, setIsProcessingSAML] = useState(false);

  // Add this useEffect to get the callback URL and handle SAML response
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callback = params.get("callbackUrl") || "/profile";
    const samlResponse = params.get("saml_response");
    const provider = params.get("provider");
    
    setCallbackUrl(callback);
    
    // Handle SAML response if present - hide the UI during processing
    if (samlResponse && provider === "saml") {
      setIsProcessingSAML(true);
      handleSAMLResponse(samlResponse);
    }
  }, []);

  // Handle SAML response
  const handleSAMLResponse = async (samlResponse) => {
    try {
      setIsLoading(true);
      
      const result = await signIn("saml", {
        samlResponse: samlResponse,
        callbackUrl: callbackUrl,
      });

      // NextAuth will handle the redirect automatically
    } catch (error) {
      console.error("SAML authentication error:", error);
      setError("SAML authentication failed. Please try again.");
      setIsLoading(false);
    }
  };

  // Check if LDAP, SAML, and local auth are enabled and fetch custom labels
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const [ldapResponse, samlResponse, localAuthResponse, authLabelsResponse] = await Promise.all([
          fetch('/api/auth/ldap-status'),
          fetch('/api/auth/saml-status'),
          fetch('/api/auth/local-status'),
          fetch('/api/auth/labels')
        ]);

        const ldapData = await ldapResponse.json();
        const samlData = await samlResponse.json();
        const localAuthData = await localAuthResponse.json();
        const authLabelsData = await authLabelsResponse.json();

        setIsLDAPEnabled(ldapData.ldap_enabled);
        setIsSAMLEnabled(samlData.saml_enabled);
        setIsLocalAuthEnabled(localAuthData.local_auth_enabled);

        // Set custom labels if API call was successful
        if (authLabelsResponse.ok) {
          setAuthLabels(authLabelsData);
        }

        // Auto-select method based on default setting or availability
        const defaultMethod = authLabelsData.auth_default_method || 'local';
        if (defaultMethod === 'local' && localAuthData.local_auth_enabled) {
          setAuthMethod('credentials');
        } else if (defaultMethod === 'ldap' && ldapData.ldap_enabled) {
          setAuthMethod('ldap');
        } else if (defaultMethod === 'saml' && samlData.saml_enabled) {
          setAuthMethod('saml');
        } else {
          // Fallback to first available method
          if (localAuthData.local_auth_enabled) {
            setAuthMethod('credentials');
          } else if (ldapData.ldap_enabled) {
            setAuthMethod('ldap');
          } else if (samlData.saml_enabled) {
            setAuthMethod('saml');
          }
        }
      } catch (error) {
        console.error('Failed to check auth status:', error);
        setIsLDAPEnabled(false);
        setIsSAMLEnabled(false);
        setIsLocalAuthEnabled(true);
        // Keep default auth labels on error
      } finally {
        setIsLoadingAuthStatus(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (status === "authenticated") {
      router.push(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  // Show loading while checking session
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 text-lg transition-colors duration-200">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Don't render form if user is authenticated
  if (status === "authenticated") {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      let result;
      
      if (authMethod === "saml" && isSAMLEnabled) {
        // Redirect to SAML login URL
        window.location.href = "/api/auth/saml/login";
        return;
      } else if (authMethod === "ldap" && isLDAPEnabled) {
        result = await signIn("ldap", {
          username: formData.username,
          password: formData.password,
          redirect: false,
        });
      } else {
        result = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });
      }

      if (result?.error) {
        const errorMessage =
          authMethod === "ldap" && isLDAPEnabled ? `Invalid ${authLabels.ldap_auth_label.toLowerCase()} credentials` :
          "Invalid email or password";
        setError(errorMessage);
      } else {
        // Redirect to callback URL or profile
        router.push(callbackUrl);
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Show loading screen when processing SAML
  if (isProcessingSAML) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-6" style={{backgroundColor: 'var(--site-primary)'}}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Signing you in...
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Processing your SSO authentication
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-6 transition-colors duration-200" style={{backgroundColor: 'var(--site-primary)'}}>
            <LogIn className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-200">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 transition-colors duration-200">
            {callbackUrl !== "/profile"
              ? "Please sign in to continue"
              : "Sign in to your account to get started"}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-8 transition-colors duration-200 min-h-[600px] flex flex-col">
          {/* Authentication Method Selector - Always reserve space */}
          <div className="mb-6">
            {!isLoadingAuthStatus && (isLDAPEnabled || isSAMLEnabled || !isLocalAuthEnabled) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {isLocalAuthEnabled && (
                  <button
                    type="button"
                    onClick={() => setAuthMethod("credentials")}
                    className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200 ${
                      authMethod === "credentials"
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                        : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                      authMethod === "credentials"
                        ? "bg-indigo-100 dark:bg-indigo-800"
                        : "bg-gray-100 dark:bg-gray-600"
                    }`}>
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{authLabels.local_auth_label}</div>
                      {authLabels.auth_show_descriptions && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {authLabels.local_auth_description}
                        </div>
                      )}
                    </div>
                  </button>
                )}
                {isLDAPEnabled && (
                  <button
                    type="button"
                    onClick={() => setAuthMethod("ldap")}
                    className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200 ${
                      authMethod === "ldap"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                      authMethod === "ldap"
                        ? "bg-blue-100 dark:bg-blue-800"
                        : "bg-gray-100 dark:bg-gray-600"
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.47a3.176 3.176 0 013.176-3.176h.344a3.176 3.176 0 013.176 3.176v.47M9.75 8.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{authLabels.ldap_auth_label}</div>
                      {authLabels.auth_show_descriptions && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {authLabels.ldap_auth_description}
                        </div>
                      )}
                    </div>
                  </button>
                )}
                {isSAMLEnabled && (
                  <button
                    type="button"
                    onClick={() => setAuthMethod("saml")}
                    className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200 ${
                      authMethod === "saml"
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                        : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                      authMethod === "saml"
                        ? "bg-green-100 dark:bg-green-800"
                        : "bg-gray-100 dark:bg-gray-600"
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{authLabels.saml_auth_label}</div>
                      {authLabels.auth_show_descriptions && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {authLabels.saml_auth_description}
                        </div>
                      )}
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Main Content Area - Flex grow to maintain consistent height */}
          <div className="flex-1 flex flex-col justify-center">
            {/* No Auth Methods Available Warning */}
            {!isLoadingAuthStatus && !isLocalAuthEnabled && !isLDAPEnabled && !isSAMLEnabled && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
              <div className="mx-auto h-12 w-12 text-red-400 mb-4">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
                No Authentication Methods Available
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400">
                All authentication methods have been disabled. Please contact your administrator.
              </p>
            </div>
          )}

          {/* SAML SSO Button - Show when SAML is selected */}
          {authMethod === "saml" && isSAMLEnabled ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mb-4">
                  <div className="h-16 w-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{authLabels.saml_auth_label}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {authLabels.saml_auth_description}
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Redirecting to SSO...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Continue with {authLabels.saml_auth_label}
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Only show form if local auth is enabled or LDAP is available */
            (isLocalAuthEnabled || isLDAPEnabled) ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email/Username Field */}
              <div>
              <label
                htmlFor={authMethod === "ldap" && isLDAPEnabled ? "username" : "email"}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200"
              >
                {authMethod === "ldap" && isLDAPEnabled ? "Username" : "Email address"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500 transition-colors duration-200" />
                </div>
                <input
                  id={authMethod === "ldap" && isLDAPEnabled ? "username" : "email"}
                  name={authMethod === "ldap" && isLDAPEnabled ? "username" : "email"}
                  type={authMethod === "ldap" && isLDAPEnabled ? "text" : "email"}
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors duration-200"
                  placeholder={authMethod === "ldap" && isLDAPEnabled ? `Enter your ${authLabels.ldap_auth_label.toLowerCase()} username` : "Enter your email"}
                  value={authMethod === "ldap" && isLDAPEnabled ? formData.username : formData.email}
                  onChange={handleChange}
                />
              </div>
              {authMethod === "ldap" && isLDAPEnabled && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {authLabels.ldap_auth_description}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500 transition-colors duration-200" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors duration-200"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4 transition-colors duration-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400 dark:text-red-300"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800 dark:text-red-200 transition-colors duration-200">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <ThemedButton
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
              variant="primary"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Sign in
                </>
              )}
            </ThemedButton>
            </form>
            ) : (
              /* Show message when no local auth or LDAP available */
              <div className="text-center py-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please use one of the available authentication methods above.
                </p>
              </div>
            )
          )}
          </div>

          {/* Footer */}
          <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-200">
              Don't have an account?{" "}
              <Link
                href="/auth/signup"
                className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors duration-200"
              >
                Create one here
              </Link>
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-200">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
