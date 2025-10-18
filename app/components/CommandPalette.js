"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Command } from "cmdk";
import {
  Search,
  Home,
  Briefcase,
  Users,
  FileText,
  BarChart3,
  Settings,
  CheckSquare,
  UserPlus,
  Clock,
  Layers,
  Mail,
  Calendar,
  Shield,
  BookOpen,
  Zap,
  Filter,
  Database,
  TrendingUp,
} from "lucide-react";

/**
 * Command Palette - Global keyboard navigation (Cmd+K / Ctrl+K)
 *
 * Provides quick access to:
 * - Navigation to any page
 * - Quick actions
 * - Search functionality
 * - Recent pages
 */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  // Toggle command palette with Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Close on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Navigation commands
  const navigationCommands = useMemo(
    () => [
      {
        group: "Navigation",
        items: [
          {
            label: "Dashboard",
            icon: Home,
            action: () => router.push("/admin/dashboard"),
            keywords: ["home", "overview"],
          },
          {
            label: "Jobs",
            icon: Briefcase,
            action: () => router.push("/admin/jobs"),
            keywords: ["postings", "positions", "openings"],
          },
          {
            label: "Applications",
            icon: FileText,
            action: () => router.push("/admin/applications"),
            keywords: ["candidates", "applicants", "submissions"],
          },
          {
            label: "Pipeline",
            icon: Layers,
            action: () => router.push("/applications-manager/pipeline"),
            keywords: ["kanban", "workflow", "stages"],
          },
          {
            label: "Analytics",
            icon: BarChart3,
            action: () => router.push("/admin/analytics"),
            keywords: ["reports", "metrics", "insights", "stats"],
          },
          {
            label: "Users",
            icon: Users,
            action: () => router.push("/admin/users"),
            keywords: ["team", "staff", "admins"],
          },
          {
            label: "Approvals",
            icon: CheckSquare,
            action: () => router.push("/admin/approvals"),
            keywords: ["pending", "review", "hire approvals"],
          },
          {
            label: "Talent Pool",
            icon: UserPlus,
            action: () => router.push("/admin/talent-pool"),
            keywords: ["sourcing", "candidates", "internal"],
          },
          {
            label: "Communication",
            icon: Mail,
            action: () => router.push("/applications-manager/communication"),
            keywords: ["email", "messages", "templates"],
          },
          {
            label: "Interviews",
            icon: Calendar,
            action: () => router.push("/applications-manager/interviews"),
            keywords: ["schedule", "meetings", "calendar"],
          },
          {
            label: "Settings",
            icon: Settings,
            action: () => router.push("/admin/settings"),
            keywords: ["preferences", "configuration", "admin"],
          },
          {
            label: "Security",
            icon: Shield,
            action: () => router.push("/admin/security"),
            keywords: ["mfa", "authentication", "saml", "ldap"],
          },
          {
            label: "Audit Logs",
            icon: BookOpen,
            action: () => router.push("/admin/audit-logs"),
            keywords: ["history", "activity", "tracking"],
          },
          {
            label: "Weekly Digest",
            icon: TrendingUp,
            action: () => router.push("/admin/weekly-digest"),
            keywords: ["summary", "report", "email"],
          },
        ],
      },
    ],
    [router]
  );

  // Quick action commands
  const actionCommands = useMemo(
    () => [
      {
        group: "Quick Actions",
        items: [
          {
            label: "Create New Job",
            icon: Briefcase,
            action: () => router.push("/admin/jobs?action=create"),
            keywords: ["new", "post", "add job"],
          },
          {
            label: "View All Applications",
            icon: FileText,
            action: () => router.push("/admin/applications"),
            keywords: ["candidates", "applicants"],
          },
          {
            label: "View Pipeline",
            icon: Layers,
            action: () => router.push("/applications-manager/pipeline"),
            keywords: ["kanban", "workflow"],
          },
          {
            label: "Pending Approvals",
            icon: Clock,
            action: () => router.push("/admin/approvals"),
            keywords: ["review", "approve", "pending"],
          },
          {
            label: "View Analytics",
            icon: BarChart3,
            action: () => router.push("/admin/analytics"),
            keywords: ["reports", "metrics"],
          },
        ],
      },
    ],
    [router]
  );

  // Combine all commands
  const allCommands = [...navigationCommands, ...actionCommands];

  // Handle command selection
  const handleSelect = (action) => {
    setOpen(false);
    setSearch("");
    action();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl px-4">
        <Command
          className="admin-card rounded-lg shadow-2xl border admin-border overflow-hidden animate-in zoom-in-95 duration-200"
          shouldFilter={true}
        >
          <div className="flex items-center border-b admin-border px-4">
            <Search className="h-5 w-5 admin-text-light mr-2" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              className="flex h-14 w-full bg-transparent py-3 outline-none placeholder:admin-text-light admin-text text-base"
              autoFocus
            />
            <kbd className="hidden sm:inline-block pointer-events-none select-none rounded border admin-border px-2 py-1 text-xs admin-text-light">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm admin-text-light">
              No results found.
            </Command.Empty>

            {allCommands.map((group, groupIndex) => (
              <Command.Group
                key={groupIndex}
                heading={group.group}
                className="admin-text-light text-xs font-semibold px-2 py-2"
              >
                {group.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  return (
                    <Command.Item
                      key={`${groupIndex}-${itemIndex}`}
                      onSelect={() => handleSelect(item.action)}
                      keywords={item.keywords}
                      className="flex items-center space-x-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 admin-text transition-colors duration-150 data-[selected=true]:bg-gray-100 data-[selected=true]:dark:bg-gray-700"
                    >
                      <Icon className="h-5 w-5 admin-text-light flex-shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.shortcut && (
                        <kbd className="pointer-events-none select-none rounded border admin-border px-2 py-1 text-xs admin-text-light">
                          {item.shortcut}
                        </kbd>
                      )}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>

          <div className="flex items-center justify-between border-t admin-border px-4 py-2 text-xs admin-text-light">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <kbd className="pointer-events-none select-none rounded border admin-border px-1.5 py-0.5">
                  ↑↓
                </kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center space-x-1">
                <kbd className="pointer-events-none select-none rounded border admin-border px-1.5 py-0.5">
                  ↵
                </kbd>
                <span>Select</span>
              </div>
              <div className="flex items-center space-x-1">
                <kbd className="pointer-events-none select-none rounded border admin-border px-1.5 py-0.5">
                  ESC
                </kbd>
                <span>Close</span>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-1">
              <Zap className="h-3 w-3" />
              <span>Quick Navigation</span>
            </div>
          </div>
        </Command>
      </div>

      {/* Click outside to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={() => {
          setOpen(false);
          setSearch("");
        }}
      />
    </div>
  );
}
