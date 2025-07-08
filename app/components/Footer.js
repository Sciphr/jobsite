"use client";

import React from "react";
import { useSetting } from "../hooks/useSettings";

const Footer = () => {
  const { value: siteName } = useSetting("site_name", "JobSite");

  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p>&copy; 2024 {siteName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
