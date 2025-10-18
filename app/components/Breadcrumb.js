"use client";

import { ChevronRight, Home } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Reusable Breadcrumb component for consistent navigation across the app
 *
 * @param {Array} items - Array of breadcrumb items
 * @param {string} items[].label - Display text for the breadcrumb
 * @param {string} items[].href - Optional URL to navigate to (if clickable)
 * @param {boolean} items[].current - Whether this is the current page (not clickable)
 *
 * @example
 * <Breadcrumb items={[
 *   { label: "Dashboard", href: "/admin/dashboard" },
 *   { label: "Applications", href: "/admin/applications" },
 *   { label: "John Doe", current: true }
 * ]} />
 */
export default function Breadcrumb({ items = [] }) {
  const router = useRouter();

  if (!items || items.length === 0) {
    return null;
  }

  const handleClick = (item) => {
    if (item.href && !item.current) {
      router.push(item.href);
    }
  };

  return (
    <nav className="flex items-center space-x-2 text-sm admin-text-light mb-4" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isCurrent = item.current || isLast;

          return (
            <li key={index} className="flex items-center space-x-2">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-600 flex-shrink-0" />
              )}

              {index === 0 && item.icon !== false && (
                <Home className="h-4 w-4 flex-shrink-0" />
              )}

              {isCurrent ? (
                <span className="admin-text font-medium truncate max-w-[200px] md:max-w-none">
                  {item.label}
                </span>
              ) : (
                <button
                  onClick={() => handleClick(item)}
                  className="hover:admin-text transition-colors duration-200 truncate max-w-[200px] md:max-w-none"
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Helper function to create breadcrumb items from a path
 *
 * @param {string} pathname - The current pathname
 * @param {Object} customLabels - Custom labels for path segments
 * @returns {Array} Breadcrumb items
 *
 * @example
 * const items = generateBreadcrumbsFromPath(
 *   "/admin/applications/123",
 *   { admin: "Admin Panel", applications: "All Applications", "123": "John Doe" }
 * );
 */
export function generateBreadcrumbsFromPath(pathname, customLabels = {}) {
  const segments = pathname.split("/").filter(Boolean);
  const items = [];

  segments.forEach((segment, index) => {
    const path = "/" + segments.slice(0, index + 1).join("/");
    const label = customLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");

    items.push({
      label,
      href: path,
      current: index === segments.length - 1,
    });
  });

  return items;
}
