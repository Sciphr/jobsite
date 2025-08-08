import { useState } from "react";
import { useThemeClasses } from "../../../contexts/AdminThemeContext";

export default function RoleCard({ role, onEdit, onDelete, onAssignUsers }) {
  const { getButtonClasses, getStatCardClasses } = useThemeClasses();
  const [showDetails, setShowDetails] = useState(false);

  const getRoleColorClass = (color) => {
    // Use theme stat classes based on color
    const colorMap = {
      blue: "theme-stat-1-bg bg-opacity-20 theme-stat-1 theme-stat-1-border",
      green: "theme-stat-3-bg bg-opacity-20 theme-stat-3 theme-stat-3-border",
      purple: "theme-stat-2-bg bg-opacity-20 theme-stat-2 theme-stat-2-border",
      red: "theme-danger-bg bg-opacity-20 theme-danger theme-danger-border",
      yellow: "theme-warning-bg bg-opacity-20 theme-warning theme-warning-border", 
      indigo: "theme-stat-5-bg bg-opacity-20 theme-stat-5 theme-stat-5-border",
      pink: "theme-stat-4-bg bg-opacity-20 theme-stat-4 theme-stat-4-border",
      gray: "admin-card admin-text admin-border",
    };
    return colorMap[color] || colorMap.gray;
  };

  const getBadgeColorClass = (color) => {
    const colorMap = {
      blue: "theme-stat-1-bg",
      green: "theme-stat-3-bg",
      purple: "theme-stat-2-bg",
      red: "theme-danger-bg",
      yellow: "theme-warning-bg",
      indigo: "theme-stat-5-bg",
      pink: "theme-stat-4-bg",
      gray: "admin-text-light",
    };
    return colorMap[color] || colorMap.gray;
  };

  return (
    <div className={`admin-card shadow rounded-lg border-l-4 ${getRoleColorClass(role.color)} hover:shadow-lg transition-shadow duration-200`}>
      <div className="p-6">
        {/* Role Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${getBadgeColorClass(role.color)}`}></div>
            <div>
              <h3 className="text-lg font-medium admin-text">{role.name}</h3>
              {role.is_system_role && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium admin-card admin-text">
                  System Role
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {role.is_active ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium theme-success-bg bg-opacity-20 theme-success">
                Active
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium theme-danger-bg bg-opacity-20 theme-danger">
                Inactive
              </span>
            )}
          </div>
        </div>

        {/* Role Description */}
        <p className="text-sm admin-text-light mb-4 line-clamp-2">
          {role.description || "No description provided"}
        </p>

        {/* Role Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 admin-card bg-opacity-50 rounded-lg">
            <div className="text-lg font-semibold admin-text">
              {role._count?.role_permissions || 0}
            </div>
            <div className="text-xs admin-text-light">Permissions</div>
          </div>
          <div className="text-center p-3 admin-card bg-opacity-50 rounded-lg">
            <div className="text-lg font-semibold admin-text">
              {role._count?.user_roles || 0}
            </div>
            <div className="text-xs admin-text-light">Users</div>
          </div>
        </div>

        {/* Permission Preview */}
        {showDetails && role.role_permissions && role.role_permissions.length > 0 && (
          <div className="mb-4 p-3 admin-card bg-opacity-50 rounded-lg">
            <h4 className="text-sm font-medium admin-text mb-2">Permissions:</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {role.role_permissions.slice(0, 5).map((perm, index) => (
                <div key={index} className="text-xs admin-text-light">
                  • {perm.permissions.resource}:{perm.permissions.action}
                </div>
              ))}
              {role.role_permissions.length > 5 && (
                <div className="text-xs admin-text-light">
                  + {role.role_permissions.length - 5} more permissions
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t admin-border">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm theme-primary hover:opacity-80 font-medium"
          >
            {showDetails ? "Hide Details" : "View Details"}
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onAssignUsers(role)}
              className={`inline-flex items-center px-3 py-1 shadow-sm text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${getButtonClasses('primary')} opacity-70 hover:opacity-100`}
            >
              <svg className="-ml-0.5 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              Assign Users
            </button>

            <button
              onClick={() => onEdit(role)}
              className={`inline-flex items-center px-3 py-1 shadow-sm text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${getButtonClasses('primary')} opacity-70 hover:opacity-100`}
            >
              <svg className="-ml-0.5 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Edit
            </button>

            {!role.is_system_role && (
              <button
                onClick={() => onDelete(role)}
                className={`inline-flex items-center px-3 py-1 shadow-sm text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${getButtonClasses('danger')} opacity-70 hover:opacity-100`}
              >
                <svg className="-ml-0.5 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414L7.586 12l-1.293 1.293a1 1 0 101.414 1.414L9 13.414l2.293 2.293a1 1 0 001.414-1.414L11.414 12l1.293-1.293z" clipRule="evenodd" />
                </svg>
                Delete
              </button>
            )}
          </div>
        </div>

        {/* System Role Warning */}
        {role.is_system_role && (
          <div className="mt-3 p-2 theme-warning-bg bg-opacity-20 border theme-warning-border rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 theme-warning" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-2">
                <p className="text-xs theme-warning">
                  System roles cannot be deleted and have restricted editing capabilities.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}