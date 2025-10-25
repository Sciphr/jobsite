"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  TextQuestion,
  TextareaQuestion,
  MultipleChoiceQuestion,
  CheckboxQuestion,
  YesNoQuestion,
  DateQuestion,
  FileUploadQuestion,
} from "@/app/components/ScreeningQuestions";

export default function FullApplicationPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const [job, setJob] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    coverLetter: "",
    resumeUrl: "",
  });

  // Screening answers (keyed by question ID)
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});

  // Fetch job details and screening questions
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch job details
        const jobRes = await fetch(`/api/jobs/${params.slug}`);
        if (!jobRes.ok) throw new Error("Job not found");
        const jobData = await jobRes.json();
        setJob(jobData.job);

        // Fetch screening questions
        const questionsRes = await fetch(`/api/jobs/${params.slug}/screening-questions`);
        if (questionsRes.ok) {
          const questionsData = await questionsRes.json();
          setQuestions(questionsData.questions || []);
        }

        // Pre-fill user data if logged in - fetch full profile
        if (session?.user?.id) {
          try {
            const profileRes = await fetch("/api/profile");
            if (profileRes.ok) {
              const profileData = await profileRes.json();

              // Get default resume if it exists
              const defaultResume = profileData.user_resumes?.[0];
              const resumeUrl = defaultResume?.storage_path || "";

              setFormData((prev) => ({
                ...prev,
                name: `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim() ||
                      `${session.user.firstName || ""} ${session.user.lastName || ""}`.trim(),
                email: profileData.email || session.user.email || "",
                phone: profileData.phone || "",
                resumeUrl: resumeUrl,
              }));
            }
          } catch (profileErr) {
            // Fallback to session data if profile fetch fails
            console.error("Failed to fetch profile:", profileErr);
            setFormData((prev) => ({
              ...prev,
              name: `${session.user.firstName || ""} ${session.user.lastName || ""}`.trim(),
              email: session.user.email || "",
              phone: session.user.phone || "",
            }));
          }
        }
      } catch (err) {
        setError("Failed to load job details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.slug, session]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    // Clear error for this question
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[questionId];
      return newErrors;
    });
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate basic fields
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!formData.resumeUrl) newErrors.resume = "Resume is required";

    // Validate screening questions
    questions.forEach((question) => {
      if (question.is_required) {
        const answer = answers[question.id];
        if (!answer || (typeof answer === "string" && !answer.trim())) {
          newErrors[question.id] = "This question is required";
        } else if (Array.isArray(answer) && answer.length === 0) {
          newErrors[question.id] = "Please select at least one option";
        } else if (typeof answer === "object" && !answer.file_url) {
          newErrors[question.id] = "Please upload a file";
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Format screening answers for API
      const screeningAnswers = questions.map((question) => {
        const answer = answers[question.id];

        if (question.question_type === "checkbox") {
          return {
            question_id: question.id,
            answer_json: answer || [],
          };
        } else if (question.question_type === "file_upload") {
          return {
            question_id: question.id,
            file_url: answer?.file_url || null,
            file_name: answer?.file_name || null,
          };
        } else {
          return {
            question_id: question.id,
            answer_text: answer || null,
          };
        }
      });

      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          coverLetter: formData.coverLetter,
          resumeUrl: formData.resumeUrl,
          screeningAnswers,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to submit application");
      }

      // Success! Redirect to success page or job listing
      router.push(`/jobs/${params.slug}?applied=true`);
    } catch (err) {
      setError(err.message || "Failed to submit application");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "resume");

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      setFormData((prev) => ({ ...prev, resumeUrl: data.url }));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.resume;
        return newErrors;
      });
    } catch (err) {
      console.error("Error uploading resume:", err);
      setError("Failed to upload resume");
    }
  };

  const renderQuestion = (question) => {
    const value = answers[question.id];
    const error = errors[question.id];
    const onChange = (val) => handleAnswerChange(question.id, val);

    switch (question.question_type) {
      case "text":
        return <TextQuestion question={question} value={value} onChange={onChange} error={error} />;
      case "textarea":
        return <TextareaQuestion question={question} value={value} onChange={onChange} error={error} />;
      case "multiple_choice":
        return <MultipleChoiceQuestion question={question} value={value} onChange={onChange} error={error} />;
      case "checkbox":
        return <CheckboxQuestion question={question} value={value} onChange={onChange} error={error} />;
      case "yes_no":
        return <YesNoQuestion question={question} value={value} onChange={onChange} error={error} />;
      case "date":
        return <DateQuestion question={question} value={value} onChange={onChange} error={error} />;
      case "file_upload":
        return <FileUploadQuestion question={question} value={value} onChange={onChange} error={error} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Job Not Found</h1>
          <Link href="/jobs" className="text-blue-600 hover:underline">
            Back to Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <Link
          href={`/jobs/${params.slug}`}
          className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-4"
        >
          ← Back to Job Details
        </Link>

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sm:p-8 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Apply for {job.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {job.department} • {job.location}
          </p>
          {job.employment_types?.name && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              {job.employment_types.name}
            </p>
          )}
        </div>

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Application Form
            </h2>
            {questions.length > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {questions.length} screening question{questions.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Basic Information
              </h3>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
                required
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
                required
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.phone ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
                required
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Resume <span className="text-red-500">*</span>
              </label>
              {formData.resumeUrl ? (
                <div className="space-y-3">
                  {/* Current Resume Display */}
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 p-2 bg-green-100 dark:bg-green-900 rounded">
                        <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                          Resume on file
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          Your default resume will be used
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href={`/api/resume-download?path=${encodeURIComponent(formData.resumeUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      >
                        View
                      </a>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, resumeUrl: "" })}
                        className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Optional: Upload Different Resume */}
                  <details className="group">
                    <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-2">
                      <svg className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Upload a different resume for this application
                    </summary>
                    <div className="mt-3 pl-6">
                      <label className="flex flex-col items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer transition-colors bg-gray-50 dark:bg-gray-800/50">
                        <svg className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Click to upload or drag and drop
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          PDF, DOC, DOCX up to 10MB
                        </span>
                        <input
                          type="file"
                          onChange={handleResumeUpload}
                          accept=".pdf,.doc,.docx"
                          className="hidden"
                        />
                      </label>
                    </div>
                  </details>
                </div>
              ) : (
                <div>
                  <label className="flex flex-col items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer transition-colors bg-white dark:bg-gray-800">
                    <svg className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Upload your resume
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      PDF, DOC, DOCX up to 10MB
                    </span>
                    <input
                      type="file"
                      onChange={handleResumeUpload}
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      required
                    />
                  </label>
                  {errors.resume && <p className="text-red-500 text-sm mt-2">{errors.resume}</p>}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Cover Letter (Optional)</label>
              <textarea
                value={formData.coverLetter}
                onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Screening Questions */}
          {questions.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-8 mt-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  2
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Screening Questions
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Please answer the following questions to help us understand your qualifications.
              </p>
              <div className="space-y-6">
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Question {index + 1} of {questions.length}
                    </div>
                    {renderQuestion(question)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-lg shadow-lg hover:shadow-xl"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting Application...
                </span>
              ) : (
                "Submit Application"
              )}
            </button>

            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
              <span className="text-red-500">*</span> Required fields
            </p>

            <p className="text-xs text-gray-500 dark:text-gray-500 mt-3 text-center">
              By submitting this application, you agree to our{" "}
              <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
                Terms of Service
              </Link>
              .
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
