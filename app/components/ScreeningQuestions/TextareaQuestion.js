"use client";

export default function TextareaQuestion({ question, value, onChange, error }) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium mb-2">
        {question.question_text}
        {question.is_required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {question.help_text && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {question.help_text}
        </p>
      )}
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder_text || ""}
        rows={4}
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? "border-red-500" : "border-gray-300 dark:border-gray-600"
        } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
        required={question.is_required}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
