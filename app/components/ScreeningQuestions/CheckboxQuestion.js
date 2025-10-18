"use client";

export default function CheckboxQuestion({ question, value, onChange, error }) {
  const options = question.options || [];
  const selectedOptions = value || [];

  const handleChange = (option) => {
    const newValue = selectedOptions.includes(option)
      ? selectedOptions.filter((o) => o !== option)
      : [...selectedOptions, option];
    onChange(newValue);
  };

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
              type="checkbox"
              checked={selectedOptions.includes(option)}
              onChange={() => handleChange(option)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
            />
            <span className="text-gray-900 dark:text-gray-100">{option}</span>
          </label>
        ))}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
