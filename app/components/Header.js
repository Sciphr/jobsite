// app/components/Header.js
"use client";

import Link from "next/link";
import Image from "next/image";
import { Briefcase, Menu, X, User, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useSetting } from "../hooks/useSettings";
import { usePermissions } from "../hooks/usePermissions";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoDownloadUrl, setLogoDownloadUrl] = useState(null);
  const [logoFetching, setLogoFetching] = useState(false);
  const { data: session, status } = useSession();
  const { hasAnyPermissionFor, loading: permissionsLoading } = usePermissions();

  // Get both value and loading state from useSetting
  const { value: siteName, loading: siteNameLoading } = useSetting(
    "site_name",
    "JobSite"
  );

  // Get custom logo URL if available
  const { value: logoUrl, loading: logoLoading } = useSetting(
    "site_logo_url",
    null
  );

  // Fetch logo download URL when logoUrl changes
  useEffect(() => {
    const fetchLogoUrl = async () => {
      if (logoUrl && !logoLoading) {
        setLogoFetching(true);
        try {
          const response = await fetch("/api/admin/logo");
          if (response.ok) {
            const data = await response.json();
            if (data.logoUrl) {
              setLogoDownloadUrl(data.logoUrl);
            } else {
              setLogoDownloadUrl(null);
            }
          } else {
            setLogoDownloadUrl(null);
          }
        } catch (error) {
          console.error("Error fetching logo URL:", error);
          setLogoDownloadUrl(null);
        } finally {
          setLogoFetching(false);
        }
      } else if (!logoUrl && !logoLoading) {
        setLogoDownloadUrl(null);
        setLogoFetching(false);
      }
    };

    fetchLogoUrl();
  }, [logoUrl, logoLoading]);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  // Helper function to get user's initials
  const getUserInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Check if user has any admin permissions (meaning they're some kind of employee/admin)
  const hasAnyAdminPermissions =
    session?.user &&
    (hasAnyPermissionFor("applications") ||
      hasAnyPermissionFor("jobs") ||
      hasAnyPermissionFor("users") ||
      hasAnyPermissionFor("analytics") ||
      hasAnyPermissionFor("settings") ||
      hasAnyPermissionFor("roles") ||
      hasAnyPermissionFor("audit_logs") ||
      hasAnyPermissionFor("weekly_digest") ||
      hasAnyPermissionFor("emails") ||
      hasAnyPermissionFor("interviews"));

  const isAdmin = hasAnyAdminPermissions;
  const canManageJobs = session?.user?.privilegeLevel >= 2; // Keep for other logic
  const isSuperAdmin = session?.user?.privilegeLevel >= 3; // Keep for other logic

  return (
    <header className="bg-white dark:bg-gray-900 shadow-lg border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            {logoLoading || logoFetching ? (
              <div className="h-12 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"></div>
            ) : logoDownloadUrl ? (
              <Image
                src={logoDownloadUrl}
                alt={siteName || "Site Logo"}
                width={192} // 48 * 4 for better quality
                height={48}
                className="h-auto w-auto max-w-[200px] object-contain"
                onError={(e) => {
                  console.error("Logo failed to load, falling back to text");
                  setLogoDownloadUrl(null);
                }}
                priority
              />
            ) : (
              // Fallback to text logo when no custom logo is set
              <div className="flex items-center space-x-2">
                <div className="bg-blue-600 dark:bg-blue-500 p-2 rounded-lg transition-colors duration-200">
                  <Briefcase className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold site-text-gradient transition-colors duration-200">
                  {siteNameLoading ? (
                    <span className="inline-block w-24 h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></span>
                  ) : (
                    siteName
                  )}
                </h1>
              </div>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-gray-700 dark:text-gray-300 font-medium transition-colors duration-200 relative group site-primary-text-hover"
            >
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 transition-all duration-200 group-hover:w-full site-primary"></span>
            </Link>
            <Link
              href="/jobs"
              className="text-gray-700 dark:text-gray-300 font-medium transition-colors duration-200 relative group site-primary-text-hover"
            >
              Jobs
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 transition-all duration-200 group-hover:w-full site-primary"></span>
            </Link>

            {/* Admin Navigation */}
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className="text-purple-700 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium transition-colors duration-200 relative group flex items-center space-x-1"
              >
                <Settings className="h-4 w-4" />
                <span>Dashboard</span>
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-600 dark:bg-purple-400 transition-all duration-200 group-hover:w-full"></span>
              </Link>
            )}

            {/* CTA Buttons */}
            <div className="flex items-center space-x-3 ml-4">
              {/* Theme Toggle */}
              <ThemeToggle />

              {status === "loading" ? (
                <div className="text-gray-600 dark:text-gray-400">
                  Loading...
                </div>
              ) : session ? (
                <>
                  {/* Profile Avatar with Role Badge */}
                  <Link
                    href="/profile"
                    className="group relative"
                    title={`View ${session.user?.name || "your"} profile`}
                  >
                    <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200">
                      <div className="relative">
                        {session.user?.image ? (
                          <img
                            src={session.user.image}
                            alt={session.user.name || "Profile"}
                            className="h-8 w-8 rounded-full border-2 border-gray-200 dark:border-gray-700 group-hover:border-blue-400 dark:group-hover:border-blue-500 transition-colors duration-200"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 flex items-center justify-center text-white text-sm font-semibold border-2 border-gray-200 dark:border-gray-700 group-hover:border-blue-400 dark:group-hover:border-blue-500 transition-colors duration-200">
                            {session.user?.name ? (
                              getUserInitials(session.user.name)
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                          </div>
                        )}

                        {/* Role Badge */}
                        {isAdmin && (
                          <div className="absolute -top-1 -right-1 h-4 w-4 bg-purple-600 dark:bg-purple-500 rounded-full flex items-center justify-center transition-colors duration-200">
                            <span className="text-white text-xs font-bold">
                              {isSuperAdmin ? "S" : canManageJobs ? "A" : "H"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>

                  <button
                    onClick={handleSignOut}
                    className="bg-red-600 dark:bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors duration-200 font-medium shadow-md hover:shadow-lg"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="text-gray-700 dark:text-gray-300 font-medium transition-colors duration-200 site-primary-text-hover"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="text-white px-4 py-2 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 site-primary"
                    style={{ backgroundColor: "var(--site-primary)" }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor =
                        "var(--site-primary-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "var(--site-primary)")
                    }
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-3">
            {/* Theme Toggle for Mobile */}
            <ThemeToggle />

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              ) : (
                <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-gray-800 py-4 transition-colors duration-200">
            <nav className="flex flex-col space-y-3">
              <Link
                href="/"
                className="text-gray-700 dark:text-gray-300 font-medium py-2 transition-colors duration-200 site-primary-text-hover"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/jobs"
                className="text-gray-700 dark:text-gray-300 font-medium py-2 transition-colors duration-200 site-primary-text-hover"
                onClick={() => setIsMenuOpen(false)}
              >
                Jobs
              </Link>

              {/* Mobile Admin Navigation */}
              {isAdmin && (
                <>
                  <hr className="border-gray-200 dark:border-gray-700 my-2 transition-colors duration-200" />
                  <Link
                    href="/admin/dashboard"
                    className="text-purple-700 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium py-2 transition-colors duration-200 flex items-center space-x-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Admin Dashboard</span>
                    <span className="ml-auto text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded transition-colors duration-200">
                      {session.user?.role?.toUpperCase()}
                    </span>
                  </Link>
                </>
              )}

              <hr className="border-gray-200 dark:border-gray-700 my-2 transition-colors duration-200" />

              {status === "loading" ? (
                <div className="text-gray-600 dark:text-gray-400 py-2">
                  Loading...
                </div>
              ) : session ? (
                <>
                  {/* Mobile Profile Link */}
                  <Link
                    href="/profile"
                    className="flex items-center space-x-3 text-gray-700 dark:text-gray-300 font-medium py-2 transition-colors duration-200 site-primary-text-hover"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="relative">
                      {session.user?.image ? (
                        <img
                          src={session.user.image}
                          alt={session.user.name || "Profile"}
                          className="h-6 w-6 rounded-full border border-gray-200 dark:border-gray-700"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                          {session.user?.name ? (
                            getUserInitials(session.user.name)
                          ) : (
                            <User className="h-3 w-3" />
                          )}
                        </div>
                      )}

                      {/* Role Badge for Mobile */}
                      {isAdmin && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-purple-600 dark:bg-purple-500 rounded-full"></div>
                      )}
                    </div>
                    <span>
                      Profile {session.user?.name && `(${session.user.name})`}
                      {isAdmin && (
                        <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded transition-colors duration-200">
                          {session.user?.role?.toUpperCase()}
                        </span>
                      )}
                    </span>
                  </Link>

                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsMenuOpen(false);
                    }}
                    className="bg-red-600 dark:bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors duration-200 font-medium text-center"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="text-gray-700 dark:text-gray-300 font-medium py-2 transition-colors duration-200 site-primary-text-hover"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="text-white px-4 py-2 rounded-lg font-medium text-center transition-all duration-200 site-primary"
                    style={{ backgroundColor: "var(--site-primary)" }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor =
                        "var(--site-primary-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "var(--site-primary)")
                    }
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
