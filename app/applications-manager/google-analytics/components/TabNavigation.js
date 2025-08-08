"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Activity,
  Briefcase,
  Users,
  MapPin,
  Search,
} from "lucide-react";

export default function TabNavigation({ activeTab, setActiveTab }) {
  const tabs = [
    {
      id: "overview",
      label: "Overview",
      icon: BarChart3,
      description: "Key metrics summary"
    },
    {
      id: "realtime",
      label: "Real-Time",
      icon: Activity,
      description: "Live activity"
    },
    {
      id: "jobs",
      label: "Job Performance",
      icon: Briefcase,
      description: "Individual job analytics"
    },
    {
      id: "journey",
      label: "User Journey",
      icon: Users,
      description: "Behavior & engagement"
    },
    {
      id: "geography",
      label: "Geography",
      icon: MapPin,
      description: "Location & demographics"
    },
    {
      id: "content",
      label: "Content",
      icon: Search,
      description: "Pages & search data"
    }
  ];

  return (
    <div className="border-b admin-border">
      <nav className="flex space-x-4 px-4 lg:px-6 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center space-x-2 px-3 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent admin-text-light hover:admin-text hover:border-gray-300"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-blue-600 dark:text-blue-400" : "admin-text-light"}`} />
              <div className="text-left">
                <div className={isActive ? "text-blue-600 dark:text-blue-400" : "admin-text-light"}>
                  {tab.label}
                </div>
                <div className="text-xs admin-text-light hidden sm:block">
                  {tab.description}
                </div>
              </div>
              
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}