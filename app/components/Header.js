"use client";

import Link from "next/link";
import {
  Briefcase,
  Menu,
  X,
  User,
  Settings,
  Users,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useSetting } from "../hooks/useSettings";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session, status } = useSession();

  // Get both value and loading state from useSetting
  const { value: siteName, loading: siteNameLoading } = useSetting(
    "site_name",
    "JobSite"
  );

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

  // Check admin privileges
  const isAdmin = session?.user?.privilegeLevel >= 1; // HR level and above
  const canManageJobs = session?.user?.privilegeLevel >= 2; // Admin level and above
  const isSuperAdmin = session?.user?.privilegeLevel >= 3; // Super admin

  return (
    <header className="bg-white shadow-lg border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                {siteNameLoading ? (
                  <span className="inline-block w-24 h-8 bg-gray-200 animate-pulse rounded"></span>
                ) : (
                  siteName
                )}
              </h1>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 relative group"
            >
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
            </Link>
            <Link
              href="/jobs"
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 relative group"
            >
              Jobs
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
            </Link>

            {/* Admin Navigation */}
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className="text-purple-700 hover:text-purple-800 font-medium transition-colors duration-200 relative group flex items-center space-x-1"
              >
                <Settings className="h-4 w-4" />
                <span>Dashboard</span>
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-600 transition-all duration-200 group-hover:w-full"></span>
              </Link>
            )}

            {/* CTA Buttons */}
            <div className="flex items-center space-x-3 ml-4">
              {status === "loading" ? (
                <div className="text-gray-600">Loading...</div>
              ) : session ? (
                <>
                  {/* Profile Avatar with Role Badge */}
                  <Link
                    href="/profile"
                    className="group relative"
                    title={`View ${session.user?.name || "your"} profile`}
                  >
                    <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                      <div className="relative">
                        {session.user?.image ? (
                          <img
                            src={session.user.image}
                            alt={session.user.name || "Profile"}
                            className="h-8 w-8 rounded-full border-2 border-gray-200 group-hover:border-blue-400 transition-colors duration-200"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold border-2 border-gray-200 group-hover:border-blue-400 transition-colors duration-200">
                            {session.user?.name ? (
                              getUserInitials(session.user.name)
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                          </div>
                        )}

                        {/* Role Badge */}
                        {isAdmin && (
                          <div className="absolute -top-1 -right-1 h-4 w-4 bg-purple-600 rounded-full flex items-center justify-center">
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
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium shadow-md hover:shadow-lg"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium shadow-md hover:shadow-lg"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-gray-700" />
            ) : (
              <Menu className="h-6 w-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-100 py-4">
            <nav className="flex flex-col space-y-3">
              <Link
                href="/"
                className="text-gray-700 hover:text-blue-600 font-medium py-2 transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/jobs"
                className="text-gray-700 hover:text-blue-600 font-medium py-2 transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Jobs
              </Link>

              {/* Mobile Admin Navigation */}
              {isAdmin && (
                <>
                  <hr className="border-gray-200 my-2" />
                  <Link
                    href="/admin/dashboard"
                    className="text-purple-700 hover:text-purple-800 font-medium py-2 transition-colors duration-200 flex items-center space-x-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Admin Dashboard</span>
                    <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      {session.user?.role?.toUpperCase()}
                    </span>
                  </Link>
                </>
              )}

              <hr className="border-gray-200 my-2" />

              {status === "loading" ? (
                <div className="text-gray-600 py-2">Loading...</div>
              ) : session ? (
                <>
                  {/* Mobile Profile Link */}
                  <Link
                    href="/profile"
                    className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 font-medium py-2 transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="relative">
                      {session.user?.image ? (
                        <img
                          src={session.user.image}
                          alt={session.user.name || "Profile"}
                          className="h-6 w-6 rounded-full border border-gray-200"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                          {session.user?.name ? (
                            getUserInitials(session.user.name)
                          ) : (
                            <User className="h-3 w-3" />
                          )}
                        </div>
                      )}

                      {/* Role Badge for Mobile */}
                      {isAdmin && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-purple-600 rounded-full"></div>
                      )}
                    </div>
                    <span>
                      Profile {session.user?.name && `(${session.user.name})`}
                      {isAdmin && (
                        <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
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
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium text-center"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="text-gray-700 hover:text-blue-600 font-medium py-2 transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium text-center"
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
