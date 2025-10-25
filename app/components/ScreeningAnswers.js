"use client";

import { useEffect, useState } from "react";
import { FileText, Download } from "lucide-react";

export default function ScreeningAnswers({ applicationId }) {
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnswers = async () => {
      try {
        console.log(`Fetching screening answers for application: ${applicationId}`);
        const response = await fetch(
          `/api/admin/applications/${applicationId}/screening-answers`
        );
        if (response.ok) {
          const data = await response.json();
          console.log('Screening answers response:', data);
          console.log(`Received ${data.answers?.length || 0} answers`);
          setAnswers(data.answers || []);
        } else {
          console.error('Failed to fetch screening answers:', response.status, response.statusText);
        }
      } catch (error) {
        console.error("Error fetching screening answers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnswers();
  }, [applicationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (answers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No screening questions for this application</p>
      </div>
    );
  }

  const renderAnswer = (answer) => {
    // Text answer
    if (answer.answer_text) {
      return (
        <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
          {answer.answer_text}
        </p>
      );
    }

    // JSON answer (checkbox selections)
    if (answer.answer_json) {
      try {
        const jsonAnswer = JSON.parse(answer.answer_json);
        if (Array.isArray(jsonAnswer)) {
          return (
            <ul className="list-disc list-inside text-gray-900 dark:text-gray-100">
              {jsonAnswer.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          );
        }
        return (
          <p className="text-gray-900 dark:text-gray-100">
            {JSON.stringify(jsonAnswer)}
          </p>
        );
      } catch (e) {
        return (
          <p className="text-gray-900 dark:text-gray-100">
            {answer.answer_json}
          </p>
        );
      }
    }

    // File upload
    if (answer.file_url) {
      return (
        <a
          href={answer.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>{answer.file_name || "Download File"}</span>
        </a>
      );
    }

    return (
      <p className="text-gray-500 dark:text-gray-400 italic">No answer provided</p>
    );
  };

  return (
    <div className="space-y-4">
      {answers.map((answer, index) => (
        <div
          key={answer.id}
          className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0 last:pb-0"
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {index + 1}. {answer.question_text}
            </h4>
          </div>
          <div className="pl-4">{renderAnswer(answer)}</div>
        </div>
      ))}
    </div>
  );
}
