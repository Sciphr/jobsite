"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Eye, Search } from "lucide-react";

export default function QuestionTemplatesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // Fetch templates
  const { data, isLoading } = useQuery({
    queryKey: ["question-templates"],
    queryFn: async () => {
      const response = await fetch("/api/admin/question-templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      return response.json();
    },
  });

  const templates = data?.templates || [];

  // Filter templates based on search
  const filteredTemplates = templates.filter(
    (t) =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.question_text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await fetch(`/api/admin/question-templates/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["question-templates"]);
    },
  });

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      alert("Failed to delete template");
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingTemplate(null);
  };

  const getQuestionTypeLabel = (type) => {
    const labels = {
      text: "Short Text",
      textarea: "Long Text",
      multiple_choice: "Multiple Choice",
      checkbox: "Checkboxes",
      yes_no: "Yes/No",
      file_upload: "File Upload",
      date: "Date",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Question Templates
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Create and manage reusable screening question templates
        </p>
      </div>

      {/* Search and Create */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create Template
        </button>
      </div>

      {/* Templates List */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchTerm ? "No templates found" : "No templates yet"}
          </p>
          {!searchTerm && (
            <button
              onClick={handleCreate}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first template
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {template.title}
                  </h3>
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                    {getQuestionTypeLabel(template.question_type)}
                  </span>
                </div>
                {template.is_required && (
                  <span className="text-red-500 text-sm">Required</span>
                )}
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {template.question_text}
              </p>

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                <span>Used {template.usage_count || 0} times</span>
                {template.last_used_at && (
                  <span>
                    Last used: {new Date(template.last_used_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewTemplate(template)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </button>
                <button
                  onClick={() => handleEdit(template)}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  disabled={deleteMutation.isPending}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <TemplateModal
          template={editingTemplate}
          onClose={handleModalClose}
          onSuccess={() => {
            handleModalClose();
            queryClient.invalidateQueries(["question-templates"]);
          }}
        />
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  );
}

// Template Modal Component
function TemplateModal({ template, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: template?.title || "",
    question_text: template?.question_text || "",
    question_type: template?.question_type || "text",
    options: template?.options ? JSON.parse(template.options) : ["", ""],
    is_required: template?.is_required || false,
    placeholder_text: template?.placeholder_text || "",
    help_text: template?.help_text || "",
  });

  const [errors, setErrors] = useState({});

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const url = template
        ? `/api/admin/question-templates/${template.id}`
        : "/api/admin/question-templates";
      const method = template ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save template");
      }

      return response.json();
    },
    onSuccess,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.question_text.trim()) newErrors.question_text = "Question text is required";

    if (["multiple_choice", "checkbox"].includes(formData.question_type)) {
      const validOptions = formData.options.filter((o) => o.trim());
      if (validOptions.length < 2) {
        newErrors.options = "At least 2 options are required";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await saveMutation.mutateAsync(formData);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    setFormData({ ...formData, options: [...formData.options, ""] });
  };

  const removeOption = (index) => {
    if (formData.options.length <= 2) {
      alert("Must have at least 2 options");
      return;
    }
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({ ...formData, options: newOptions });
  };

  const showOptions = ["multiple_choice", "checkbox"].includes(formData.question_type);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {template ? "Edit Template" : "Create Template"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Title (Internal Name) *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            {/* Question Text */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Question Text *
              </label>
              <textarea
                value={formData.question_text}
                onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              {errors.question_text && <p className="text-red-500 text-sm mt-1">{errors.question_text}</p>}
            </div>

            {/* Question Type */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Question Type *
              </label>
              <select
                value={formData.question_type}
                onChange={(e) => setFormData({ ...formData, question_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="text">Short Text</option>
                <option value="textarea">Long Text</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="checkbox">Checkboxes</option>
                <option value="yes_no">Yes/No</option>
                <option value="file_upload">File Upload</option>
                <option value="date">Date</option>
              </select>
            </div>

            {/* Options (for multiple choice/checkbox) */}
            {showOptions && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Options *
                </label>
                {formData.options.map((option, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    {formData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addOption}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  + Add Option
                </button>
                {errors.options && <p className="text-red-500 text-sm mt-1">{errors.options}</p>}
              </div>
            )}

            {/* Placeholder */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Placeholder Text (Optional)
              </label>
              <input
                type="text"
                value={formData.placeholder_text}
                onChange={(e) => setFormData({ ...formData, placeholder_text: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Help Text */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Help Text (Optional)
              </label>
              <textarea
                value={formData.help_text}
                onChange={(e) => setFormData({ ...formData, help_text: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Required Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_required"
                checked={formData.is_required}
                onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_required" className="text-sm font-medium">
                Required Question
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400"
              >
                {saveMutation.isPending ? "Saving..." : "Save Template"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Preview Modal Component
function PreviewModal({ template, onClose }) {
  const options = template.options ? JSON.parse(template.options) : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Preview: {template.title}
        </h2>

        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <label className="block text-sm font-medium mb-2">
            {template.question_text}
            {template.is_required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {template.help_text && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {template.help_text}
            </p>
          )}

          {template.question_type === "text" && (
            <input
              type="text"
              placeholder={template.placeholder_text || ""}
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
          )}

          {template.question_type === "textarea" && (
            <textarea
              placeholder={template.placeholder_text || ""}
              disabled
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
          )}

          {template.question_type === "multiple_choice" && (
            <div className="space-y-2">
              {options.map((option, index) => (
                <label key={index} className="flex items-center space-x-2">
                  <input type="radio" disabled className="w-4 h-4" />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          )}

          {template.question_type === "checkbox" && (
            <div className="space-y-2">
              {options.map((option, index) => (
                <label key={index} className="flex items-center space-x-2">
                  <input type="checkbox" disabled className="w-4 h-4" />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          )}

          {template.question_type === "yes_no" && (
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input type="radio" disabled className="w-4 h-4" />
                <span>Yes</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="radio" disabled className="w-4 h-4" />
                <span>No</span>
              </label>
            </div>
          )}

          {template.question_type === "date" && (
            <input
              type="date"
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
          )}

          {template.question_type === "file_upload" && (
            <input
              type="file"
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Close Preview
        </button>
      </div>
    </div>
  );
}
