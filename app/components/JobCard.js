"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Check, Clock, XCircle, CheckCircle, User, Calendar, Zap } from "lucide-react";
import { ThemedLink } from "./ThemedButton";

export default function JobCard({ job, applicationStatus }) {
  const { data: session } = useSession();

  const formatSalary = (min, max, currency) => {
    if (!min || !max) return null;
    return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
  };

  // Get status badge styling based on application status
  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase() || "";

    // Applied / New
    if (statusLower === "applied" || statusLower === "new") {
      return {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-800 dark:text-blue-200",
        border: "border-blue-200 dark:border-blue-700",
        icon: <Clock className="h-4 w-4" />,
        label: "Applied",
      };
    }
    // Under Review / Screening
    if (statusLower === "under review" || statusLower === "screening" || statusLower === "reviewing") {
      return {
        bg: "bg-purple-100 dark:bg-purple-900/30",
        text: "text-purple-800 dark:text-purple-200",
        border: "border-purple-200 dark:border-purple-700",
        icon: <User className="h-4 w-4" />,
        label: status,
      };
    }
    // Interview / Interviewing
    if (statusLower.includes("interview")) {
      return {
        bg: "bg-indigo-100 dark:bg-indigo-900/30",
        text: "text-indigo-800 dark:text-indigo-200",
        border: "border-indigo-200 dark:border-indigo-700",
        icon: <Calendar className="h-4 w-4" />,
        label: status,
      };
    }
    // Offer / Accepted
    if (statusLower.includes("offer") || statusLower === "accepted" || statusLower === "hired") {
      return {
        bg: "bg-green-100 dark:bg-green-900/30",
        text: "text-green-800 dark:text-green-200",
        border: "border-green-200 dark:border-green-700",
        icon: <CheckCircle className="h-4 w-4" />,
        label: status,
      };
    }
    // Rejected / Declined
    if (statusLower === "rejected" || statusLower === "declined" || statusLower === "not selected") {
      return {
        bg: "bg-red-100 dark:bg-red-900/30",
        text: "text-red-800 dark:text-red-200",
        border: "border-red-200 dark:border-red-700",
        icon: <XCircle className="h-4 w-4" />,
        label: status,
      };
    }
    // Default / Generic
    return {
      bg: "bg-gray-100 dark:bg-gray-800",
      text: "text-gray-800 dark:text-gray-200",
      border: "border-gray-200 dark:border-gray-700",
      icon: <Check className="h-4 w-4" />,
      label: status || "Applied",
    };
  };

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-2xl dark:hover:shadow-2xl transition-all duration-300 p-6 border border-gray-200 dark:border-gray-700 flex flex-col h-full relative overflow-hidden hover:glass-subtle">
      {/* Subtle gradient overlay with glassmorphism on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-gray-50/30 dark:to-gray-700/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      
      {/* Application Status Banner - Most Prominent */}
      {session && applicationStatus?.hasApplied && (() => {
        const statusBadge = getStatusBadge(applicationStatus.status);
        return (
          <div className="absolute top-0 left-0 right-0">
            <div className={`${statusBadge.bg} ${statusBadge.text} ${statusBadge.border} border-b-2 px-4 py-2 flex items-center justify-center gap-2 font-semibold text-sm shadow-md`}>
              {statusBadge.icon}
              <span>Application Status: {statusBadge.label}</span>
            </div>
          </div>
        );
      })()}

      {/* Featured indicator */}
      {job.featured && !applicationStatus?.hasApplied && (
        <div className="absolute -top-1 -right-1">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-3 py-1 rounded-bl-lg rounded-tr-xl font-medium shadow-lg">
            ⭐ Featured
          </div>
        </div>
      )}

      {/* Quick Apply Badge - shows if no screening questions */}
      {!job.hasScreeningQuestions && !applicationStatus?.hasApplied && (
        <div className={`absolute ${job.featured ? '-top-1 right-24' : '-top-1 -right-1'}`}>
          <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs px-3 py-1 rounded-bl-lg rounded-tr-xl font-medium shadow-lg flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Quick Apply
          </div>
        </div>
      )}

      <div className={`relative z-10 ${session && applicationStatus?.hasApplied ? 'pt-12' : ''}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {job.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-gray-600 dark:text-gray-400 font-medium transition-colors duration-200">
                  {job.department}
                </span>
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                <span
                  className="text-xs px-3 py-1 rounded-full transition-colors duration-200 text-white font-medium shadow-sm"
                  style={{ backgroundColor: "var(--site-primary)" }}
                >
                  {job.categories.name}
                </span>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-2 transition-colors duration-200 leading-relaxed">
              {job.summary}
            </p>
          </div>
        </div>

        {/* Main content area - takes up available space */}
        <div className="flex-1">
          {/* Job details with icons */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-colors duration-200">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Location</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">{job.location}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-colors duration-200">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 002 2H6a2 2 0 002-2V6" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Type</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">
                  {job.employment_types?.name || job.employmentType}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-colors duration-200">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Experience</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">
                  {job.experience_levels?.name || job.experienceLevel}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-colors duration-200">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Remote</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">
                  {job.remote_policies?.name || (job.remotePolicy === "Remote" ? "Yes" : job.remotePolicy)}
                </p>
              </div>
            </div>
          </div>

          {/* Salary and deadline section */}
          <div className="space-y-3 mb-4">
            {job.showSalary && job.salaryMin && job.salaryMax && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 transition-colors duration-200">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="flex-1">
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">Salary Range</span>
                  <p className="text-sm font-bold text-green-700 dark:text-green-300">
                    {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                  </p>
                </div>
              </div>
            )}

            {job.applicationDeadline && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 transition-colors duration-200">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Application Deadline</span>
                  <p className="text-sm font-bold text-orange-700 dark:text-orange-300">
                    {new Date(job.applicationDeadline).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
      </div>

        {/* Button section - always at bottom */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-200">
              <span className="font-medium">Posted</span>
              <br />
              <span className="text-xs">{new Date(job.postedAt).toLocaleDateString()}</span>
              {session && applicationStatus?.hasApplied && (
                <>
                  <br />
                  <span className="font-medium text-xs mt-1 inline-block">Applied</span>
                  <br />
                  <span className="text-xs">{new Date(applicationStatus.appliedAt).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {session && applicationStatus?.hasApplied ? (
              <Link
                href={`/jobs/${job.slug}`}
                className="px-4 py-2 rounded-lg transition-all duration-200 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 font-medium shadow-sm hover:shadow-md group"
              >
                <span className="group-hover:scale-105 transition-transform duration-200 inline-block">
                  View Application
                </span>
              </Link>
            ) : (
              <ThemedLink
                href={`/jobs/${job.slug}`}
                className="px-6 py-2 rounded-lg transition-all duration-200 text-white font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                variant="primary"
              >
                View Details →
              </ThemedLink>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
