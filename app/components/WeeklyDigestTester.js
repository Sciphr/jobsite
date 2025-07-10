import { useState } from "react";
import { Mail, Calendar, Eye, Send, Loader2 } from "lucide-react";

// Main component for the notifications section
export default function WeeklyDigestTester() {
  const [testing, setTesting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [result, setResult] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  const testWeeklyDigest = async () => {
    setTesting(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/weekly-digest", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message,
          sent: data.sent,
          failed: data.failed,
        });
      } else {
        setResult({
          success: false,
          message: data.message || "Failed to send digest",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Network error: " + error.message,
      });
    } finally {
      setTesting(false);
    }
  };

  const previewDigestData = async () => {
    setPreviewing(true);
    setPreviewData(null);

    try {
      const response = await fetch("/api/admin/weekly-digest");
      const data = await response.json();

      if (response.ok) {
        setPreviewData(data.data);
      } else {
        setResult({
          success: false,
          message: data.message || "Failed to preview digest data",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Network error: " + error.message,
      });
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="setting-card flex items-start space-x-4 p-4 border rounded-lg transition-all duration-200 hover:shadow-sm border-blue-200 dark:border-blue-700">
      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
        <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Weekly Digest Testing
          </h3>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Test the weekly digest email functionality. Preview data or send a
          test digest to all administrators.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={previewDigestData}
            disabled={previewing || testing}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            {previewing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            <span>{previewing ? "Loading..." : "Preview Data"}</span>
          </button>

          <button
            onClick={testWeeklyDigest}
            disabled={testing || previewing}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>{testing ? "Sending..." : "Send Test Digest"}</span>
          </button>
        </div>

        {/* Results */}
        {result && (
          <div
            className={`p-3 rounded-lg text-sm mb-4 ${
              result.success
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
            }`}
          >
            <div className="flex items-center space-x-2">
              {result.success ? (
                <Mail className="h-4 w-4" />
              ) : (
                <span className="font-medium">Error:</span>
              )}
              <span>{result.message}</span>
            </div>
            {result.success && result.sent !== undefined && (
              <div className="mt-2 text-xs">
                ✅ Sent to {result.sent} admin(s)
                {result.failed > 0 && (
                  <span className="text-red-600">
                    {" "}
                    • ❌ {result.failed} failed
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Preview Data */}
        {previewData && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              Weekly Digest Preview ({previewData.dateRange.formatted})
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {previewData.summary.jobs.thisWeek.total}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  New Jobs
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {previewData.summary.applications.thisWeek.total}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Applications
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">
                  {previewData.summary.applications.thisWeek.hired}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Hired
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">
                  {previewData.summary.users.thisWeek.total}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  New Users
                </div>
              </div>
            </div>

            {/* Top Jobs Preview */}
            {previewData.insights.topJobs.length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Top Performing Jobs:
                </h5>
                <div className="space-y-1">
                  {previewData.insights.topJobs
                    .slice(0, 3)
                    .map((job, index) => (
                      <div key={index} className="flex justify-between text-xs">
                        <span className="truncate">{job.title}</span>
                        <span className="text-green-600 font-medium">
                          {job.weeklyApplications} apps
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Low Performing Jobs Warning */}
            {previewData.insights.lowPerformingJobs.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                <h5 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                  ⚠️ Jobs Needing Attention:{" "}
                  {previewData.insights.lowPerformingJobs.length}
                </h5>
                <div className="space-y-1">
                  {previewData.insights.lowPerformingJobs
                    .slice(0, 2)
                    .map((job, index) => (
                      <div
                        key={index}
                        className="text-xs text-yellow-700 dark:text-yellow-300"
                      >
                        {job.title} - {job.applications} applications in{" "}
                        {job.daysLive} days
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          💡 <strong>Tip:</strong> The digest covers the previous complete week
          (Monday-Sunday) and includes week-over-week comparisons.
        </div>
      </div>
    </div>
  );
}

// Compact button for header actions
export function WeeklyDigestButton({ getButtonClasses }) {
  const [testing, setTesting] = useState(false);

  const testWeeklyDigest = async () => {
    setTesting(true);

    try {
      const response = await fetch("/api/admin/weekly-digest", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        alert(
          `Weekly digest sent successfully!\nSent to ${data.sent} admin(s)${data.failed > 0 ? `\nFailed: ${data.failed}` : ""}`
        );
      } else {
        alert(`Failed to send digest: ${data.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <button
      onClick={testWeeklyDigest}
      disabled={testing}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${getButtonClasses("primary")} ${testing ? "opacity-50" : ""}`}
    >
      {testing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Calendar className="h-4 w-4" />
      )}
      <span>{testing ? "Sending..." : "Test Digest"}</span>
    </button>
  );
}
