"use client";

import { useState } from "react";
import {
  Users,
  Crown,
  Shield,
  ShieldCheck,
  User,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

// Simple fallback without drag-and-drop library
export default function SimpleDragDropFallback({ 
  users = [], 
  roles = [], 
  onRoleChange,
  isLoading = false 
}) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const getRoleIcon = (roleName) => {
    const name = roleName?.toLowerCase();
    if (name?.includes('super') || name?.includes('admin')) return Crown;
    if (name?.includes('hr')) return ShieldCheck;
    if (name?.includes('manager')) return Shield;
    return User;
  };

  const getUserRoles = (user) => {
    return user.user_roles?.map(ur => ur.roles) || [];
  };

  const handleRoleAssignment = async (action) => {
    if (!selectedUser || !selectedRole) return;

    setIsAssigning(true);
    try {
      await onRoleChange(selectedUser.id, selectedRole.id, action);
      setSelectedUser(null);
      setSelectedRole(null);
    } catch (error) {
      console.error('Role assignment error:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-purple-600" />
          <p className="mt-2 text-sm text-gray-600">Loading role management interface...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">Interactive Role Assignment</h3>
        <p className="text-sm text-gray-600 mt-1">
          Select a user and role to assign or remove roles
        </p>
      </div>

      {/* Role Assignment Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users Column */}
        <div className="bg-white border-2 border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h4 className="font-medium text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Select User
            </h4>
          </div>
          <div className="p-2 max-h-96 overflow-y-auto">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`w-full p-3 mb-2 rounded-lg border text-left transition-all ${
                  selectedUser?.id === user.id
                    ? 'border-purple-300 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {user.firstName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {getUserRoles(user).length} role{getUserRoles(user).length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Column */}
        <div className="flex flex-col items-center justify-center space-y-4">
          {selectedUser && selectedRole ? (
            <div className="text-center space-y-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="font-medium">{selectedUser.firstName}</span>
                <ArrowRight className="h-4 w-4" />
                <span className="font-medium">{selectedRole.name}</span>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => handleRoleAssignment('add')}
                  disabled={isAssigning}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <span>Assign Role</span>
                </button>
                <button
                  onClick={() => handleRoleAssignment('remove')}
                  disabled={isAssigning}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <span>Remove Role</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <ArrowRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select user and role</p>
            </div>
          )}
        </div>

        {/* Roles Column */}
        <div className="bg-white border-2 border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h4 className="font-medium text-gray-900 flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Select Role
            </h4>
          </div>
          <div className="p-2 max-h-96 overflow-y-auto">
            {roles.map(role => {
              const RoleIcon = getRoleIcon(role.name);
              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full p-3 mb-2 rounded-lg border text-left transition-all ${
                    selectedRole?.id === role.id
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ 
                        backgroundColor: `${role.color}20`,
                        color: role.color
                      }}
                    >
                      <RoleIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{role.name}</p>
                      {role.description && (
                        <p className="text-xs text-gray-500">{role.description}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current User Roles Display */}
      {selectedUser && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            Current Roles for {selectedUser.firstName} {selectedUser.lastName}:
          </h4>
          <div className="flex flex-wrap gap-2">
            {getUserRoles(selectedUser).map(role => {
              const RoleIcon = getRoleIcon(role.name);
              return (
                <span
                  key={role.id}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                  style={{ 
                    backgroundColor: `${role.color}20`,
                    color: role.color,
                    border: `1px solid ${role.color}40`
                  }}
                >
                  <RoleIcon className="h-3 w-3 mr-1" />
                  {role.name}
                </span>
              );
            })}
            {getUserRoles(selectedUser).length === 0 && (
              <span className="text-sm text-gray-500 italic">No roles assigned</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}