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

export default function AdminLayout({ children }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

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
    console.log(
      "getRoleBadge called with userRole:",
      userRole,
      "type:",
      typeof userRole
    );
    console.log("userRole length:", userRole?.length);
    console.log(
      "userRole char codes:",
      userRole?.split("").map((char) => char.charCodeAt(0))
    );

    // Clean the userRole to remove any potential whitespace or hidden characters
    const cleanRole = userRole?.trim().toLowerCase();
    console.log("cleaned role:", cleanRole);

    const badges = {
      hr: { text: "HR", color: "bg-green-100 text-green-800" },
      admin: { text: "Admin", color: "bg-blue-100 text-blue-800" },
      super_admin: {
        text: "Super Admin",
        color: "bg-purple-100 text-purple-800",
      },
    };

    // Try with cleaned role
    if (cleanRole === "super_admin") {
      console.log("Matched super_admin with cleaned role");
      return { text: "Super Admin", color: "bg-purple-100 text-purple-800" };
    } else if (cleanRole === "admin") {
      console.log("Matched admin with cleaned role");
      return { text: "Admin", color: "bg-blue-100 text-blue-800" };
    } else if (cleanRole === "hr") {
      console.log("Matched hr with cleaned role");
      return { text: "HR", color: "bg-green-100 text-green-800" };
    } else {
      console.log("No match, using default admin");
      return { text: "Admin", color: "bg-blue-100 text-blue-800" };
    }
  };

  const badge = getRoleBadge();

  // Debug log to see what badge is returned
  console.log("Badge object:", badge);
  console.log("Badge text:", badge.text);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-600 p-2 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Admin Panel
              </h2>
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-medium ${badge.color}`}
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
                    ? "bg-purple-100 text-purple-700 border border-purple-200"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    isActive
                      ? "text-purple-600"
                      : "text-gray-500 group-hover:text-gray-700"
                  }`}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Info at Bottom */}
        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
              {session.user?.name?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {session.user?.name || "Admin User"}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {session.user?.email}
              </div>
            </div>
          </div>

          <Link
            href="/"
            className="mt-3 w-full flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
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
