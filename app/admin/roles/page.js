"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePermissions } from "@/app/hooks/usePermissions";
import { useRoles } from "@/app/hooks/useAdminData";
import RoleCard from "./components/RoleCard";
import CreateRoleModal from "./components/CreateRoleModal";
import EditRoleModal from "./components/EditRoleModal";
import DeleteRoleModal from "./components/DeleteRoleModal";
import UserRoleAssignmentModal from "./components/UserRoleAssignmentModal";

export default function RoleManagementPage() {
  const { data: session } = useSession();
  const { can, loading: permissionsLoading } = usePermissions();
  const { data: roles = [], isLoading, isError, error: queryError, refetch } = useRoles();
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  // Check if user can manage roles
  const canManageRoles = can.manageRoles && can.manageRoles();

  // Set error state if no permissions
  const error = (!permissionsLoading && !canManageRoles) 
    ? "You don't have permission to manage roles" 
    : (isError ? queryError?.message : null);
  
  const loading = permissionsLoading || isLoading;

  const handleCreateRole = () => {
    setShowCreateModal(true);
  };

  const handleEditRole = (role) => {
    setSelectedRole(role);
    setShowEditModal(true);
  };

  const handleDeleteRole = (role) => {
    setSelectedRole(role);
    setShowDeleteModal(true);
  };

  const handleAssignUsers = (role) => {
    setSelectedRole(role);
    setShowAssignModal(true);
  };

  const onRoleCreated = () => {
    refetch(); // Refetch roles after creation
    setShowCreateModal(false);
  };

  const onRoleUpdated = () => {
    refetch(); // Refetch roles after update
    setShowEditModal(false);
    setSelectedRole(null);
  };

  const onRoleDeleted = () => {
    refetch(); // Refetch roles after deletion
    setShowDeleteModal(false);
    setSelectedRole(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Access Denied</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h1 className="text-xl font-semibold text-gray-900">Role Management</h1>
              <p className="mt-2 text-sm text-gray-700">
                Manage user roles and permissions across your organization. Create custom roles with granular permissions for different teams and responsibilities.
              </p>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
              <button
                type="button"
                onClick={handleCreateRole}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Create New Role
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Role Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.196M17 20v-2a3 3 0 015.196-2.196M17 20H7m10 0v-2a3 3 0 00-3-3m-4 0a3 3 0 00-3 3v2m0 0H7m0 0v-2a3 3 0 013-3m-4 0a3 3 0 00-3 3v2a3 3 0 003-3m0 0h.01" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Roles</dt>
                  <dd className="text-lg font-medium text-gray-900">{roles.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Roles</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {roles.filter(role => role.is_active).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Custom Roles</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {roles.filter(role => !role.is_system_role).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {roles.reduce((sum, role) => sum + (role._count?.user_roles || 0), 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            onEdit={handleEditRole}
            onDelete={handleDeleteRole}
            onAssignUsers={handleAssignUsers}
          />
        ))}
      </div>

      {roles.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A10.003 10.003 0 0124 26c4.21 0 7.813 2.602 9.288 6.286M30 14a6 6 0 11-12 0 6 6 0 0112 0zm12 6a4 4 0 11-8 0 4 4 0 018 0zm-28 0a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No roles found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first custom role.</p>
          <div className="mt-6">
            <button
              type="button"
              onClick={handleCreateRole}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create New Role
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateRoleModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onRoleCreated={onRoleCreated}
        />
      )}

      {showEditModal && selectedRole && (
        <EditRoleModal
          isOpen={showEditModal}
          role={selectedRole}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRole(null);
          }}
          onRoleUpdated={onRoleUpdated}
        />
      )}

      {showDeleteModal && selectedRole && (
        <DeleteRoleModal
          isOpen={showDeleteModal}
          role={selectedRole}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedRole(null);
          }}
          onRoleDeleted={onRoleDeleted}
        />
      )}

      {showAssignModal && selectedRole && (
        <UserRoleAssignmentModal
          isOpen={showAssignModal}
          role={selectedRole}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedRole(null);
          }}
          onUsersUpdated={refetch}
        />
      )}
    </div>
  );
}