"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, MapPin, Briefcase, TrendingUp, Code, Users, Megaphone, Palette, DollarSign, Wrench, Heart, GraduationCap, Shield, Building, Loader2 } from "lucide-react";

export default function HeroSection({ totalJobs, categories = [] }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);

  // Cache for autocomplete results (stored in ref to persist across renders)
  const autocompleteCache = useRef({});

  // TODO: Make hero tagline and subtitle customizable via admin settings
  // Add settings for: hero_tagline, hero_subtitle, hero_show_stats, hero_show_categories, etc.
  // Also make the "Companies" and "Success Stories" stats customizable

  const handleSearch = (e) => {
    e.preventDefault();

    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    }
    if (location.trim()) {
      params.set("location", location.trim());
    }

    router.push(`/jobs${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleCategoryClick = (categoryName) => {
    router.push(`/jobs?category=${encodeURIComponent(categoryName)}`);
  };

  const handlePopularSearch = (term) => {
    setSearchQuery(term);
    router.push(`/jobs?search=${encodeURIComponent(term)}`);
  };

  // Autocomplete logic with client-side caching and 500ms debounce
  useEffect(() => {
    const fetchSuggestions = async () => {
      // Require at least 3 characters to reduce unnecessary API calls
      if (searchQuery.length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      // Normalize query for cache lookup (lowercase, trim)
      const cacheKey = searchQuery.toLowerCase().trim();

      // Check cache first - instant results!
      if (autocompleteCache.current[cacheKey]) {
        setSuggestions(autocompleteCache.current[cacheKey]);
        setShowSuggestions(autocompleteCache.current[cacheKey].length > 0);
        return;
      }

      // Not in cache, make API call
      setLoadingSuggestions(true);
      try {
        const response = await fetch(`/api/jobs/autocomplete?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          const results = data.suggestions || [];

          // Store in cache for future use
          autocompleteCache.current[cacheKey] = results;

          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        }
      } catch (error) {
        console.error("Autocomplete error:", error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    // 500ms debounce to reduce API calls while still providing suggestions
    const debounce = setTimeout(fetchSuggestions, 500);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion.text);
    setShowSuggestions(false);
    router.push(`/jobs?search=${encodeURIComponent(suggestion.text)}`);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Show top 6 categories for quick filters
  const topCategories = categories.slice(0, 6);

  // Get category icon based on category name
  const getCategoryIcon = (categoryName) => {
    const name = categoryName.toLowerCase();

    // Engineering & Technical
    if (name.includes("engineer") || name.includes("software") || name.includes("developer") || name.includes("tech")) {
      return <Code className="h-6 w-6" />;
    }
    // Sales
    if (name.includes("sales") || name.includes("business development")) {
      return <TrendingUp className="h-6 w-6" />;
    }
    // Marketing
    if (name.includes("marketing") || name.includes("growth")) {
      return <Megaphone className="h-6 w-6" />;
    }
    // Design
    if (name.includes("design") || name.includes("creative") || name.includes("ux") || name.includes("ui")) {
      return <Palette className="h-6 w-6" />;
    }
    // Finance
    if (name.includes("finance") || name.includes("accounting")) {
      return <DollarSign className="h-6 w-6" />;
    }
    // Operations
    if (name.includes("operations") || name.includes("logistics")) {
      return <Wrench className="h-6 w-6" />;
    }
    // HR / People
    if (name.includes("human") || name.includes("people") || name.includes("hr") || name.includes("talent")) {
      return <Users className="h-6 w-6" />;
    }
    // Healthcare
    if (name.includes("health") || name.includes("medical") || name.includes("clinical")) {
      return <Heart className="h-6 w-6" />;
    }
    // Education
    if (name.includes("education") || name.includes("teaching") || name.includes("training")) {
      return <GraduationCap className="h-6 w-6" />;
    }
    // Legal / Compliance
    if (name.includes("legal") || name.includes("compliance") || name.includes("security")) {
      return <Shield className="h-6 w-6" />;
    }
    // Management / Executive
    if (name.includes("management") || name.includes("executive") || name.includes("leadership")) {
      return <Building className="h-6 w-6" />;
    }
    // Default fallback
    return <Briefcase className="h-6 w-6" />;
  };

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

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
        {/* Hero Content */}
        <div className="text-center mb-10">
          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-white/90 bg-clip-text text-transparent leading-tight">
            Find Your Dream Career
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl lg:text-2xl text-white/90 mb-6 max-w-3xl mx-auto leading-relaxed">
            Discover opportunities that match your skills and ambitions
          </p>

          {/* Job Count with Icon */}
          {totalJobs > 0 && (
            <div className="flex items-center justify-center gap-2 text-white/90 mb-8">
              <Briefcase className="h-5 w-5" />
              <span className="text-lg font-medium">
                {totalJobs.toLocaleString()} open position{totalJobs !== 1 ? "s" : ""} available
              </span>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="max-w-4xl mx-auto mb-10 relative" ref={searchRef}>
          <form onSubmit={handleSearch} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-2 transition-all duration-200">
            <div className="flex flex-col md:flex-row gap-2">
              {/* Job Title / Keywords Search with Autocomplete */}
              <div className="flex-1 relative">
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200">
                  <Search className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Job title, keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-base"
                  />
                  {loadingSuggestions && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                </div>

                {/* Autocomplete Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700 animate-slideDown">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center justify-between ${
                          selectedIndex === index ? "bg-gray-50 dark:bg-gray-700" : ""
                        }`}
                      >
                        <div>
                          <div className="text-gray-900 dark:text-white font-medium">
                            {suggestion.text}
                          </div>
                          {suggestion.department && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {suggestion.department}
                              {suggestion.category && ` • ${suggestion.category}`}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {suggestion.type === "job_title" ? "Job" : "Dept"}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Location Search */}
              <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200">
                <MapPin className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="City, state, or remote..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onFocus={() => setShowSuggestions(false)}
                  className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-base"
                />
              </div>

              {/* Search Button */}
              <button
                type="submit"
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                Search Jobs
              </button>
            </div>
          </form>

          {/* Popular Searches / Quick Suggestions */}
          <div className="mt-4 text-center">
            <p className="text-sm text-white/70 mb-2">Popular searches:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {["Software Engineer", "Product Manager", "Designer", "Sales", "Marketing"].map((term) => (
                <button
                  key={term}
                  onClick={() => handlePopularSearch(term)}
                  className="text-sm px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors duration-200 border border-white/20"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Category Filters */}
        {topCategories.length > 0 && (
          <div className="max-w-5xl mx-auto mb-10">
            <div className="flex items-center justify-center gap-2 mb-6">
              <TrendingUp className="h-5 w-5 text-white/80" />
              <h2 className="text-lg font-semibold text-white">Browse by Category</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {topCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.name)}
                  className="group relative overflow-hidden glass hover:glass-strong rounded-lg p-4 transition-all duration-200 hover:scale-105 hover:-translate-y-1"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white group-hover:bg-white/30 transition-colors duration-200">
                      {getCategoryIcon(category.name)}
                    </div>
                    <p className="text-sm font-medium text-white group-hover:text-white/90 transition-colors duration-200">
                      {category.name}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* View All Categories Link */}
            {categories.length > 6 && (
              <div className="text-center mt-6">
                <button
                  onClick={() => router.push("/jobs")}
                  className="text-sm font-medium text-white/80 hover:text-white transition-colors duration-200"
                >
                  View all {categories.length} categories →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stats Row */}
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
          <button
            onClick={() => router.push("/jobs")}
            className="group bg-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105"
            style={{ color: "var(--site-primary)" }}
          >
            <span className="flex items-center justify-center gap-2">
              Browse All Jobs
              <svg
                className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>

          {/* Only show Create Account button if user is not signed in */}
          {!session && (
            <button
              onClick={() => router.push("/auth/signup")}
              className="group bg-white/10 backdrop-blur-sm border border-white/20 px-8 py-4 rounded-xl font-semibold text-lg text-white hover:bg-white/20 transition-all duration-300 shadow-xl hover:shadow-2xl"
            >
              <span className="flex items-center justify-center gap-2">
                Create Account
                <svg
                  className="w-5 h-5 group-hover:scale-110 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}