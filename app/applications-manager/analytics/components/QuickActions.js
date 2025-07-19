"use client";

import { motion } from "framer-motion";
import { Layers, Mail, FileText, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

const QuickActions = () => {
  const router = useRouter();

  const actions = [
    {
      icon: Layers,
      label: "View Pipeline",
      path: "/applications-manager/pipeline",
      color: "text-blue-600"
    },
    {
      icon: Mail,
      label: "Send Emails",
      path: "/applications-manager/communication",
      color: "text-green-600"
    },
    {
      icon: FileText,
      label: "Export Data",
      onClick: () => console.log("Export clicked"),
      color: "text-purple-600"
    }
  ];

  return (
    <div className="admin-card rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold admin-text">Quick Actions</h3>
      </div>
      <div className="p-6 space-y-3">
        {actions.map((action, index) => (
          <motion.button
            key={action.label}
            whileHover={{ scale: 1.02, x: 2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => action.path ? router.push(action.path) : action.onClick?.()}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-3">
              <action.icon className={`h-5 w-5 ${action.color}`} />
              <span className="font-medium">{action.label}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;