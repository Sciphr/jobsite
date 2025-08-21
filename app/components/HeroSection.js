"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function HeroSection({ totalJobs }) {
  const { data: session } = useSession();

  return (
    <section
      className="relative text-white transition-colors duration-200 site-primary overflow-hidden"
      style={{ backgroundColor: "var(--site-primary)" }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="text-center">
          {/* Main heading with better typography */}
          <div className="mb-6">
            <h1 className="text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-white/90 bg-clip-text text-transparent">
              Find Your Dream Job
            </h1>
            <div className="flex items-center justify-center mb-4">
              <div className="h-1 w-20 bg-white/30 rounded-full"></div>
              <div className="mx-4 p-2 bg-white/10 rounded-full">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 002 2H6a2 2 0 002-2V6" />
                </svg>
              </div>
              <div className="h-1 w-20 bg-white/30 rounded-full"></div>
            </div>
          </div>
          
          <p className="text-xl lg:text-2xl mb-10 text-white/90 max-w-3xl mx-auto leading-relaxed">
            Discover opportunities that match your skills and passion. Join thousands of professionals who found their perfect career match.
          </p>
          
          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-8 mb-10">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">{totalJobs}+</div>
              <div className="text-white/80 text-sm">Active Jobs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">500+</div>
              <div className="text-white/80 text-sm">Companies</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">10k+</div>
              <div className="text-white/80 text-sm">Success Stories</div>
            </div>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/jobs"
              className="group bg-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all duration-300 site-primary-text shadow-xl hover:shadow-2xl transform hover:scale-105"
            >
              <span className="flex items-center justify-center gap-2">
                Browse All Jobs
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
            
            {/* Only show Create Account button if user is not signed in */}
            {!session && (
              <Link
                href="/auth/signup"
                className="group bg-white/10 backdrop-blur-sm border border-white/20 px-8 py-4 rounded-xl font-semibold text-lg text-white hover:bg-white/20 transition-all duration-300 shadow-xl hover:shadow-2xl"
              >
                <span className="flex items-center justify-center gap-2">
                  Create Account
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}