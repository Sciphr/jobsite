"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useThemeClasses } from "../../contexts/AdminThemeContext";
import {
  Search,
  MapPin,
  Briefcase,
  Award,
  Users,
  Filter,
  X,
  Mail,
  ExternalLink,
  Eye,
  UserPlus,
  MessageSquare,
} from "lucide-react";

export default function TalentPoolPage() {
  const router = useRouter();
  const { getButtonClasses } = useThemeClasses();

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
    hasMore: false,
  });

  // Filters
  const [filters, setFilters] = useState({
    search: "",
    skills: "",
    location: "",
    availableOnly: false,
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, [pagination.page, filters]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.skills && { skills: filters.skills }),
        ...(filters.location && { location: filters.location }),
        ...(filters.availableOnly && { availableOnly: "true" }),
      });

      const response = await fetch(`/api/admin/talent-pool?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch talent pool");
      }

      const data = await response.json();
      setCandidates(data.candidates);
      setPagination((prev) => ({
        ...prev,
        ...data.pagination,
      }));
    } catch (err) {
      console.error("Error fetching talent pool:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1 when filters change
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      skills: "",
      location: "",
      availableOnly: false,
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const viewCandidateProfile = (candidateId) => {
    router.push(`/admin/talent-pool/${candidateId}`);
  };

  const hasActiveFilters = Object.values(filters).some((val) =>
    typeof val === "boolean" ? val : val.length > 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold admin-text">Talent Pool</h1>
        <p className="admin-text-light mt-1">
          Browse and search registered candidates to proactively reach out for opportunities
        </p>
      </div>

      {/* Search and Filters */}
      <div className="admin-card border admin-border rounded-lg p-4 space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 admin-text-light" />
            <input
              type="text"
              placeholder="Search by name, email, company, or title..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full pl-10 pr-4 py-2 border admin-border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text admin-card"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`${getButtonClasses("secondary")} flex items-center gap-2`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full theme-primary-bg text-white">
                {Object.values(filters).filter((val) =>
                  typeof val === "boolean" ? val : val.length > 0
                ).length}
              </span>
            )}
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="pt-4 border-t admin-border space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium admin-text mb-1">
                  Skills (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. JavaScript, React, Node.js"
                  value={filters.skills}
                  onChange={(e) => handleFilterChange("skills", e.target.value)}
                  className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text admin-card"
                />
              </div>
              <div>
                <label className="block text-sm font-medium admin-text mb-1">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Toronto, Remote"
                  value={filters.location}
                  onChange={(e) => handleFilterChange("location", e.target.value)}
                  className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text admin-card"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.availableOnly}
                  onChange={(e) =>
                    handleFilterChange("availableOnly", e.target.checked)
                  }
                  className="rounded border-gray-300 theme-primary focus:ring-2 focus:ring-offset-0"
                />
                <span className="text-sm admin-text">
                  Show only candidates available for opportunities
                </span>
              </label>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm theme-danger hover:underline flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="admin-text mt-3">Loading candidates...</p>
        </div>
      ) : error ? (
        <div className="admin-card border admin-border rounded-lg p-8 text-center">
          <p className="theme-danger">Error: {error}</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="admin-card border admin-border rounded-lg p-8 text-center">
          <Users className="h-12 w-12 admin-text-light mx-auto mb-3" />
          <h3 className="text-lg font-semibold admin-text mb-2">
            No candidates found
          </h3>
          <p className="admin-text-light">
            {hasActiveFilters
              ? "Try adjusting your filters to find candidates"
              : "No registered candidates in the talent pool yet"}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className={`${getButtonClasses("secondary")} mt-4`}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <p className="text-sm admin-text-light">
              Showing {candidates.length} of {pagination.totalCount} candidates
            </p>
            <p className="text-sm admin-text-light">
              Page {pagination.page} of {pagination.totalPages}
            </p>
          </div>

          {/* Candidate Cards */}
          <div className="grid grid-cols-1 gap-4">
            {candidates.map((candidate) => (
              <div
                key={candidate.id}
                className="admin-card border admin-border rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => viewCandidateProfile(candidate.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Name and availability */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold admin-text">
                        {candidate.name || "No name provided"}
                      </h3>
                      {candidate.available_for_opportunities && (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          Available
                        </span>
                      )}
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-2 text-sm admin-text-light mb-2">
                      <Mail className="h-4 w-4" />
                      {candidate.email}
                    </div>

                    {/* Current position */}
                    {(candidate.current_title || candidate.current_company) && (
                      <div className="flex items-center gap-2 text-sm admin-text mb-2">
                        <Briefcase className="h-4 w-4" />
                        {candidate.current_title && (
                          <span>{candidate.current_title}</span>
                        )}
                        {candidate.current_title && candidate.current_company && (
                          <span>at</span>
                        )}
                        {candidate.current_company && (
                          <span className="font-medium">
                            {candidate.current_company}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Location */}
                    {candidate.location && (
                      <div className="flex items-center gap-2 text-sm admin-text-light mb-2">
                        <MapPin className="h-4 w-4" />
                        {candidate.location}
                      </div>
                    )}

                    {/* Experience */}
                    {candidate.years_experience && (
                      <div className="flex items-center gap-2 text-sm admin-text-light mb-3">
                        <Award className="h-4 w-4" />
                        {candidate.years_experience} years experience
                      </div>
                    )}

                    {/* Skills */}
                    {candidate.skills && candidate.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {candidate.skills.slice(0, 5).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs rounded-full admin-card border admin-border admin-text"
                          >
                            {skill}
                          </span>
                        ))}
                        {candidate.skills.length > 5 && (
                          <span className="px-2 py-1 text-xs rounded-full admin-card border admin-border admin-text-light">
                            +{candidate.skills.length - 5} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bio preview */}
                    {candidate.bio && (
                      <p className="text-sm admin-text-light line-clamp-2 mb-3">
                        {candidate.bio}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs admin-text-light">
                      <span>
                        {candidate.stats.totalApplications} application(s)
                      </span>
                      <span>
                        {candidate.stats.interactionsCount} interaction(s)
                      </span>
                      {candidate.stats.activeInvitationsCount > 0 && (
                        <span className="theme-warning">
                          {candidate.stats.activeInvitationsCount} active invitation(s)
                        </span>
                      )}
                    </div>

                    {/* Links */}
                    {(candidate.linkedin_url || candidate.portfolio_url) && (
                      <div className="flex items-center gap-3 mt-3">
                        {candidate.linkedin_url && (
                          <a
                            href={candidate.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm theme-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            LinkedIn
                          </a>
                        )}
                        {candidate.portfolio_url && (
                          <a
                            href={candidate.portfolio_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm theme-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Portfolio
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        viewCandidateProfile(candidate.id);
                      }}
                      className={`${getButtonClasses("primary")} text-sm px-3 py-2 flex items-center gap-2`}
                      title="View full profile"
                    >
                      <Eye className="h-4 w-4" />
                      View Profile
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                disabled={pagination.page === 1}
                className={`${getButtonClasses("secondary")} ${
                  pagination.page === 1
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                Previous
              </button>
              <span className="text-sm admin-text">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                disabled={!pagination.hasMore}
                className={`${getButtonClasses("secondary")} ${
                  !pagination.hasMore
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
