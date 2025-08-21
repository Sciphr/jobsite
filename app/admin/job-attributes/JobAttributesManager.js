'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const ATTRIBUTE_TYPES = {
  employment_types: {
    name: 'Employment Types',
    singular: 'Employment Type',
    icon: '💼',
    color: 'blue'
  },
  experience_levels: {
    name: 'Experience Levels', 
    singular: 'Experience Level',
    icon: '🏆',
    color: 'green'
  },
  remote_policies: {
    name: 'Remote Policies',
    singular: 'Remote Policy', 
    icon: '🏠',
    color: 'purple'
  }
};

// API functions
const fetchAttributeType = async (type) => {
  const response = await fetch(`/api/admin/${type.replace('_', '-')}?includeInactive=true`);
  if (!response.ok) throw new Error('Failed to fetch attributes');
  return response.json();
};

const fetchAllAttributes = async () => {
  const [employmentTypes, experienceLevels, remotePolicies] = await Promise.all([
    fetchAttributeType('employment_types'),
    fetchAttributeType('experience_levels'),
    fetchAttributeType('remote_policies')
  ]);

  return {
    employment_types: employmentTypes,
    experience_levels: experienceLevels,
    remote_policies: remotePolicies
  };
};

const updateAttribute = async ({ type, id, data }) => {
  const endpoint = `/api/admin/${type.replace('_', '-')}/${id}`;
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update');
  }

  return response.json();
};

