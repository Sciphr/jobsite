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

        // Pre-fill user data if logged in
        if (session?.user) {
          setFormData((prev) => ({
            ...prev,
            name: `${session.user.firstName || ""} ${session.user.lastName || ""}`.trim(),
            email: session.user.email || "",
            phone: session.user.phone || "",
          }));
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {job.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {job.department} • {job.location}
          </p>
        </div>

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Application Form
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Basic Information
            </h3>

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
              <input
                type="file"
                onChange={handleResumeUpload}
                accept=".pdf,.doc,.docx"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.resume ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
                required={!formData.resumeUrl}
              />
              {formData.resumeUrl && (
                <p className="text-sm text-green-600 mt-1">✓ Resume uploaded</p>
              )}
              {errors.resume && <p className="text-red-500 text-sm mt-1">{errors.resume}</p>}
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
            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Screening Questions
              </h3>
              {questions.map((question) => (
                <div key={question.id}>{renderQuestion(question)}</div>
              ))}
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-8">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
            <span className="text-red-500">*</span> Required fields
          </p>
        </form>
      </div>
    </div>
  );
}
