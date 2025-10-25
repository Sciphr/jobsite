"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Edit2, Trash2, GripVertical, AlertTriangle, CheckCircle, Info, X, Save } from "lucide-react";

export default function JobScreeningQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const jobId = params.id;

  const [localQuestions, setLocalQuestions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [isNewJob, setIsNewJob] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Check if this is a newly created job (coming from create flow)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const newJobFlag = sessionStorage.getItem('newJobScreeningSetup');
      if (newJobFlag === jobId) {
        setIsNewJob(true);
        sessionStorage.removeItem('newJobScreeningSetup');
      }
    }
  }, [jobId]);

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

  // Sync fetched questions to local state
  useEffect(() => {
    if (questionsData?.questions) {
      setLocalQuestions(questionsData.questions.map(q => ({
        ...q,
        _localId: q.id || `temp-${Date.now()}-${Math.random()}`,
        _isNew: false,
      })));
    }
  }, [questionsData]);

  // Save all changes mutation
  const saveAllMutation = useMutation({
    mutationFn: async (questions) => {
      const response = await fetch(`/api/admin/jobs/${jobId}/screening-questions/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      if (!response.ok) throw new Error("Failed to save questions");
      return response.json();
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries(["job-screening-questions", jobId]);
    },
  });

  const handleAddQuestion = (questionData) => {
    const newQuestion = {
      ...questionData,
      _localId: `temp-${Date.now()}-${Math.random()}`,
      _isNew: true,
      id: null,
      sort_order: localQuestions.length * 10,
    };
    setLocalQuestions([...localQuestions, newQuestion]);
    setHasUnsavedChanges(true);
    setShowForm(false);
  };

  const handleUpdateQuestion = (questionData) => {
    setLocalQuestions(localQuestions.map(q =>
      q._localId === editingQuestion._localId
        ? { ...q, ...questionData }
        : q
    ));
    setHasUnsavedChanges(true);
    setShowForm(false);
    setEditingQuestion(null);
  };

  const handleDelete = (localId) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    setLocalQuestions(localQuestions.filter(q => q._localId !== localId));
    setHasUnsavedChanges(true);
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newOrder = [...localQuestions];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setLocalQuestions(newOrder);
    setHasUnsavedChanges(true);
  };

  const handleMoveDown = (index) => {
    if (index === localQuestions.length - 1) return;
    const newOrder = [...localQuestions];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setLocalQuestions(newOrder);
    setHasUnsavedChanges(true);
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setShowForm(true);
    setShowTemplateSelector(false);
  };

  const handleCreateNew = () => {
    setEditingQuestion(null);
    setShowForm(true);
    setShowTemplateSelector(false);
  };

  const handleAddFromTemplate = () => {
    setShowTemplateSelector(true);
    setShowForm(false);
    setEditingQuestion(null);
  };

  const handleAddFromTemplateSuccess = (templateQuestion) => {
    const newQuestion = {
      ...templateQuestion,
      _localId: `temp-${Date.now()}-${Math.random()}`,
      _isNew: true,
      id: null,
      sort_order: localQuestions.length * 10,
    };
    setLocalQuestions([...localQuestions, newQuestion]);
    setHasUnsavedChanges(true);
  };

  const handleSaveAll = async () => {
    try {
      await saveAllMutation.mutateAsync(localQuestions);
    } catch (error) {
      alert("Failed to save questions: " + error.message);
    }
  };

  const handleFinishSetup = async () => {
    if (hasUnsavedChanges) {
      await handleSaveAll();
    }
    router.push("/admin/jobs");
  };

  const handleDone = async () => {
    if (hasUnsavedChanges) {
      await handleSaveAll();
    }
    router.push("/admin/jobs");
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
      {/* New Job Banner */}
      {isNewJob && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900 mb-1">
                Complete Your Job Setup
              </h3>
              <p className="text-sm text-blue-700">
                Add screening questions below to help filter candidates. You can add questions from templates or create custom ones.
                When you're done, click "Save & Finish" at the bottom.
              </p>
            </div>
          </div>
        </div>
      )}

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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push(`/admin/jobs/${jobId}/edit`)}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Screening Questions
            </h1>
            <p className="text-gray-600 mt-1">
              {jobData?.title || "Loading..."}
            </p>
          </div>
        </div>
        {/* Save Button in Header */}
        {hasUnsavedChanges && !showForm && !showTemplateSelector && (
          <button
            onClick={handleSaveAll}
            disabled={saveAllMutation.isPending}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400"
          >
            <Save className="h-5 w-5" />
            {saveAllMutation.isPending ? "Saving..." : "Save All Changes"}
          </button>
        )}
      </div>

      {/* Action Buttons */}
      {!showForm && !showTemplateSelector && (
        <div className="flex gap-3">
          <button
            onClick={handleAddFromTemplate}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Add from Template
          </button>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create Custom Question
          </button>
        </div>
      )}

      {/* In-Page Question Form */}
      {showForm && (
        <QuestionForm
          question={editingQuestion}
          onCancel={() => {
            setShowForm(false);
            setEditingQuestion(null);
          }}
          onSave={editingQuestion ? handleUpdateQuestion : handleAddQuestion}
        />
      )}

      {/* Template Selector */}
      {showTemplateSelector && (
        <TemplateSelector
          onCancel={() => setShowTemplateSelector(false)}
          onSelect={(template) => {
            handleAddFromTemplateSuccess(template);
            setShowTemplateSelector(false);
          }}
        />
      )}

      {/* Questions List */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {localQuestions.length > 0 ? `Questions (${localQuestions.length})` : "No Questions Yet"}
        </h2>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : localQuestions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No screening questions yet</p>
            <button
              onClick={handleCreateNew}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first question
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {localQuestions.map((question, index) => (
              <div
                key={question._localId}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex flex-col gap-1 pt-2">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" />
                      </svg>
                    </button>
                    <GripVertical className="h-5 w-5 text-gray-400" />
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === localQuestions.length - 1}
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
                        {(typeof question.options === 'string' ? JSON.parse(question.options) : question.options).join(", ")}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={() => handleEditQuestion(question)}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(question._localId)}
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

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && !showForm && !showTemplateSelector && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-orange-900 mb-1">
                Unsaved Changes
              </h3>
              <p className="text-sm text-orange-700">
                You have unsaved changes. Click "Save All Changes" above to save your work.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Saved Notice */}
      {!hasUnsavedChanges && !showForm && !showTemplateSelector && localQuestions.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-green-900 mb-1">
                All Changes Saved
              </h3>
              <p className="text-sm text-green-700">
                You have {localQuestions.length} screening question{localQuestions.length !== 1 ? 's' : ''} configured for this job.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Finish Setup Button for New Jobs */}
      {isNewJob && !showForm && !showTemplateSelector && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Ready to finish?
              </h3>
              <p className="text-sm text-gray-600">
                {localQuestions.length === 0
                  ? "You haven't added any screening questions yet. You can add them now or finish setup and add them later."
                  : `You've added ${localQuestions.length} screening question${localQuestions.length !== 1 ? 's' : ''}. Your job is ready!`
                }
              </p>
            </div>
            <button
              onClick={handleFinishSetup}
              disabled={saveAllMutation.isPending}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400"
            >
              <CheckCircle className="h-5 w-5" />
              {saveAllMutation.isPending ? "Saving..." : hasUnsavedChanges ? "Save & Finish" : "Finish"}
            </button>
          </div>
        </div>
      )}

      {/* Complete Button for Existing Jobs */}
      {!isNewJob && !showForm && !showTemplateSelector && (
        <div className="flex justify-end">
          <button
            onClick={handleDone}
            disabled={saveAllMutation.isPending}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400"
          >
            <CheckCircle className="h-5 w-5" />
            {saveAllMutation.isPending ? "Saving..." : hasUnsavedChanges ? "Save & Done" : "Done"}
          </button>
        </div>
      )}
    </div>
  );
}

