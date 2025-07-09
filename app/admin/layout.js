"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Settings,
  BarChart3,
  Shield,
  Building2,
} from "lucide-react";
import {
  AdminThemeProvider,
  useThemeClasses,
} from "../contexts/AdminThemeContext";

function AdminLayoutContent({ children }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { getThemeClasses, getStatCardClasses, getButtonClasses } =
    useThemeClasses();

  // Show loading while checking session
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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
      name: "Analytics",
      href: "/admin/analytics",
      icon: BarChart3,
      requiredLevel: 2,
      description: "View detailed reports",
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Themed Sidebar */}
      <div className="w-64 shadow-lg admin-sidebar">
        <div className="p-6 border-b admin-text-light">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getButtonClasses("primary")}`}>
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h2 className={`text-lg font-semibold admin-text`}>
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

        <nav className="p-4 space-y-2">
          {allowedNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 group ${
                  isActive
                    ? `${getButtonClasses("primary")} border border-opacity-20`
                    : `admin-text hover:bg-gray-100`
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    isActive
                      ? "text-white"
                      : `admin-text-light group-hover:admin-text`
                  }`}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{item.name}</div>
                  <div
                    className={`text-xs mt-0.5 ${
                      isActive
                        ? "text-white text-opacity-80"
                        : "admin-text-light"
                    }`}
                  >
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Info at Bottom */}
        <div className="absolute bottom-0 w-64 p-4 border-t admin-text-light bg-white">
          <div className="flex items-center space-x-3">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${getButtonClasses("primary")}`}
            >
              {session.user?.name?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium truncate admin-text`}>
                {session.user?.name || "Admin User"}
              </div>
              <div className={`text-xs truncate admin-text-light`}>
                {session.user?.email}
              </div>
            </div>
          </div>

          <Link
            href="/"
            className={`mt-3 w-full flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium transition-colors duration-200 admin-card hover:admin-primary-border admin-text`}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Back to Site
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <AdminThemeProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminThemeProvider>
  );
}
