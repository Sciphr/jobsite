"use client";

export default function MultipleChoiceQuestion({ question, value, onChange, error }) {
  const options = question.options || [];

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
      <div className="space-y-2">
        {options.map((option, index) => (
          <label key={index} className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name={`question-${question.id}`}
              value={option}
              checked={value === option}
              onChange={(e) => onChange(e.target.value)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              required={question.is_required}
            />
            <span className="text-gray-900 dark:text-gray-100">{option}</span>
          </label>
        ))}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
