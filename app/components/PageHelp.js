"use client";

import { useState, useRef, useEffect } from "react";
import { HelpCircle, X, ExternalLink } from "lucide-react";

/**
 * PageHelp component - Displays contextual help information with tooltips
 *
 * @param {string} title - The title of the help section
 * @param {string} description - Main description of what this page does
 * @param {string} whenToUse - When users should use this page
 * @param {Array} relatedPages - Array of related pages with { label, href, description }
 * @param {string} position - Tooltip position: "top", "bottom", "left", "right" (default: "bottom")
 * @param {string} size - Icon size: "sm", "md", "lg" (default: "md")
 *
 * @example
 * <PageHelp
 *   title="Applications Overview"
 *   description="System-wide view of all applications across jobs"
 *   whenToUse="Use this page when you need to see all applications at once, perform bulk operations, or export data."
 *   relatedPages={[
 *     { label: "Pipeline View", href: "/applications-manager/pipeline", description: "Kanban-style workflow management" }
 *   ]}
 * />
 */
export default function PageHelp({
  title,
  description,
  whenToUse,
  relatedPages = [],
  position = "bottom",
  size = "md",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef(null);
  const buttonRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Icon size classes
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  // Tooltip position classes
  const positionClasses = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
    left: "right-full mr-2",
    right: "left-full ml-2",
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 admin-text-light hover:admin-text"
        title="Page help"
        aria-label="Show page help"
      >
        <HelpCircle className={sizeClasses[size]} />
      </button>

      {isOpen && (
        <div
          ref={tooltipRef}
          className={`absolute ${positionClasses[position]} right-0 z-50 w-80 admin-card rounded-lg shadow-xl border admin-border p-4 animate-in fade-in duration-200`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-base font-semibold admin-text">{title}</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              aria-label="Close help"
            >
              <X className="h-4 w-4 admin-text-light" />
            </button>
          </div>

          {/* Description */}
          {description && (
            <div className="mb-3">
              <p className="text-sm admin-text-light leading-relaxed">{description}</p>
            </div>
          )}

          {/* When to Use */}
          {whenToUse && (
            <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1 uppercase tracking-wide">
                When to use this page
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">{whenToUse}</p>
            </div>
          )}

          {/* Related Pages */}
          {relatedPages.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold admin-text mb-2 uppercase tracking-wide">
                Related Pages
              </h4>
              <div className="space-y-2">
                {relatedPages.map((page, index) => (
                  <a
                    key={index}
                    href={page.href}
                    className="block p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium admin-text group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center space-x-1">
                          <span>{page.label}</span>
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        </div>
                        {page.description && (
                          <p className="text-xs admin-text-light mt-1">{page.description}</p>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Inline PageHelp variant - shows help text inline instead of in a tooltip
 */
export function InlinePageHelp({ description, relatedPages = [] }) {
  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 mb-6">
      <div className="flex items-start space-x-3">
        <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-blue-900 dark:text-blue-200 mb-2">{description}</p>
          {relatedPages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {relatedPages.map((page, index) => (
                <a
                  key={index}
                  href={page.href}
                  className="inline-flex items-center space-x-1 text-xs font-medium text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 hover:underline"
                >
                  <span>{page.label}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
