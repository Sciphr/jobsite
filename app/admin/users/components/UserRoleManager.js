"use client";

import { useState, useEffect } from "react";
import { Plus, X, Edit3, Crown, Shield, UserCheck, User } from "lucide-react";

export default function UserRoleManager({ 
  user, 
  availableRoles = [], 
  onRoleChange, 
  isLoading = false, 
  compact = false 
}) {
  const [showAddRole, setShowAddRole] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [error, setError] = useState(null);

  const userRoles = user?.user_roles || [];
  const assignedRoleIds = userRoles.map(ur => ur.roles?.id).filter(Boolean);
  const availableRolesToAdd = availableRoles.filter(role => 
    role && role.id && !assignedRoleIds.includes(role.id)
  );

  // Clear error when component updates
  useEffect(() => {
    setError(null);
  }, [user]);

  const getRoleIcon = (roleName) => {
    const name = roleName?.toLowerCase();
    switch (name) {
      case 'super admin':
      case 'super_admin':
        return Crown;
      case 'admin':
        return Shield;
      case 'hr':
        return UserCheck;
      default:
        return User;
    }
  };

  const getRoleColorClasses = (color) => {
    const colorMap = {
      blue: "bg-blue-100 text-blue-800 border-blue-200",
      green: "bg-green-100 text-green-800 border-green-200", 
      purple: "bg-purple-100 text-purple-800 border-purple-200",
      red: "bg-red-100 text-red-800 border-red-200",
      yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
      indigo: "bg-indigo-100 text-indigo-800 border-indigo-200",
      pink: "bg-pink-100 text-pink-800 border-pink-200",
      gray: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return colorMap[color] || colorMap.gray;
  };

  const handleAddRole = async (roleId) => {
    if (!roleId) return;
    
    // Double-check that user doesn't already have this role
    if (assignedRoleIds.includes(roleId)) {
      const roleName = availableRoles.find(r => r.id === roleId)?.name || 'Unknown Role';
      setError(`User already has the ${roleName} role`);
      return;
    }
    
    setError(null);
    try {
      await onRoleChange?.(user.id, roleId, 'add');
      setSelectedRoleId("");
      setShowAddRole(false);
    } catch (error) {
      console.error('Error adding role:', error);
      setError(error.message || 'Failed to add role');
    }
  };

  const handleRemoveRole = async (roleId) => {
    setError(null);
    try {
      await onRoleChange?.(user.id, roleId, 'remove');
    } catch (error) {
      console.error('Error removing role:', error);
      setError(error.message || 'Failed to remove role');
    }
  };

  if (compact) {
    // Compact view for table display
    return (
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          <div className="flex flex-wrap gap-1">
            {userRoles.length === 0 ? (
              <span className="text-xs text-gray-500 italic">No roles assigned</span>
            ) : (
              userRoles.map((userRole, index) => {
                const role = userRole.roles;
                if (!role) return null;
                const RoleIcon = getRoleIcon(role.name);
                const colorClasses = getRoleColorClasses(role.color);
            
                return (
                  <div
                    key={userRole.id}
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colorClasses}`}
                    title={role.name}
                  >
                    <RoleIcon className="h-3 w-3 mr-1" />
                    {role.name}
                    {userRoles.length > 1 && (
                      <button
                        onClick={() => handleRemoveRole(role.id)}
                        disabled={isLoading}
                        className="ml-1 text-current hover:text-red-600 transition-colors"
                        title={`Remove ${role.name} role`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Add Role */}
          {availableRolesToAdd.length > 0 && (
            <div className="relative">
              {!showAddRole ? (
                <button
                  onClick={() => setShowAddRole(true)}
                  disabled={isLoading}
                  className="inline-flex items-center px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 rounded-full hover:border-gray-400 transition-colors"
                  title={`Add role (${availableRolesToAdd.length} available)`}
                >
                  <Plus className="h-3 w-3" />
                </button>
              ) : (
                <div className="flex items-center space-x-1">
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading}
                  >
                    <option value="">Select role...</option>
                    {availableRolesToAdd.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAddRole(selectedRoleId)}
                    disabled={!selectedRoleId || isLoading}
                    className="text-green-600 hover:text-green-800 disabled:text-gray-400"
                    title="Add selected role"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => {
                      setShowAddRole(false);
                      setSelectedRoleId("");
                      setError(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                    title="Cancel"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Error Display for Compact Mode */}
        {error && (
          <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Full view for edit modal
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">User Roles</h3>
        <span className="text-sm text-gray-500">
          {userRoles.length} role{userRoles.length !== 1 ? 's' : ''} assigned
        </span>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Current Roles */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Current Roles</h4>
        {userRoles.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No roles assigned</p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {userRoles.map((userRole) => {
              const role = userRole.roles;
              if (!role) return null;
              const RoleIcon = getRoleIcon(role.name);
              const colorClasses = getRoleColorClasses(role.color);
              
              return (
                <div
                  key={userRole.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${colorClasses.replace('text-', 'bg-').replace('-800', '-50').replace('bg-', 'bg-')} border-opacity-20`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${colorClasses.split(' ')[0]} ${colorClasses.split(' ')[1]}`}>
                      <RoleIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{role.name}</div>
                      <div className="text-xs text-gray-500">
                        Assigned: {new Date(userRole.assigned_at).toLocaleDateString()}
                        {role.is_system_role && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            System
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {userRoles.length > 1 && (
                    <button
                      onClick={() => handleRemoveRole(role.id)}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-800 disabled:text-gray-400 p-1 rounded transition-colors"
                      title={`Remove ${role.name} role`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add New Role */}
      {availableRolesToAdd.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Add Role</h4>
          <div className="grid grid-cols-1 gap-2">
            {availableRolesToAdd.map((role) => {
              if (!role || !role.id || !role.name) return null;
              const RoleIcon = getRoleIcon(role.name);
              const colorClasses = getRoleColorClasses(role.color);
              
              return (
                <button
                  key={role.id}
                  onClick={() => handleAddRole(role.id)}
                  disabled={isLoading}
                  className={`flex items-center space-x-3 p-3 rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left`}
                >
                  <div className={`p-2 rounded-full ${colorClasses.split(' ')[0]} ${colorClasses.split(' ')[1]}`}>
                    <RoleIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{role.name}</div>
                    {role.is_system_role && (
                      <span className="text-xs text-gray-500">System Role</span>
                    )}
                  </div>
                  <Plus className="h-4 w-4 text-gray-400 ml-auto" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {availableRolesToAdd.length === 0 && userRoles.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            ✓ All available roles are already assigned to this user.
          </p>
        </div>
      )}
      
      {availableRolesToAdd.length === 0 && userRoles.length === 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            ⚠️ No roles available to assign. Please contact an administrator.
          </p>
        </div>
      )}
    </div>
  );
}