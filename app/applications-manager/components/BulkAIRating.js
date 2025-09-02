// Bulk AI Rating Component
"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, CheckCircle, AlertCircle, Bot } from "lucide-react";

export default function BulkAIRating({ applications, onRatingComplete }) {
  const [isRating, setIsRating] = useState(false);
  const [ratingProgress, setRatingProgress] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Count unrated applications that have resumes
  const unratedApplications = applications.filter(app => 
    (!app.rating || app.rating === 0) && app.resumeUrl && app.resumeUrl.trim() !== ''
  );
  const unratedCount = unratedApplications.length;

  const handleBulkRating = async () => {
    if (unratedCount === 0) {
      alert('No unrated applications found.');
      return;
    }

    setShowConfirm(false);
    setIsRating(true);
    setRatingProgress({ current: 0, total: unratedCount, completed: [], failed: [] });

    try {
      const response = await fetch('/api/admin/ai-rating', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rateAll: true
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRatingProgress({
          current: data.summary.total,
          total: data.summary.total,
          completed: data.results.filter(r => r.success),
          failed: data.results.filter(r => !r.success)
        });

        // Call parent callback to refresh data
        if (onRatingComplete) {
          onRatingComplete(data.summary);
        }

        // Show completed state for 2 seconds before clearing
        setTimeout(() => {
          setRatingProgress(null);
          setIsRating(false);
        }, 2000);

      } else {
        console.error('Bulk rating failed:', data.error);
        alert(data.error || 'Bulk rating failed. Please try again.');
        setIsRating(false);
        setRatingProgress(null);
      }

    } catch (error) {
      console.error('Error with bulk rating:', error);
      alert('Error with bulk rating. Please try again.');
      setIsRating(false);
      setRatingProgress(null);
    }
  };

  if (unratedCount === 0) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm">All applications are rated!</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bulk Rating Button */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isRating}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          isRating
            ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
            : "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/30 border border-blue-200 dark:border-blue-700"
        }`}
      >
        {isRating ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        <Bot className="h-4 w-4" />
        <span>
          {isRating ? 'Rating Applications...' : `AI Rate ${unratedCount} Applications`}
        </span>
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4 admin-card">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold admin-text">AI Rate Applications</h3>
                <p className="text-sm admin-text-light">Batch rating with AI</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="admin-text mb-2">
                This will rate <strong>{unratedCount} unrated applications</strong> using AI analysis.
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm admin-text-light">
                <p>• AI will analyze cover letters and job requirements</p>
                <p>• Ratings will be saved as "AI" type</p>
                <p>• You can manually override any rating later</p>
                <p>• This may take 1-2 minutes to complete</p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 admin-text-light hover:admin-text text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkRating}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Start AI Rating
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Display */}
      {ratingProgress && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                Rating Progress
              </span>
            </div>
            <span className="text-sm text-blue-700 dark:text-blue-400">
              {ratingProgress.current}/{ratingProgress.total}
            </span>
          </div>
          
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mb-3">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(ratingProgress.current / ratingProgress.total) * 100}%` }}
            />
          </div>

          {ratingProgress.current === ratingProgress.total && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-700 dark:text-green-300">
                  {ratingProgress.completed.length} applications rated successfully
                </span>
              </div>
              {ratingProgress.failed.length > 0 && (
                <div className="flex items-center space-x-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-700 dark:text-red-300">
                    {ratingProgress.failed.length} applications failed
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}