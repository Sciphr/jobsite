// app/admin/layout.js - Fixed hooks order issue
"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
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
  Clock,
  CheckCircle,
} from "lucide-react";
import {
  AdminThemeProvider,
  useThemeClasses,
  useAdminTheme,
} from "../contexts/AdminThemeContext";
import { QueryProvider } from "../providers/QueryProvider";
import { usePrefetchAdminData, useStaleApplications, useHireApprovalRequests } from "../hooks/useAdminData";
import { usePermissions } from "../hooks/usePermissions";

function AdminLayoutContent({ children }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { loading: themeLoading } = useAdminTheme();
  const { getThemeClasses, getStatCardClasses, getButtonClasses } =
    useThemeClasses();
  const {
    hasPermission,
    loading: permissionsLoading,
    permissionsReady,
  } = usePermissions();

  // Add fallback timeout to prevent infinite loading
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingTimeout(true);
    }, 10000); // 10 second fallback timeout

    return () => clearTimeout(timer);
  }, []);

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

  // Get stale applications count for notification badge
  const { data: staleData } = useStaleApplications('count');
  
  // Get pending hire approvals count for notification badge
  const { data: hireApprovalsData } = useHireApprovalRequests('count');

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

  // Check if user has any admin permissions (using useMemo to prevent re-calculations)
  const hasAnyAdminPermissions = useMemo(() => {
    // Return null when still loading or permissions not ready to prevent premature redirects
    if (!session?.user || permissionsLoading || !permissionsReady) return null;

    return (
      hasPermission("applications", "view") ||
      hasPermission("jobs", "view") ||
      hasPermission("users", "view") ||
      hasPermission("analytics", "view") ||
      hasPermission("settings", "view") ||
      hasPermission("roles", "view") ||
      hasPermission("audit_logs", "view") ||
      hasPermission("weekly_digest", "view") ||
      hasPermission("emails", "view") ||
      hasPermission("interviews", "view")
    );
  }, [session?.user, permissionsLoading, permissionsReady, hasPermission]);

  // Prefetch data when admin layout loads (temporarily disabled to prevent infinite loop)
  // useEffect(() => {
  //   if (hasAnyAdminPermissions) {
  //     prefetchAll();
  //   }
  // }, [hasAnyAdminPermissions, prefetchAll]);

  // Handle redirects in useEffect to maintain hook order
  useEffect(() => {
    if (status === "loading" || permissionsLoading || !permissionsReady) return;

    if (!session) {
      router.push("/auth/signin");
      return;
    }

    // Only redirect if we're sure permissions are loaded and user has no admin access
    if (
      session &&
      !permissionsLoading &&
      permissionsReady &&
      hasAnyAdminPermissions === false
    ) {
      router.push("/");
      return;
    }
  }, [
    session?.user?.id,
    hasAnyAdminPermissions,
    status,
    permissionsLoading,
    permissionsReady,
    router,
  ]);

  // Show loading while checking session, theme, or permissions (with timeout fallback)
  if (
    (status === "loading" ||
      themeLoading ||
      permissionsLoading ||
      !permissionsReady) &&
    !loadingTimeout
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {status === "loading"
              ? "Loading..."
              : themeLoading
                ? "Initializing theme..."
                : "Loading permissions..."}
          </p>
        </div>
      </div>
    );
  }

  // Don't render anything if no session or no admin permissions (but only after permissions are loaded)
  if (
    !session ||
    (!permissionsLoading &&
      permissionsReady &&
      hasAnyAdminPermissions === false)
  ) {
    return null; // The useEffect above handles the redirects
  }

  const userPrivilegeLevel = session.user.privilegeLevel;
  const userRole = session.user.role;

  // Navigation items based on permissions
  const navigationItems = [
    {
      name: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
      requiredPermission: null, // Dashboard is always available to admin users
      description: "Overview and stats",
    },
    {
      name: "Applications",
      href: "/admin/applications",
      icon: FileText,
      requiredPermission: { resource: "applications", action: "view" },
      description: "View job applications",
    },
    {
      name: "Approvals",
      href: "/admin/approvals",
      icon: CheckCircle,
      requiredPermission: { resource: "applications", action: "approve_hire" },
      description: "Approve hiring & job requests",
      badge: hireApprovalsData?.count > 0 ? hireApprovalsData.count : null,
    },
    {
      name: "Jobs",
      href: "/admin/jobs",
      icon: Briefcase,
      requiredPermission: { resource: "jobs", action: "view" },
      description: "Manage job postings",
    },
    {
      name: "Users",
      href: "/admin/users",
      icon: Users,
      requiredPermission: { resource: "users", action: "view" },
      description: "Manage all users",
    },
    {
      name: "Roles",
      href: "/admin/roles",
      icon: Users,
      requiredPermission: { resource: "roles", action: "view" },
      description: "Manage all Roles",
    },
    {
      name: "Analytics",
      href: "/admin/analytics",
      icon: BarChart3,
      requiredPermission: { resource: "analytics", action: "view" },
      description: "View detailed reports",
    },
    {
      name: "Weekly Digest",
      href: "/admin/weekly-digest",
      icon: Mail,
      requiredPermission: { resource: "weekly_digest", action: "view" },
      description: "Configure digest emails",
    },
    {
      name: "Audit Logs",
      href: "/admin/audit-logs",
      icon: FileSearch,
      requiredPermission: { resource: "audit_logs", action: "view" },
      description: "View system activity logs",
    },
    {
      name: "Settings",
      href: "/admin/settings",
      icon: Settings,
      requiredPermission: { resource: "settings", action: "view" },
      description: "System configuration",
    },
  ];

  // Filter navigation based on user permissions

  const allowedNavItems = navigationItems.filter((item) => {
    // Dashboard is always available to admin users
    if (!item.requiredPermission) return true;

    // Special case for Approvals - check for either hire approval or job approval permissions
    if (item.name === "Approvals") {
      return hasPermission("applications", "approve_hire") || hasPermission("jobs", "approve");
    }

    // Check specific permission
    const { resource, action } = item.requiredPermission;
    return hasPermission(resource, action);
  });

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
    <div className="h-screen bg-gray-50 dark:bg-gray-800 transition-colors duration-200 overflow-hidden">
      {/* Mobile Header */}
      {isMobile && (
        <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between z-30 relative">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getButtonClasses("primary")}`}>
              <Shield className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-semibold admin-text dark:text-white">
              Admin Panel
            </h1>
            {/* Stale Applications Badge */}
            {staleData?.count > 0 && (
              <Link
                href="/admin/applications?filter=stale"
                className="relative inline-flex items-center p-2 rounded-lg bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 transition-colors duration-200"
                title={`${staleData.count} stale applications`}
              >
                <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {staleData.count > 99 ? '99+' : staleData.count}
                </span>
              </Link>
            )}
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

      <div className={`flex ${isMobile ? "h-[calc(100vh-4rem)]" : "h-full"}`}>
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
                    : "w-64 flex-shrink-0"
                } shadow-lg admin-sidebar bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-colors duration-200 flex flex-col h-full`}
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
                        <div className="flex-1">
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
                        {/* Stale Applications Badge */}
                        {staleData?.count > 0 && (
                          <Link
                            href="/admin/applications?filter=stale"
                            className="relative inline-flex items-center p-2 rounded-lg bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 transition-colors duration-200"
                            title={`${staleData.count} stale applications need attention`}
                          >
                            <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                              {staleData.count > 99 ? '99+' : staleData.count}
                            </span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <nav
                  className={`${isMobile ? "p-4 pt-6" : "p-4"} space-y-2 flex-1 overflow-y-auto`}
                >
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
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium">
                                {item.name}
                              </div>
                              {/* Badge for notification count */}
                              {item.badge && (
                                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-xs font-medium">
                                  {item.badge > 99 ? '99+' : item.badge}
                                </span>
                              )}
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

                {/* User Info at Bottom - Fixed Position */}
                <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 transition-colors duration-200 bg-white dark:bg-gray-800">
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

                  <div className="mt-3 space-y-2">
                    <Link
                      href="/"
                      className={`w-full flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${getButtonClasses("accent")} border border-opacity-20`}
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      Back to Site
                    </Link>

                    <Link
                      href="/auth/signout"
                      className="w-full flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900/30"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Sign Out
                    </Link>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden h-full">
          <AnimatePresence mode="wait">
            <motion.main
              key={pathname}
              className={`flex-1 bg-gray-50 dark:bg-gray-900 transition-colors duration-200 ${
                isMobile ? "p-4" : "p-8"
              } overflow-y-auto`}
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
