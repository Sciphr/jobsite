"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Edit2, Trash2, GripVertical, AlertTriangle } from "lucide-react";

export default function JobScreeningQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const jobId = params.id;

  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Fetch job details
  const { data: jobData } = useQuery({
    queryKey: ["admin-job", jobId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/jobs/${jobId}`);
      if (!response.ok) throw new Error("Failed to fetch job");
      return response.json();
    },
  });

  // Fetch screening questions
  const { data: questionsData, isLoading } = useQuery({
    queryKey: ["job-screening-questions", jobId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/jobs/${jobId}/screening-questions`);
      if (!response.ok) throw new Error("Failed to fetch questions");
      return response.json();
    },
  });

  const questions = questionsData?.questions || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (questionId) => {
      const response = await fetch(
        `/api/admin/jobs/${jobId}/screening-questions/${questionId}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to delete question");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["job-screening-questions", jobId]);
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async (questionIds) => {
      const response = await fetch(
        `/api/admin/jobs/${jobId}/screening-questions/reorder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionIds }),
        }
      );
      if (!response.ok) throw new Error("Failed to reorder questions");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["job-screening-questions", jobId]);
    },
  });

  const handleDelete = async (questionId) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      await deleteMutation.mutateAsync(questionId);
    } catch (error) {
      alert("Failed to delete question");
    }
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newOrder = [...questions];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    reorderMutation.mutate(newOrder.map((q) => q.id));
  };

  const handleMoveDown = (index) => {
    if (index === questions.length - 1) return;
    const newOrder = [...questions];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    reorderMutation.mutate(newOrder.map((q) => q.id));
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

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-600">
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="hover:text-gray-900"
        >
          Dashboard
        </button>
        <span>/</span>
        <button
          onClick={() => router.push("/admin/jobs")}
          className="hover:text-gray-900"
        >
          Jobs
        </button>
        <span>/</span>
        <button
          onClick={() => router.push(`/admin/jobs/${jobId}/edit`)}
          className="hover:text-gray-900"
        >
          Edit Job
        </button>
        <span>/</span>
        <span className="text-gray-900 font-medium">Screening Questions</span>
      </nav>

      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => router.push(`/admin/jobs/${jobId}/edit`)}
          className="p-2 text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">
            Screening Questions
          </h1>
          <p className="text-gray-600 mt-1">
            {jobData?.job?.title || "Loading..."}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTemplateSelector(true)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Add from Template
          </button>
          <button
            onClick={() => {
              setEditingQuestion(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <Plus className="h-5 w-5" />
            Create Custom Question
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No screening questions yet</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first question
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div
                key={question.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex flex-col gap-1 pt-2">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0 || reorderMutation.isPending}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" />
                      </svg>
                    </button>
                    <GripVertical className="h-5 w-5 text-gray-400" />
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === questions.length - 1 || reorderMutation.isPending}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-gray-500 text-sm">Question {index + 1}</span>
                        <h3 className="font-medium text-gray-900 mt-1">
                          {question.question_text}
                          {question.is_required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </h3>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {getQuestionTypeLabel(question.question_type)}
                      </span>
                    </div>

                    {question.help_text && (
                      <p className="text-sm text-gray-600 mb-2">
                        {question.help_text}
                      </p>
                    )}

                    {question.options && (
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Options:</span>{" "}
                        {JSON.parse(question.options).join(", ")}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={() => {
                          setEditingQuestion(question);
                          setShowModal(true);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(question.id)}
                        disabled={deleteMutation.isPending}
                        className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <QuestionModal
          jobId={jobId}
          question={editingQuestion}
          onClose={() => {
            setShowModal(false);
            setEditingQuestion(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingQuestion(null);
            queryClient.invalidateQueries(["job-screening-questions", jobId]);
          }}
        />
      )}

      {showTemplateSelector && (
        <TemplateSelectorModal
          jobId={jobId}
          onClose={() => setShowTemplateSelector(false)}
          onSuccess={() => {
            setShowTemplateSelector(false);
            queryClient.invalidateQueries(["job-screening-questions", jobId]);
          }}
        />
      )}
    </div>
  );
}

// Question Modal (simplified - reuse template modal logic from template page)
function QuestionModal({ jobId, question, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    question_text: question?.question_text || "",
    question_type: question?.question_type || "text",
    options: question?.options ? JSON.parse(question.options) : ["", ""],
    is_required: question?.is_required || false,
    placeholder_text: question?.placeholder_text || "",
    help_text: question?.help_text || "",
  });

  const [errors, setErrors] = useState({});
  const [warning, setWarning] = useState(null);
  const [acknowledgeWarning, setAcknowledgeWarning] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const url = question
        ? `/api/admin/jobs/${jobId}/screening-questions/${question.id}`
        : `/api/admin/jobs/${jobId}/screening-questions`;
      const method = question ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (response.status === 409) {
        // Warning about existing applicants
        setWarning(responseData);
        return null;
      }

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to save question");
      }

      return responseData;
    },
    onSuccess: (data) => {
      if (data) onSuccess();
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.question_text.trim()) {
      newErrors.question_text = "Question text is required";
    }

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
      await saveMutation.mutateAsync({
        ...formData,
        acknowledgeWarning: acknowledgeWarning || undefined,
      });
    } catch (error) {
      alert(error.message);
    }
  };

  const showOptions = ["multiple_choice", "checkbox"].includes(formData.question_type);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {question ? "Edit Question" : "Create Question"}
          </h2>

          {warning && (
            <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-orange-900 font-medium">
                    {warning.message}
                  </p>
                  <label className="flex items-center gap-2 mt-3">
                    <input
                      type="checkbox"
                      checked={acknowledgeWarning}
                      onChange={(e) => setAcknowledgeWarning(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-orange-800">
                      I understand and want to proceed
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Similar form fields as in template modal - shortened for brevity */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Question Text *
              </label>
              <textarea
                value={formData.question_text}
                onChange={(e) =>
                  setFormData({ ...formData, question_text: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {errors.question_text && (
                <p className="text-red-500 text-sm mt-1">{errors.question_text}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Question Type *</label>
              <select
                value={formData.question_type}
                onChange={(e) =>
                  setFormData({ ...formData, question_type: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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

            {showOptions && (
              <div>
                <label className="block text-sm font-medium mb-2">Options *</label>
                {formData.options.map((option, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...formData.options];
                        newOptions[index] = e.target.value;
                        setFormData({ ...formData, options: newOptions });
                      }}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    {formData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newOptions = formData.options.filter((_, i) => i !== index);
                          setFormData({ ...formData, options: newOptions });
                        }}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, options: [...formData.options, ""] })
                  }
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  + Add Option
                </button>
                {errors.options && (
                  <p className="text-red-500 text-sm mt-1">{errors.options}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                Help Text (Optional)
              </label>
              <textarea
                value={formData.help_text}
                onChange={(e) => setFormData({ ...formData, help_text: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_required"
                checked={formData.is_required}
                onChange={(e) =>
                  setFormData({ ...formData, is_required: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_required" className="text-sm font-medium">
                Required Question
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending || (warning && !acknowledgeWarning)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-gray-400"
              >
                {saveMutation.isPending ? "Saving..." : "Save Question"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Template Selector Modal (simplified)
function TemplateSelectorModal({ jobId, onClose, onSuccess }) {
  const { data, isLoading } = useQuery({
    queryKey: ["question-templates"],
    queryFn: async () => {
      const response = await fetch("/api/admin/question-templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      return response.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (template) => {
      const response = await fetch(`/api/admin/jobs/${jobId}/screening-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_text: template.question_text,
          question_type: template.question_type,
          options: template.options ? JSON.parse(template.options) : null,
          is_required: template.is_required,
          placeholder_text: template.placeholder_text,
          help_text: template.help_text,
          created_from_template_id: template.id,
        }),
      });
      if (!response.ok) throw new Error("Failed to add question");
      return response.json();
    },
    onSuccess,
  });

  const templates = data?.templates || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Select Template
          </h2>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No templates available</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {template.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {template.question_text}
                  </p>
                  <button
                    onClick={() => addMutation.mutate(template)}
                    disabled={addMutation.isPending}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:bg-gray-400"
                  >
                    {addMutation.isPending ? "Adding..." : "Add to Job"}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
