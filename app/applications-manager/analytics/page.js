"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Analytics page redirect
 *
 * This page has been merged into the main Admin Analytics page at /admin/analytics
 * which now supports department filtering for both admin and application manager roles.
 *
 * Users are automatically redirected to the unified analytics dashboard.
 */
export default function AnalyticsRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the unified analytics page
    router.replace("/admin/analytics");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="admin-text-light">Redirecting to Analytics Dashboard...</p>
      </div>
    </div>
  );
}
