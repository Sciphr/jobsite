"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useSystemSettings } from "@/app/hooks/useSystemSettings";

export default function GoogleAnalytics() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render anything on server-side or during initial render
  if (!isClient) {
    return null;
  }

  return <GoogleAnalyticsClient />;
}

function GoogleAnalyticsClient() {
  const { data: settingsResponse } = useSystemSettings();
  
  // Check if analytics tracking is enabled
  const analyticsEnabled = settingsResponse?.settings?.find(
    s => s.key === "analytics_tracking" && (s.value === "true" || s.parsedValue === true)
  );

  // Only render GA scripts if analytics tracking is enabled
  if (!analyticsEnabled) {
    return null;
  }

  const GA_ID = "G-NGGR5RCXPB";

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', {
              page_title: document.title,
              page_location: window.location.href,
            });
          `,
        }}
      />
    </>
  );
}