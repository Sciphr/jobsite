// app/admin/layout.js - Fixed hooks order issue
"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Settings,
  BarChart3,
  Shield,
  Building2,
  Mail,
  FileSearch,
  Menu,
  X,
} from "lucide-react";
import {
  AdminThemeProvider,
  useThemeClasses,
  useAdminTheme,
} from "../contexts/AdminThemeContext";
import { QueryProvider } from "../providers/QueryProvider";
import { usePrefetchAdminData } from "../hooks/useAdminData";

function AdminLayoutContent({ children }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { loading: themeLoading } = useAdminTheme();
  const { getThemeClasses, getStatCardClasses, getButtonClasses } =
    useThemeClasses();

  // Mobile state management
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // ✅ ALWAYS call hooks at the top level, before any conditionals
  const {
    prefetchAll,
    prefetchJobs,
    prefetchApplications,
    prefetchUsers,
    prefetchAnalytics,
  } = usePrefetchAdminData();

  // Mobile detection effect
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // ✅ REPLACE your useEffect with this ONE-TIME prefetch:
  useEffect(() => {
    // Only prefetch once when admin layout first loads
    if (session?.user?.privilegeLevel >= 1) {
      console.log("🎯 Admin layout loaded - starting one-time prefetch");
      prefetchAll();
    }
  }, [session?.user?.privilegeLevel, prefetchAll]); // Only run when session changes

  // Show loading while checking session or theme
  if (status === "loading" || themeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {status === "loading" ? "Loading..." : "Initializing theme..."}
          </p>
        </div>
      </div>
    );
  }

  // Check if user is admin (privilege level 1 or higher)
  const isAdmin = session?.user?.privilegeLevel >= 1;

  if (!session || !isAdmin) {
    redirect("/auth/signin");
    return null;
  }

  const userPrivilegeLevel = session.user.privilegeLevel;
  const userRole = session.user.role;

  // Navigation items based on privilege level
  const navigationItems = [
    {
      name: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
      requiredLevel: 1,
      description: "Overview and stats",
    },
    {
      name: "Applications",
      href: "/admin/applications",
      icon: FileText,
      requiredLevel: 1,
      description: "View job applications",
    },
    {
      name: "Jobs",
      href: "/admin/jobs",
      icon: Briefcase,
      requiredLevel: 2,
      description: "Manage job postings",
    },
    {
      name: "Users",
      href: "/admin/users",
      icon: Users,
      requiredLevel: 3,
      description: "Manage all users",
    },
    {
      name: "Roles",
      href: "/admin/roles",
      icon: Users,
      requiredLevel: 3,
      description: "Manage all Roles",
    },
    {
      name: "Analytics",
      href: "/admin/analytics",
      icon: BarChart3,
      requiredLevel: 2,
      description: "View detailed reports",
    },
    {
      name: "Weekly Digest",
      href: "/admin/weekly-digest",
      icon: Mail, // You'll need to import Mail from lucide-react
      requiredLevel: 1,
      description: "Configure digest emails",
    },
    {
      name: "Audit Logs",
      href: "/admin/audit-logs",
      icon: FileSearch,
      requiredLevel: 2,
      description: "View system activity logs",
    },
    {
      name: "Settings",
      href: "/admin/settings",
      icon: Settings,
      requiredLevel: 3,
      description: "System configuration",
    },
  ];

  // Filter navigation based on user privilege
  const allowedNavItems = navigationItems.filter(
    (item) => userPrivilegeLevel >= item.requiredLevel
  );

  const getRoleBadge = () => {
    const cleanRole = userRole?.trim().toLowerCase();

    if (cleanRole === "super_admin") {
      return {
        text: "Super Admin",
        classes: getButtonClasses("primary"),
      };
    } else if (cleanRole === "admin") {
      return {
        text: "Admin",
        classes: getButtonClasses("accent"),
      };
    } else if (cleanRole === "hr") {
      return {
        text: "HR",
        classes: getButtonClasses("success"),
      };
    } else {
      return {
        text: "Admin",
        classes: getButtonClasses("accent"),
      };
    }
  };

  const badge = getRoleBadge();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 transition-colors duration-200">
      {/* Mobile Header */}
      {isMobile && (
        <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getButtonClasses("primary")}`}>
              <Shield className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-semibold admin-text dark:text-white">
              Admin Panel
            </h1>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 admin-text"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      )}

      <div className="flex">
        {/* Sidebar - Desktop: always visible, Mobile: overlay when open */}
        <AnimatePresence>
          {(!isMobile || isMobileMenuOpen) && (
            <>
              {/* Mobile Overlay */}
              {isMobile && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                />
              )}

              {/* Sidebar */}
              <motion.div
                initial={isMobile ? { x: -320 } : { x: 0 }}
                animate={{ x: 0 }}
                exit={isMobile ? { x: -320 } : { x: 0 }}
                transition={{ type: "tween", duration: 0.3 }}
                className={`${
                  isMobile
                    ? "fixed left-0 top-0 h-full w-80 z-50"
                    : "w-64 relative"
                } shadow-lg admin-sidebar bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-colors duration-200 flex flex-col`}
              >
                {/* Desktop Header - only show on desktop */}
                {!isMobile && (
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`p-2 rounded-lg ${getButtonClasses("primary")}`}
                        >
                          <Shield className="h-6 w-6" />
                        </div>
                        <div>
                          <h2
                            className={`text-lg font-semibold admin-text dark:text-white`}
                          >
                            Admin Panel
                          </h2>
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${badge.classes}`}
                          >
                            {badge.text}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <nav className={`${isMobile ? "p-4 pt-6" : "p-4"} space-y-2`}>
                  {allowedNavItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`admin-nav-link relative flex items-center space-x-3 px-4 py-3 rounded-lg group transition-colors duration-200 ${
                          isActive
                            ? `text-white`
                            : `admin-text dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700`
                        }`}
                        style={{ zIndex: isActive ? 10 : 1 }}
                      >
                        {/* Animated background for active state */}
                        {isActive && (
                          <motion.div
                            layoutId="activeNavBackground"
                            className="absolute inset-0 rounded-lg theme-primary-bg"
                            style={{
                              zIndex: -1,
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 30,
                              mass: 0.8,
                            }}
                            initial={false}
                          />
                        )}

                        {/* Content with relative positioning */}
                        <div className="relative flex items-center space-x-3 w-full">
                          <Icon
                            className={`h-5 w-5 transition-transform duration-200 ${
                              isActive
                                ? "text-white scale-110"
                                : `admin-text-light dark:text-gray-400 group-hover:admin-text dark:group-hover:text-gray-200`
                            }`}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {item.name}
                            </div>
                            <div
                              className={`text-xs mt-0.5 transition-colors duration-200 ${
                                isActive
                                  ? "text-white text-opacity-80"
                                  : "admin-text-light dark:text-gray-500"
                              }`}
                            >
                              {item.description}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </nav>

                {/* User Info at Bottom */}
                <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700 transition-colors duration-200">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${getButtonClasses("primary")}`}
                    >
                      {session.user?.name?.charAt(0)?.toUpperCase() || "A"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium truncate admin-text dark:text-white`}
                      >
                        {session.user?.name || "Admin User"}
                      </div>
                      <div
                        className={`text-xs truncate admin-text-light dark:text-gray-400`}
                      >
                        {session.user?.email}
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/"
                    className={`mt-3 w-full flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${getButtonClasses("accent")} border border-opacity-20`}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Back to Site
                  </Link>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.main
              key={pathname}
              className={`flex-1 bg-gray-50 dark:bg-gray-900 transition-colors duration-200 ${
                isMobile ? "p-4" : "p-8"
              }`}
              data-main-content
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <QueryProvider>
      <AdminThemeProvider>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </AdminThemeProvider>
    </QueryProvider>
  );
}
