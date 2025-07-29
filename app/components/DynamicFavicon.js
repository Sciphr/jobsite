"use client";

import { useEffect } from "react";

// Global state to track favicon loading
let faviconState = {
  loaded: false,
  loading: false
};

export default function DynamicFavicon() {
  useEffect(() => {
    // Prevent multiple simultaneous loads
    if (faviconState.loaded || faviconState.loading) {
      return;
    }

    faviconState.loading = true;

    const loadFavicon = async () => {
      try {
        // Check if there's a custom favicon available
        const faviconResponse = await fetch('/api/favicon');
        
        if (faviconResponse.ok) {
          const faviconData = await faviconResponse.json();
          
          if (faviconData.faviconUrl) {
            // Only modify DOM if we haven't already loaded a favicon
            if (!faviconState.loaded) {
              const timestamp = new Date().getTime();
              const faviconUrl = `/api/favicon/image?v=${timestamp}`;

              // Create new favicon link without removing existing ones
              // This prevents DOM manipulation conflicts
              const link = document.createElement('link');
              link.rel = 'icon';
              link.href = faviconUrl;
              link.type = 'image/x-icon';
              
              // Only add if not already present
              const existingIcon = document.querySelector(`link[href="${faviconUrl}"]`);
              if (!existingIcon) {
                document.head.appendChild(link);
              }
              
              faviconState.loaded = true;
            }
          }
        }
      } catch (error) {
        console.warn("DynamicFavicon: Could not load custom favicon:", error);
      } finally {
        faviconState.loading = false;
      }
    };

    // Load after a brief delay to ensure DOM stability
    const timer = setTimeout(loadFavicon, 500);
    return () => {
      clearTimeout(timer);
      faviconState.loading = false;
    };
  }, []);

  return null;
}