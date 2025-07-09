"use client";

import React from "react";
import { useSetting } from "../hooks/useSettings";

const Footer = () => {
  const { value: siteName, loading: siteNameLoading } = useSetting(
    "site_name",
    "JobSite"
  );

  return (
    <footer className="bg-gray-800 dark:bg-gray-950 text-white transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-300 dark:text-gray-400 transition-colors duration-200">
            &copy; 2024{" "}
            {siteNameLoading ? (
              <span className="inline-block w-16 h-4 bg-gray-600 dark:bg-gray-700 animate-pulse rounded"></span>
            ) : (
              siteName
            )}
            . All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