const createAttribute = async ({ type, data }) => {
  const endpoint = `/api/admin/${type.replace('_', '-')}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create');
  }

  return response.json();
};

const deleteAttribute = async ({ type, id }) => {
  const endpoint = `/api/admin/${type.replace('_', '-')}/${id}`;
  const response = await fetch(endpoint, { method: 'DELETE' });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete');
  }

  return response.json();
};

// Sortable Attribute Item Component
function SortableAttributeItem({ attribute, onEdit, onToggleStatus, onDelete, type }) {
  const {
    attributes: sortableAttributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: attribute.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...sortableAttributes}
      className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
        attribute.is_active
          ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
          : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-60'
      } ${isDragging ? 'shadow-lg scale-105' : 'hover:shadow-md'}`}
    >
      <div className="flex items-center gap-3 flex-1">
        <div
          {...listeners}
          className="cursor-grab hover:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className={`font-semibold ${
              attribute.is_active 
                ? 'text-gray-900 dark:text-white' 
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {attribute.name}
            </h3>
            {!attribute.is_active && (
              <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-full">
                Inactive
              </span>
            )}
          </div>
          {attribute.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {attribute.description}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggleStatus(type, attribute)}
          className={`p-2 rounded-lg transition-colors ${
            attribute.is_active
              ? 'text-orange-600 hover:bg-orange-100 dark:text-orange-400 dark:hover:bg-orange-900/20'
              : 'text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/20'
          }`}
          title={attribute.is_active ? 'Deactivate' : 'Activate'}
        >
          {attribute.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button
          onClick={() => onEdit(type, attribute)}
          className="p-2 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          title="Edit"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(type, attribute)}
          className="p-2 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function AttributeTypeCard({ type, config, attributes, onAdd, onEdit, onToggleStatus, onDelete, onReorder }) {
  const [showInactive, setShowInactive] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const activeAttributes = attributes.filter(attr => attr.is_active);
  const inactiveAttributes = attributes.filter(attr => !attr.is_active);
  const displayedAttributes = showInactive ? attributes : activeAttributes;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-colors duration-200">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{config.icon}</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {config.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {activeAttributes.length} active, {inactiveAttributes.length} inactive
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {inactiveAttributes.length > 0 && (
              <button
                onClick={() => setShowInactive(!showInactive)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showInactive
                    ? 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {showInactive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showInactive ? 'Hide' : 'Show'} Inactive
              </button>
            )}
            <button
              onClick={() => onAdd(type)}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm bg-${config.color}-600 hover:bg-${config.color}-700 text-white rounded-lg transition-colors font-medium whitespace-nowrap`}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add {config.singular}</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {displayedAttributes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No {showInactive ? '' : 'active '}attributes found
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => onReorder(type, event)}
          >
            <SortableContext
              items={displayedAttributes.map(attr => attr.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {displayedAttributes
                  .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
                  .map((attribute) => (
                    <SortableAttributeItem
                      key={attribute.id}
                      attribute={attribute}
                      type={type}
                      onEdit={onEdit}
                      onToggleStatus={onToggleStatus}
                      onDelete={onDelete}
                    />
                  ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function AttributeModal({ isOpen, onClose, type, attribute, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    sort_order: 0
  });

  const config = ATTRIBUTE_TYPES[type];
  const isEdit = !!attribute;

  useEffect(() => {
    if (attribute) {
      setFormData({
        name: attribute.name || '',
        description: attribute.description || '',
        is_active: attribute.is_active ?? true,
        sort_order: attribute.sort_order || 0
      });
    } else {
      setFormData({
        name: '',
        description: '',
        is_active: true,
        sort_order: 0
      });
    }
  }, [attribute, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSave(type, attribute?.id, formData);
      onClose();
    } catch (error) {
      console.error('Error saving attribute:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? 'Edit' : 'Add'} {config?.singular}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>


          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Active
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function JobAttributesManager() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalAttribute, setModalAttribute] = useState(null);
  const queryClient = useQueryClient();

  // Fetch all attributes
  const { data: attributes = {}, isLoading } = useQuery({
    queryKey: ['job-attributes'],
    queryFn: fetchAllAttributes
  });

  // Toggle status mutation with optimistic update
  const toggleStatusMutation = useMutation({
    mutationFn: updateAttribute,
    onMutate: async ({ type, id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['job-attributes'] });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['job-attributes']);
      
      // Optimistically update
      queryClient.setQueryData(['job-attributes'], (old) => {
        if (!old) return old;
        
        return {
          ...old,
          [type]: old[type].map(attr => 
            attr.id === id 
              ? { ...attr, is_active: data.is_active }
              : attr
          )
        };
      });
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['job-attributes'], context.previousData);
      alert('Failed to update status: ' + err.message);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['job-attributes'] });
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createAttribute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-attributes'] });
    },
    onError: (err) => {
      alert('Failed to create: ' + err.message);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: updateAttribute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-attributes'] });
    },
    onError: (err) => {
      alert('Failed to update: ' + err.message);
    }
  });

  // Delete mutation with optimistic update
  const deleteMutation = useMutation({
    mutationFn: deleteAttribute,
    onMutate: async ({ type, id }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['job-attributes'] });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['job-attributes']);
      
      // Optimistically remove
      queryClient.setQueryData(['job-attributes'], (old) => {
        if (!old) return old;
        
        return {
          ...old,
          [type]: old[type].filter(attr => attr.id !== id)
        };
      });
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['job-attributes'], context.previousData);
      alert('Failed to delete: ' + err.message);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['job-attributes'] });
    }
  });

  // Reorder mutation with optimistic update
  const reorderMutation = useMutation({
    mutationFn: async ({ type, reorderedItems }) => {
      // Update sort_order for each item
      const updates = reorderedItems.map((item, index) => 
        updateAttribute({ 
          type, 
          id: item.id, 
          data: { ...item, sort_order: index } 
        })
      );
      return Promise.all(updates);
    },
    onMutate: async ({ type, reorderedItems }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['job-attributes'] });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['job-attributes']);
      
      // Optimistically update
      queryClient.setQueryData(['job-attributes'], (old) => {
        if (!old) return old;
        
        return {
          ...old,
          [type]: reorderedItems.map((item, index) => ({
            ...item,
            sort_order: index
          }))
        };
      });
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['job-attributes'], context.previousData);
      alert('Failed to reorder: ' + err.message);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['job-attributes'] });
    }
  });

  const handleAdd = (type) => {
    setModalType(type);
    setModalAttribute(null);
    setModalOpen(true);
  };

  const handleEdit = (type, attribute) => {
    setModalType(type);
    setModalAttribute(attribute);
    setModalOpen(true);
  };

  const handleSave = async (type, id, data) => {
    if (id) {
      await updateMutation.mutateAsync({ type, id, data });
    } else {
      await createMutation.mutateAsync({ type, data });
    }
  };

  const handleToggleStatus = (type, attribute) => {
    toggleStatusMutation.mutate({
      type,
      id: attribute.id,
      data: {
        ...attribute,
        is_active: !attribute.is_active
      }
    });
  };

  const handleDelete = (type, attribute) => {
    if (!confirm(`Are you sure you want to delete "${attribute.name}"?`)) {
      return;
    }

    deleteMutation.mutate({ type, id: attribute.id });
  };

  const handleReorder = (type, event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const currentAttributes = attributes[type] || [];
    const oldIndex = currentAttributes.findIndex(attr => attr.id === active.id);
    const newIndex = currentAttributes.findIndex(attr => attr.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reorderedItems = arrayMove(currentAttributes, oldIndex, newIndex);
    
    reorderMutation.mutate({
      type,
      reorderedItems
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading attributes...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-fit">
      {Object.entries(ATTRIBUTE_TYPES).map(([type, config]) => (
        <AttributeTypeCard
          key={type}
          type={type}
          config={config}
          attributes={attributes[type] || []}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
          onReorder={handleReorder}
        />
      ))}

      <AttributeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        type={modalType}
        attribute={modalAttribute}
        onSave={handleSave}
      />
    </div>
  );
}