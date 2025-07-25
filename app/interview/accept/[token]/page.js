'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function InterviewAcceptPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading, success, error, already_responded
  const [interview, setInterview] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const acceptInterview = async () => {
      try {
        // First get interview details
        const getResponse = await fetch(`/api/interview/accept/${token}`);
        const getData = await getResponse.json();

        if (!getResponse.ok) {
          setError(getData.error || 'Interview not found or expired');
          setStatus('error');
          return;
        }

        setInterview(getData.interview);

        // If already responded, show that status
        if (getData.interview.status === 'accepted') {
          setStatus('already_responded');
          return;
        }

        // Accept the interview
        const acceptResponse = await fetch(`/api/interview/accept/${token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const acceptData = await acceptResponse.json();

        if (acceptResponse.ok) {
          setStatus('success');
          setInterview(prev => ({ ...prev, ...acceptData.interview }));
        } else {
          setError(acceptData.error || 'Failed to accept interview');
          setStatus('error');
        }

      } catch (err) {
        console.error('Error accepting interview:', err);
        setError('Something went wrong. Please try again.');
        setStatus('error');
      }
    };

    if (token) {
      acceptInterview();
    }
  }, [token]);

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your response...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Interview Confirmed!</h1>
            <p className="text-gray-600">Thank you for confirming your attendance.</p>
          </div>

          {interview && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h2 className="font-semibold text-gray-900 mb-3">Interview Details</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Position:</span>
                  <span className="ml-2 text-gray-600">{interview.jobTitle}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Date & Time:</span>
                  <span className="ml-2 text-gray-600">{formatDateTime(interview.scheduledDateTime)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Duration:</span>
                  <span className="ml-2 text-gray-600">{interview.duration} minutes</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Format:</span>
                  <span className="ml-2 text-gray-600 capitalize">{interview.type}</span>
                </div>
                {interview.location && (
                  <div>
                    <span className="font-medium text-gray-700">Location:</span>
                    <span className="ml-2 text-gray-600">{interview.location}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600 space-y-2">
            <p>We've notified the hiring manager of your confirmation.</p>
            <p>You should receive additional details closer to the interview date.</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'already_responded') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Already Confirmed</h1>
            <p className="text-gray-600">You've already confirmed your attendance for this interview.</p>
          </div>

          {interview && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h2 className="font-semibold text-gray-900 mb-3">Interview Details</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Position:</span>
                  <span className="ml-2 text-gray-600">{interview.jobTitle}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Date & Time:</span>
                  <span className="ml-2 text-gray-600">{formatDateTime(interview.scheduledDateTime)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Duration:</span>
                  <span className="ml-2 text-gray-600">{interview.duration} minutes</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Process</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-gray-600 text-sm">
            This link may have expired or been used already. Please contact the hiring manager if you need assistance.
          </p>
        </div>
      </div>
    </div>
  );
}