// In-Page Question Form Component
function QuestionForm({ question, onCancel, onSave }) {
  const [formData, setFormData] = useState({
    question_text: question?.question_text || "",
    question_type: question?.question_type || "text",
    options: question?.options
      ? (typeof question.options === 'string' ? JSON.parse(question.options) : question.options)
      : ["", ""],
    is_required: question?.is_required || false,
    placeholder_text: question?.placeholder_text || "",
    help_text: question?.help_text || "",
  });

  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
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

    onSave(formData);
  };

  const showOptions = ["multiple_choice", "checkbox"].includes(formData.question_type);

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {question ? "Edit Question" : "Create Question"}
        </h2>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your question here..."
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {formData.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newOptions = formData.options.filter((_, i) => i !== index);
                      setFormData({ ...formData, options: newOptions });
                    }}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
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
            placeholder="Provide additional context or instructions..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            {question ? "Update Question" : "Add Question"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Template Selector Component
function TemplateSelector({ onCancel, onSelect }) {
  const { data, isLoading } = useQuery({
    queryKey: ["question-templates"],
    queryFn: async () => {
      const response = await fetch("/api/admin/question-templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      return response.json();
    },
  });

  const templates = data?.templates || [];

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Select Template
        </h2>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No templates available</p>
          <p className="text-sm text-gray-500 mt-2">
            Create templates in Settings → Question Templates
          </p>
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
                onClick={() => onSelect({
                  question_text: template.question_text,
                  question_type: template.question_type,
                  options: template.options,
                  is_required: template.is_required,
                  placeholder_text: template.placeholder_text,
                  help_text: template.help_text,
                  created_from_template_id: template.id,
                })}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                Add to Job
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
