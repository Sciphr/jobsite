"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import SetupWizard from "./components/SetupWizard";

export default function SetupPage() {
  const [token, setToken] = useState(null);
  const [tokenValid, setTokenValid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const setupToken = searchParams.get("token");
    
    if (!setupToken) {
      setError("No setup token provided. Please use the setup URL provided by your administrator.");
      setLoading(false);
      return;
    }

    setToken(setupToken);
    validateToken(setupToken);
  }, [searchParams]);

  const validateToken = async (setupToken) => {
    try {
      const response = await fetch("/api/setup/validate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: setupToken }),
      });

      if (response.ok) {
        setTokenValid(true);
      } else {
        const data = await response.json();
        setError(data.error || "Invalid setup token");
      }
    } catch (error) {
      console.error("Error validating token:", error);
      setError("Failed to validate setup token. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating setup token...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Setup Error</h3>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <p className="text-xs text-gray-400">
              Please contact your administrator for a valid setup link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (tokenValid) {
    return <SetupWizard token={token} />;
  }

  return null;
}