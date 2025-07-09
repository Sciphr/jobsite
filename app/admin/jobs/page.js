"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { gsap } from "gsap";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import {
  Briefcase,
  Search,
  Filter,
  Plus,
  Eye,
  Edit3,
  Copy,
  Trash2,
  MoreHorizontal,
  MapPin,
  Clock,
  Users,
  DollarSign,
  Building2,
  Calendar,
  RefreshCw,
  Star,
  Archive,
  Play,
  Pause,
  AlertCircle,
} from "lucide-react";

export default function AdminJobs() {
  const { data: session } = useSession();
  const { getStatCardClasses, getButtonClasses } = useThemeClasses();
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [error, setError] = useState(null);

  // Refs for GSAP animations
  const headerRef = useRef(null);
  const statsGridRef = useRef(null);
  const filtersRef = useRef(null);
  const bulkActionsRef = useRef(null);
  const jobsGridRef = useRef(null);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    setAnimationsEnabled(!prefersReducedMotion);

    fetchJobs();
    fetchCategories();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchTerm, statusFilter, categoryFilter, departmentFilter]);

  useEffect(() => {
    if (!loading && animationsEnabled) {
      // Small delay to ensure DOM is ready
      animatePageLoad();
    }
  }, [loading, animationsEnabled]);

  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/admin/jobs");
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/admin/jobs");
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (error) {
      console.error("Error refreshing jobs:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const animatePageLoad = () => {
    // FIRST: Hide the stat cards immediately
    if (statsGridRef.current) {
      const statCards = statsGridRef.current.querySelectorAll(".stat-card");
      if (statCards.length > 0) {
        gsap.set(statCards, {
          opacity: 0,
          y: 30,
          scale: 0.9,
        });
      }
    }

    // THEN: Hide other elements
    const elementsToAnimate = [
      headerRef.current,
      filtersRef.current,
      bulkActionsRef.current,
      jobsGridRef.current,
    ].filter(Boolean);

    gsap.set(elementsToAnimate, {
      opacity: 0,
      y: 30,
    });

    // FINALLY: Start the animation timeline
    const tl = gsap.timeline();

    // Header animation
    if (headerRef.current) {
      tl.to(headerRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out",
      });
    }

    // Animate the individual stat cards
    if (statsGridRef.current) {
      const statCards = statsGridRef.current.querySelectorAll(".stat-card");
      if (statCards.length > 0) {
        tl.to(
          statCards,
          {
            scale: 1,
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: "back.out(1.7)",
          },
          "-=0.3"
        );
      }
    }

    // Filters
    if (filtersRef.current) {
      tl.to(
        filtersRef.current,
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out",
        },
        "-=0.2"
      );
    }

    // Bulk actions (if visible)
    if (bulkActionsRef.current) {
      tl.to(
        bulkActionsRef.current,
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out",
        },
        "-=0.3"
      );
    }

    // Jobs grid
    if (jobsGridRef.current) {
      tl.to(
        jobsGridRef.current,
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out",
        },
        "-=0.2"
      );

      // Animate individual job cards
      const jobCards = jobsGridRef.current.querySelectorAll(".job-card");
      if (jobCards.length > 0) {
        tl.fromTo(
          jobCards,
          {
            opacity: 0,
            y: 20,
            scale: 0.95,
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
            stagger: 0.05,
            ease: "power2.out",
          },
          "-=0.4"
        );
      }
    }

    // Animate counters after a delay
    setTimeout(() => {
      animateCounters();
    }, 800);
  };

  const animateCounters = () => {
    if (!statsGridRef.current) return;

    const statusOptions = ["Active", "Draft", "Paused", "Closed"];
    statusOptions.forEach((status, index) => {
      const count = jobs.filter((job) => job.status === status).length;
      const element = statsGridRef.current.querySelector(
        `[data-counter="${index}"]`
      );
      if (element && typeof count === "number") {
        const obj = { value: 0 };
        gsap.to(obj, {
          value: count,
          duration: 1.5,
          ease: "power2.out",
          onUpdate: function () {
            element.textContent = Math.round(obj.value).toLocaleString();
          },
        });
      }
    });
  };

  const handleCardHover = (e, isEntering) => {
    if (!animationsEnabled) return;

    const card = e.currentTarget;
    const icon = card.querySelector(".stat-icon");

    if (isEntering) {
      gsap.to(card, {
        y: -5,
        scale: 1.02,
        duration: 0.3,
        ease: "power2.out",
      });
      if (icon) {
        gsap.to(icon, {
          scale: 1.1,
          rotation: 5,
          duration: 0.3,
          ease: "power2.out",
        });
      }
    } else {
      gsap.to(card, {
        y: 0,
        scale: 1,
        duration: 0.3,
        ease: "power2.out",
      });
      if (icon) {
        gsap.to(icon, {
          scale: 1,
          rotation: 0,
          duration: 0.3,
          ease: "power2.out",
        });
      }
    }
  };

  const handleJobCardHover = (e, isEntering) => {
    if (!animationsEnabled) return;

    const card = e.currentTarget;

    if (isEntering) {
      gsap.to(card, {
        y: -3,
        scale: 1.01,
        duration: 0.3,
        ease: "power2.out",
      });
    } else {
      gsap.to(card, {
        y: 0,
        scale: 1,
        duration: 0.3,
        ease: "power2.out",
      });
    }
  };

  const filterJobs = () => {
    let filtered = jobs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((job) => job.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((job) => job.categoryId === categoryFilter);
    }

    // Department filter
    if (departmentFilter !== "all") {
      filtered = filtered.filter((job) => job.department === departmentFilter);
    }

    setFilteredJobs(filtered);
  };

  const updateJobStatus = async (jobId, newStatus) => {
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setJobs((prev) =>
          prev.map((job) =>
            job.id === jobId ? { ...job, status: newStatus } : job
          )
        );
      }
    } catch (error) {
      console.error("Error updating job status:", error);
    }
  };

  const toggleFeatured = async (jobId, featured) => {
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}/feature`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: !featured }),
      });

      const result = await response.json();

      if (response.ok) {
        setJobs((prev) =>
          prev.map((job) =>
            job.id === jobId ? { ...job, featured: !featured } : job
          )
        );

        setError(null);
      } else {
        // Set the error and scroll to top
        if (result.message) {
          setError(result.message);
          // Smooth scroll to top to show the error
          window.scrollTo({ top: 0, behavior: "smooth" });
          setTimeout(() => setError(null), 8000);
        } else {
          setError("Failed to update featured status. Please try again.");
          window.scrollTo({ top: 0, behavior: "smooth" });
          setTimeout(() => setError(null), 5000);
        }
      }
    } catch (error) {
      console.error("Error updating featured status:", error);
      setError("An error occurred while updating the featured status.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setError(null), 5000);
    }
  };

  const duplicateJob = async (jobId) => {
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}/duplicate`, {
        method: "POST",
      });

      if (response.ok) {
        const newJob = await response.json();
        setJobs((prev) => [newJob, ...prev]);
      }
    } catch (error) {
      console.error("Error duplicating job:", error);
    }
  };

  const deleteJob = async (jobId) => {
    if (
      !confirm(
        "Are you sure you want to delete this job? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setJobs((prev) => prev.filter((job) => job.id !== jobId));
        setSelectedJobs((prev) => prev.filter((id) => id !== jobId));
      }
    } catch (error) {
      console.error("Error deleting job:", error);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedJobs(filteredJobs.map((job) => job.id));
    } else {
      setSelectedJobs([]);
    }
  };

  const handleSelectJob = (jobId, checked) => {
    if (checked) {
      setSelectedJobs((prev) => [...prev, jobId]);
    } else {
      setSelectedJobs((prev) => prev.filter((id) => id !== jobId));
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      Active: "bg-green-100 text-green-800",
      Draft: "bg-yellow-100 text-yellow-800",
      Paused: "bg-orange-100 text-orange-800",
      Closed: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status) => {
    const icons = {
      Active: Play,
      Draft: Edit3,
      Paused: Pause,
      Closed: Archive,
    };
    return icons[status] || Clock;
  };

  const formatSalary = (min, max, currency) => {
    if (!min && !max) return "Not specified";
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    if (min && max) {
      return `${formatter.format(min)} - ${formatter.format(max)}`;
    } else if (min) {
      return `${formatter.format(min)}+`;
    } else {
      return `Up to ${formatter.format(max)}`;
    }
  };

  // Get unique departments for filter
  const departments = [...new Set(jobs.map((job) => job.department))];
  const statusOptions = ["Active", "Draft", "Paused", "Closed"];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="admin-card p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div ref={headerRef} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold admin-text">Jobs Management</h1>
          <p className="admin-text-light mt-2">
            Create and manage job postings
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm ${getButtonClasses("primary")} ${refreshing ? "opacity-50" : ""}`}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
          <Link
            href="/admin/jobs/create"
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 font-medium shadow-md hover:shadow-lg ${getButtonClasses("success")}`}
          >
            <Plus className="h-4 w-4" />
            <span>Create Job</span>
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-900 mb-1">
                Action Failed
              </h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 p-1 text-red-400 hover:text-red-600 transition-colors duration-200"
              title="Dismiss error"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div ref={statsGridRef} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statusOptions.map((status, index) => {
          const count = jobs.filter((job) => job.status === status).length;
          const StatusIcon = getStatusIcon(status);
          const statClasses = getStatCardClasses(index);

          return (
            <div
              key={status}
              className={`stat-card admin-card p-6 rounded-lg shadow ${statClasses.border} ${statClasses.hover} hover:shadow-md transition-all duration-200 cursor-pointer`}
              onMouseEnter={(e) => handleCardHover(e, true)}
              onMouseLeave={(e) => handleCardHover(e, false)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div
                    className="text-2xl font-bold admin-text"
                    data-counter={index}
                  >
                    {count}
                  </div>
                  <div className="text-sm admin-text-light font-medium">
                    {status} Jobs
                  </div>
                </div>
                <div className={`stat-icon p-3 rounded-lg ${statClasses.bg}`}>
                  <StatusIcon className={`h-6 w-6 ${statClasses.icon}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div ref={filtersRef} className="admin-card p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-600 admin-text"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text"
          >
            <option value="all">All Statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedJobs.length > 0 && (
        <div
          ref={bulkActionsRef}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              {selectedJobs.length} job{selectedJobs.length !== 1 ? "s" : ""}{" "}
              selected
            </span>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                Activate
              </button>
              <button className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700">
                Pause
              </button>
              <button className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Jobs Grid */}
      <div
        ref={jobsGridRef}
        className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        {filteredJobs.map((job) => {
          const StatusIcon = getStatusIcon(job.status);
          return (
            <div
              key={job.id}
              className="job-card admin-card rounded-lg shadow hover:shadow-md transition-shadow duration-200"
              onMouseEnter={(e) => handleJobCardHover(e, true)}
              onMouseLeave={(e) => handleJobCardHover(e, false)}
            >
              {/* Card Header */}
              <div className="p-6 border-b admin-text-light">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        checked={selectedJobs.includes(job.id)}
                        onChange={(e) =>
                          handleSelectJob(job.id, e.target.checked)
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {job.featured && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold admin-text mb-2">
                      {job.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm admin-text-light mb-3">
                      <div className="flex items-center space-x-1">
                        <Building2 className="h-4 w-4" />
                        <span>{job.department}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{job.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                          job.status
                        )}`}
                      >
                        {job.status}
                      </span>
                      <span className="text-xs admin-text-light">
                        {job.employmentType}
                      </span>
                      <span className="text-xs admin-text-light">
                        {job.experienceLevel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6">
                <div className="space-y-3">
                  {/* Salary */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm admin-text-light">
                      Salary Display:
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        job.showSalary ? "text-green-700" : "admin-text-light"
                      }`}
                    >
                      {job.showSalary ? "Visible" : "Hidden"}
                    </span>
                  </div>

                  {/* Applications */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm admin-text-light">
                      Applications:
                    </span>
                    <span className="text-sm font-medium admin-text flex items-center space-x-1">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>{job.applicationCount}</span>
                    </span>
                  </div>

                  {/* Views */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm admin-text-light">Views:</span>
                    <span className="text-sm font-medium admin-text flex items-center space-x-1">
                      <Eye className="h-4 w-4 text-gray-400" />
                      <span>{job.viewCount}</span>
                    </span>
                  </div>

                  {/* Created Date */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm admin-text-light">Created:</span>
                    <span className="text-sm admin-text-light flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="px-6 py-4 border-t admin-text-light bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/jobs/${job.slug}`}
                      target="_blank"
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                      title="View job"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/admin/jobs/${job.id}/edit`}
                      className="p-2 text-gray-400 hover:text-green-600 transition-colors duration-200"
                      title="Edit job"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => duplicateJob(job.id)}
                      className="p-2 text-gray-400 hover:text-purple-600 transition-colors duration-200"
                      title="Duplicate job"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleFeatured(job.id, job.featured)}
                      className={`p-2 transition-colors duration-200 ${
                        job.featured
                          ? "text-yellow-500"
                          : "text-gray-400 hover:text-yellow-500"
                      }`}
                      title={
                        job.featured
                          ? "Remove from featured"
                          : "Mark as featured"
                      }
                    >
                      <Star
                        className={`h-4 w-4 ${
                          job.featured ? "fill-current" : ""
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={job.status}
                      onChange={(e) => updateJobStatus(job.id, e.target.value)}
                      className={`text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium ${getStatusColor(
                        job.status
                      )}`}
                    >
                      {statusOptions.map((status) => (
                        <option
                          key={status}
                          value={status}
                          className="text-gray-800 bg-white"
                        >
                          {status}
                        </option>
                      ))}
                    </select>
                    <div className="relative group">
                      <button
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        title="More actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      <div className="absolute right-0 top-8 w-40 admin-card rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                        <Link
                          href={`/admin/jobs/${job.id}/edit`}
                          className="w-full px-3 py-2 text-left text-sm admin-text-light hover:bg-gray-50 rounded-t-lg flex items-center space-x-2"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Edit Job</span>
                        </Link>
                        <button
                          onClick={() => duplicateJob(job.id)}
                          className="w-full px-3 py-2 text-left text-sm admin-text-light hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <Copy className="h-3 w-3" />
                          <span>Duplicate</span>
                        </button>
                        <button
                          onClick={() => deleteJob(job.id)}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-lg flex items-center space-x-2"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredJobs.length === 0 && !loading && (
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium admin-text mb-2">No jobs found</h3>
          <p className="admin-text-light mb-6">
            {searchTerm ||
            statusFilter !== "all" ||
            categoryFilter !== "all" ||
            departmentFilter !== "all"
              ? "Try adjusting your filters to see more results."
              : "Get started by creating your first job posting."}
          </p>
          {!searchTerm &&
            statusFilter === "all" &&
            categoryFilter === "all" &&
            departmentFilter === "all" && (
              <Link
                href="/admin/jobs/create"
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${getButtonClasses("primary")}`}
              >
                <Plus className="h-4 w-4" />
                <span>Create Your First Job</span>
              </Link>
            )}
        </div>
      )}
    </div>
  );
}
