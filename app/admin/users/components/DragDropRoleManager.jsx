"use client";

import { useState, useEffect, useMemo } from "react";
import { DragDropContext, Draggable } from "@hello-pangea/dnd";
import StrictModeDroppable from "./StrictModeDroppable";
import {
  Users,
  Crown,
  Shield,
  ShieldCheck,
  User,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Plus,
  Grip,
} from "lucide-react";

export default function DragDropRoleManager({ 
  users = [], 
  roles = [], 
  onRoleChange,
  isLoading = false 
}) {
  const [mounted, setMounted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [dragState, setDragState] = useState({
    isDragging: false,
    draggedUser: null,
    sourceRole: null,
    destinationRole: null,
  });
  const [feedback, setFeedback] = useState(null);

  // Handle React 18 StrictMode compatibility
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 150); // Give more time for React to settle
    return () => clearTimeout(timer);
  }, []);

  // Organize users by their roles for the column layout
  const usersByRole = useMemo(() => {
    const organized = {};
    
    // Initialize with all roles
    roles.forEach(role => {
      organized[role.id] = {
        role,
        users: []
      };
    });

    // Add unassigned column for users with no roles
    organized['unassigned'] = {
      role: { 
        id: 'unassigned', 
        name: 'Unassigned', 
        color: '#6B7280',
        description: 'Users without any assigned roles' 
      },
      users: []
    };

    // Organize users into their role columns
    users.forEach(user => {
      const userRoles = user.user_roles || [];
      
      if (userRoles.length === 0) {
        // User has no roles
        organized['unassigned'].users.push(user);
      } else {
        // User has roles - add to each role column
        userRoles.forEach(userRole => {
          const roleId = userRole.roles.id;
          if (organized[roleId]) {
            organized[roleId].users.push(user);
          }
        });
      }
    });

    return organized;
  }, [users, roles]);

  const getRoleIcon = (roleName) => {
    const name = roleName?.toLowerCase();
    if (name?.includes('super') || name?.includes('admin')) return Crown;
    if (name?.includes('hr')) return ShieldCheck;
    if (name?.includes('manager')) return Shield;
    return User;
  };

  const handleDragStart = (start) => {
    const user = users.find(u => u.id === start.draggableId);
    const sourceRoleId = start.source.droppableId;
    
    setDragState({
      isDragging: true,
      draggedUser: user,
      sourceRole: sourceRoleId,
      destinationRole: null,
    });
  };

  const handleDragUpdate = (update) => {
    setDragState(prev => ({
      ...prev,
      destinationRole: update.destination?.droppableId || null,
    }));
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    
    // Reset drag state
    setDragState({
      isDragging: false,
      draggedUser: null,
      sourceRole: null,
      destinationRole: null,
    });

    // If dropped outside a droppable area
    if (!destination) {
      return;
    }

    // If dropped in the same position
    if (destination.droppableId === source.droppableId) {
      return;
    }

    const userId = draggableId;
    const sourceRoleId = source.droppableId;
    const destRoleId = destination.droppableId;

    try {
      // Handle different scenarios
      if (sourceRoleId === 'unassigned' && destRoleId !== 'unassigned') {
        // Adding role to unassigned user
        await handleRoleAssignment(userId, destRoleId, 'add');
      } else if (sourceRoleId !== 'unassigned' && destRoleId === 'unassigned') {
        // Removing role (moving to unassigned)
        await handleRoleAssignment(userId, sourceRoleId, 'remove');
      } else if (sourceRoleId !== 'unassigned' && destRoleId !== 'unassigned') {
        // Moving between roles - remove from source and add to destination
        await handleRoleAssignment(userId, sourceRoleId, 'remove');
        await handleRoleAssignment(userId, destRoleId, 'add');
      }
    } catch (error) {
      console.error('Drag and drop role assignment error:', error);
      showFeedback('error', 'Failed to update user roles. Please try again.');
    }
  };

  const handleRoleAssignment = async (userId, roleId, action) => {
    try {
      const user = users.find(u => u.id === userId);
      const role = roles.find(r => r.id === roleId) || { name: 'Unknown Role' };
      
      await onRoleChange(userId, roleId, action);
      
      const actionText = action === 'add' ? 'assigned to' : 'removed from';
      showFeedback('success', `${user.firstName} ${user.lastName} successfully ${actionText} ${role.name} role`);
    } catch (error) {
      throw error;
    }
  };

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Prevent rendering during React StrictMode double-mounting
  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
          <p className="mt-2 text-sm text-gray-600">Loading drag & drop interface...</p>
        </div>
      </div>
    );
  }

  // If there's an error, show fallback message
  if (hasError) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-yellow-800 mb-2">
            Drag & Drop Not Available
          </h3>
          <p className="text-sm text-yellow-700 mb-4">
            The drag-and-drop interface is not compatible with your current setup. 
            Please use the "Having issues? Switch to simple mode" button below to access 
            the alternative interactive role management interface.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
          <p className="mt-2 text-sm text-gray-600">Loading role management interface...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Visual Role Assignment</h3>
          <p className="text-sm text-gray-600 mt-1">
            Drag and drop users between role columns to assign or remove roles
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <Grip className="h-4 w-4" />
          <span>Drag users to manage roles</span>
        </div>
      </div>

      {/* Feedback Messages */}
      {feedback && (
        <div className={`p-3 rounded-lg flex items-center space-x-2 ${
          feedback.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          <span className="text-sm">{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Drag and Drop Interface */}
      <div
        onError={() => {
          console.warn('Drag and drop error detected, switching to fallback');
          setHasError(true);
        }}
      >
        <DragDropContext
          onDragStart={handleDragStart}
          onDragUpdate={handleDragUpdate}
          onDragEnd={handleDragEnd}
        >
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {Object.entries(usersByRole).map(([roleId, { role, users: roleUsers }]) => {
            const RoleIcon = getRoleIcon(role.name);
            const isDestination = dragState.destinationRole === roleId;
            const isSource = dragState.sourceRole === roleId;
            
            return (
              <div
                key={roleId}
                className={`bg-white rounded-lg border-2 transition-all duration-200 ${
                  isDestination 
                    ? 'border-purple-400 bg-purple-50 shadow-lg' 
                    : isSource
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Role Header */}
                <div className="p-4 border-b border-gray-200">
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
                      <h4 className="font-medium text-gray-900">{role.name}</h4>
                      <p className="text-xs text-gray-500">
                        {roleUsers.length} user{roleUsers.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {role.description && (
                    <p className="text-xs text-gray-600 mt-2">{role.description}</p>
                  )}
                </div>

                {/* Droppable Area */}
                <StrictModeDroppable droppableId={roleId}>
                  {(provided, snapshot) => {
                    return (
                      <div
                        ref={provided.ref}
                        {...provided.droppableProps}
                        className={`p-2 min-h-[200px] transition-colors duration-200 ${
                          snapshot.isDraggedOver 
                            ? 'bg-purple-100' 
                            : 'bg-gray-50'
                        }`}
                      >
                      <div className="space-y-2">
                        {roleUsers.map((user, index) => (
                          <Draggable
                            key={user.id}
                            draggableId={String(user.id)}
                            index={index}
                          >
                            {(provided, snapshot) => {
                              return (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-3 bg-white rounded-lg border border-gray-200 shadow-sm transition-all duration-200 cursor-grab active:cursor-grabbing ${
                                    snapshot.isDragging 
                                      ? 'shadow-lg rotate-2 border-purple-300' 
                                      : 'hover:shadow-md hover:border-gray-300'
                                  }`}
                                >
                                <div className="flex items-center space-x-3">
                                  <div className="flex-shrink-0">
                                    <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                      {user.firstName?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {user.firstName} {user.lastName}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                      {user.email}
                                    </p>
                                  </div>
                                  {/* Show multiple role indicators */}
                                  {user.user_roles && user.user_roles.length > 1 && (
                                    <div className="flex-shrink-0">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        +{user.user_roles.length - 1}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex-shrink-0">
                                    <Grip className="h-4 w-4 text-gray-400" />
                                  </div>
                                </div>
                              </div>
                              );
                            }}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        {/* Empty state */}
                        {roleUsers.length === 0 && (
                          <div className="text-center py-8">
                            <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">
                              {roleId === 'unassigned' 
                                ? 'No unassigned users'
                                : `No users with ${role.name} role`
                              }
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Drop users here to assign
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  }}
                </StrictModeDroppable>
              </div>
            );
          })}
        </div>
        </DragDropContext>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="p-1 bg-blue-100 rounded">
              <AlertCircle className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How to use:</p>
            <ul className="space-y-1 text-blue-700">
              <li>• Drag users between columns to assign or remove roles</li>
              <li>• Drop users in "Unassigned" to remove all roles</li>
              <li>• Users can have multiple roles - they'll appear in multiple columns</li>
              <li>• Changes are applied immediately and can't be undone</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}