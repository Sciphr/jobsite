"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Power, 
  PowerOff,
  Mail,
  Clock,
  Settings,
  AlertCircle,
  CheckCircle,
  Zap,
  ArrowRight,
  Eye
} from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";

const STATUS_OPTIONS = [
  { value: 'Applied', label: 'Applied', color: 'blue' },
  { value: 'Reviewing', label: 'Under Review', color: 'yellow' },
  { value: 'Interview', label: 'Interview', color: 'green' },
  { value: 'Hired', label: 'Hired', color: 'emerald' },
  { value: 'Rejected', label: 'Rejected', color: 'red' },
];

const TRIGGER_TYPES = [
  { value: 'status_change', label: 'Status Change', description: 'When application status changes' },
  { value: 'application_created', label: 'Application Created', description: 'When new application is submitted' },
];

const CONDITION_TYPES = [
  { value: 'to_status', label: 'Changes to Status', description: 'Triggers when status changes to specific value' },
  { value: 'from_to', label: 'Specific Status Change', description: 'Triggers on specific from → to status change' },
  { value: 'from_any_to', label: 'Any Status to Specific', description: 'Triggers when any status changes to specific value' },
];

export default function AutomationManagement() {
  const { getButtonClasses, getStatCardClasses } = useThemeClasses();
  
  // State
  const [rules, setRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    trigger: 'status_change',
    conditions: { type: 'to_status', toStatus: '' },
    template_id: '',
    is_active: true,
  });

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rulesRes, templatesRes] = await Promise.all([
        fetch('/api/admin/automation/email-rules'),
        fetch('/api/admin/communication/templates'),
      ]);

      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setRules(rulesData);
      }

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        const templates = templatesData.data || templatesData;
        setTemplates(Array.isArray(templates) ? templates.filter(t => t.isActive) : []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      trigger: 'status_change',
      conditions: { type: 'to_status', toStatus: '' },
      template_id: '',
      is_active: true,
    });
    setShowCreateModal(true);
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      trigger: rule.trigger,
      conditions: rule.conditions || { type: 'to_status', toStatus: '' },
      template_id: rule.template_id,
      is_active: rule.is_active,
    });
    setShowCreateModal(true);
  };

  const handleSaveRule = async () => {
    try {
      const url = editingRule 
        ? `/api/admin/automation/email-rules/${editingRule.id}`
        : '/api/admin/automation/email-rules';
      
      const method = editingRule ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateModal(false);
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to save rule');
      }
    } catch (error) {
      console.error('Error saving rule:', error);
      alert('Failed to save rule');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) return;

    try {
      const response = await fetch(`/api/admin/automation/email-rules/${ruleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchData();
      } else {
        alert('Failed to delete rule');
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('Failed to delete rule');
    }
  };

  const handleToggleRule = async (rule) => {
    try {
      const response = await fetch(`/api/admin/automation/email-rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !rule.is_active }),
      });

      if (response.ok) {
        await fetchData();
      } else {
        alert('Failed to toggle rule');
      }
    } catch (error) {
      console.error('Error toggling rule:', error);
      alert('Failed to toggle rule');
    }
  };

  const getTemplate = (templateId) => {
    return templates.find(t => t.id === templateId);
  };

  const formatConditions = (trigger, conditions) => {
    if (trigger === 'status_change') {
      if (conditions.type === 'to_status') {
        const status = STATUS_OPTIONS.find(s => s.value === conditions.toStatus);
        return `When status changes to ${status?.label || conditions.toStatus}`;
      }
      if (conditions.type === 'from_to') {
        const fromStatus = STATUS_OPTIONS.find(s => s.value === conditions.fromStatus);
        const toStatus = STATUS_OPTIONS.find(s => s.value === conditions.toStatus);
        return `When status changes from ${fromStatus?.label || conditions.fromStatus} to ${toStatus?.label || conditions.toStatus}`;
      }
      if (conditions.type === 'from_any_to') {
        const toStatus = STATUS_OPTIONS.find(s => s.value === conditions.toStatus);
        return `When any status changes to ${toStatus?.label || conditions.toStatus}`;
      }
    }
    return 'When application is created';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold admin-text">Email Automation</h1>
          <p className="admin-text-light mt-1">
            Automatically send emails when application statuses change
          </p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCreateRule}
          className={`${getButtonClasses("primary")} flex items-center space-x-2`}
        >
          <Plus className="h-4 w-4" />
          <span>Create Rule</span>
        </motion.button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`admin-card p-6 rounded-lg shadow ${getStatCardClasses(0).border} ${getStatCardClasses(0).hover}`}
        >
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${getStatCardClasses(0).bg}`}>
              <Zap className={`h-6 w-6 ${getStatCardClasses(0).icon}`} />
            </div>
            <div>
              <p className="text-2xl font-bold admin-text">{rules.length}</p>
              <p className="admin-text-light text-sm">Total Rules</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`admin-card p-6 rounded-lg shadow ${getStatCardClasses(1).border} ${getStatCardClasses(1).hover}`}
        >
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${getStatCardClasses(1).bg}`}>
              <CheckCircle className={`h-6 w-6 ${getStatCardClasses(1).icon}`} />
            </div>
            <div>
              <p className="text-2xl font-bold admin-text">
                {rules.filter(r => r.is_active).length}
              </p>
              <p className="admin-text-light text-sm">Active Rules</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className={`admin-card p-6 rounded-lg shadow ${getStatCardClasses(2).border} ${getStatCardClasses(2).hover}`}
        >
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${getStatCardClasses(2).bg}`}>
              <Mail className={`h-6 w-6 ${getStatCardClasses(2).icon}`} />
            </div>
            <div>
              <p className="text-2xl font-bold admin-text">{templates.length}</p>
              <p className="admin-text-light text-sm">Available Templates</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Rules List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="admin-card rounded-lg shadow overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold admin-text">Automation Rules</h2>
        </div>

        {rules.length === 0 ? (
          <div className="text-center py-12">
            <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium admin-text mb-2">No automation rules</h3>
            <p className="admin-text-light mb-4">
              Create your first automation rule to start sending emails automatically
            </p>
            <button
              onClick={handleCreateRule}
              className={`${getButtonClasses("primary")} flex items-center space-x-2 mx-auto`}
            >
              <Plus className="h-4 w-4" />
              <span>Create First Rule</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {rules.map((rule, index) => {
              const template = getTemplate(rule.template_id);
              
              return (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${rule.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                          {rule.is_active ? 
                            <CheckCircle className="h-5 w-5 text-green-600" /> :
                            <Clock className="h-5 w-5 text-gray-400" />
                          }
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-semibold admin-text">{rule.name}</h3>
                          <div className="flex items-center space-x-2 text-sm admin-text-light mt-1">
                            <span>{formatConditions(rule.trigger, rule.conditions)}</span>
                            <ArrowRight className="h-3 w-3" />
                            <span>Send "{template?.name || 'Unknown Template'}"</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleToggleRule(rule)}
                        className={`p-2 rounded-lg transition-colors ${
                          rule.is_active 
                            ? 'text-green-600 hover:bg-green-100' 
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={rule.is_active ? 'Disable rule' : 'Enable rule'}
                      >
                        {rule.is_active ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleEditRule(rule)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Edit rule"
                      >
                        <Edit className="h-4 w-4" />
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete rule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="admin-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold admin-text">
                  {editingRule ? 'Edit Automation Rule' : 'Create Automation Rule'}
                </h3>
              </div>

              <div className="p-6 space-y-6">
                {/* Rule Name */}
                <div>
                  <label className="block text-sm font-medium admin-text mb-2">
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Send interview invitation when status changes to Interview"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Trigger Type */}
                <div>
                  <label className="block text-sm font-medium admin-text mb-2">
                    Trigger Event *
                  </label>
                  <select
                    value={formData.trigger}
                    onChange={(e) => setFormData({...formData, trigger: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {TRIGGER_TYPES.map(trigger => (
                      <option key={trigger.value} value={trigger.value}>
                        {trigger.label} - {trigger.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conditions */}
                {formData.trigger === 'status_change' && (
                  <div>
                    <label className="block text-sm font-medium admin-text mb-2">
                      Condition Type *
                    </label>
                    <select
                      value={formData.conditions.type}
                      onChange={(e) => setFormData({
                        ...formData, 
                        conditions: { ...formData.conditions, type: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
                    >
                      {CONDITION_TYPES.map(condition => (
                        <option key={condition.value} value={condition.value}>
                          {condition.label} - {condition.description}
                        </option>
                      ))}
                    </select>

                    {/* Status Selectors */}
                    <div className="space-y-4">
                      {(formData.conditions.type === 'from_to' || formData.conditions.type === 'from_status') && (
                        <div>
                          <label className="block text-sm font-medium admin-text mb-2">
                            From Status
                          </label>
                          <select
                            value={formData.conditions.fromStatus || ''}
                            onChange={(e) => setFormData({
                              ...formData, 
                              conditions: { ...formData.conditions, fromStatus: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select status...</option>
                            {STATUS_OPTIONS.map(status => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {(formData.conditions.type === 'to_status' || formData.conditions.type === 'from_to' || formData.conditions.type === 'from_any_to') && (
                        <div>
                          <label className="block text-sm font-medium admin-text mb-2">
                            To Status
                          </label>
                          <select
                            value={formData.conditions.toStatus || ''}
                            onChange={(e) => setFormData({
                              ...formData, 
                              conditions: { ...formData.conditions, toStatus: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select status...</option>
                            {STATUS_OPTIONS.map(status => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Email Template */}
                <div>
                  <label className="block text-sm font-medium admin-text mb-2">
                    Email Template *
                  </label>
                  <select
                    value={formData.template_id}
                    onChange={(e) => setFormData({...formData, template_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select template...</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    Rule is active
                  </label>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRule}
                  disabled={!formData.name || !formData.template_id || (formData.trigger === 'status_change' && !formData.conditions.toStatus)}
                  className={`px-6 py-2 rounded-lg text-white ${getButtonClasses("primary")} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}