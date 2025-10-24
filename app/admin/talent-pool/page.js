"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useThemeClasses } from "../../contexts/AdminThemeContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  exportTalentPoolToExcel,
  exportTalentPoolToCSV,
  exportSelectedCandidates,
} from "@/app/utils/talentPoolExport";
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
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileDown,
  RefreshCw,
  Grid3X3,
  List,
  CheckSquare,
  Square,
  StickyNote,
  Target,
  TrendingUp,
} from "lucide-react";

export default function TalentPoolPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getButtonClasses } = useThemeClasses();
  const queryClient = useQueryClient();

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
    hasMore: false,
  });

  // View mode (table or cards)
  const [viewMode, setViewMode] = useState("table"); // "table" or "cards"

  // Bulk operations
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    search: "",
    skills: "",
    location: "",
    availableOnly: false,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  // Job matching removed - premium feature

  useEffect(() => {
    fetchCandidates();
  }, [pagination.page, filters, sortBy, sortOrder]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder,
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
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setSelectedCandidates([]);
    await fetchCandidates();
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSelectedCandidates([]);
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      skills: "",
      location: "",
      availableOnly: false,
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSelectedCandidates([]);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const viewCandidateProfile = (candidateId) => {
    router.push(`/admin/talent-pool/${candidateId}`);
  };

  // Bulk selection handlers
  const toggleCandidateSelection = (candidateId) => {
    setSelectedCandidates((prev) => {
      if (prev.includes(candidateId)) {
        return prev.filter((id) => id !== candidateId);
      }
      return [...prev, candidateId];
    });
  };

  const toggleSelectAll = () => {
    if (selectedCandidates.length === candidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(candidates.map((c) => c.id));
    }
  };

  // Export handlers
  const handleExport = (format) => {
    const dataToExport = selectedCandidates.length > 0
      ? candidates.filter((c) => selectedCandidates.includes(c.id))
      : candidates;

    if (format === "excel") {
      exportTalentPoolToExcel(dataToExport, filters);
    } else if (format === "csv") {
      exportTalentPoolToCSV(dataToExport, filters);
    }
  };

  // Bulk action handlers removed - these are premium features in applications-manager

  const hasActiveFilters = Object.values(filters).some((val) =>
    typeof val === "boolean" ? val : val.length > 0
  );

  // Calculate stats (without premium matching features)
  const stats = useMemo(() => {
    if (!candidates || candidates.length === 0) return null;

    const availableCount = candidates.filter(c => c.available_for_opportunities).length;
    const withSkillsCount = candidates.filter(c => c.skills && c.skills.length > 0).length;
    const withExperienceCount = candidates.filter(c => c.years_experience > 0).length;

    return {
      total: pagination.totalCount,
      available: availableCount,
      withSkills: withSkillsCount,
      withExperience: withExperienceCount,
    };
  }, [candidates, pagination.totalCount]);

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold admin-text">Talent Pool</h1>
          <p className="admin-text-light mt-1">
            Browse and search registered candidates to proactively reach out for opportunities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`${getButtonClasses("secondary")} px-4 py-2 rounded-lg flex items-center gap-2`}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <div className="relative group">
            <button
              className={`${getButtonClasses("secondary")} px-4 py-2 rounded-lg flex items-center gap-2`}
            >
              <FileDown className="h-4 w-4" />
              Export
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border admin-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport("excel")}
                className="w-full text-left px-4 py-2 text-sm admin-text hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export to Excel
              </button>
              <button
                onClick={() => handleExport("csv")}
                className="w-full text-left px-4 py-2 text-sm admin-text hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <FileDown className="h-4 w-4" />
                Export to CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="admin-card border admin-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm admin-text-light">Total Candidates</p>
                <p className="text-2xl font-bold admin-text">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 theme-primary opacity-50" />
            </div>
          </div>
          <div className="admin-card border admin-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm admin-text-light">Available Now</p>
                <p className="text-2xl font-bold admin-text">{stats.available}</p>
              </div>
              <Target className="h-8 w-8 theme-success opacity-50" />
            </div>
          </div>
          <div className="admin-card border admin-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm admin-text-light">With Skills</p>
                <p className="text-2xl font-bold admin-text">{stats.withSkills}</p>
              </div>
              <Award className="h-8 w-8 theme-accent opacity-50" />
            </div>
          </div>
          <div className="admin-card border admin-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm admin-text-light">Experienced</p>
                <p className="text-2xl font-bold admin-text">{stats.withExperience}</p>
              </div>
              <TrendingUp className="h-8 w-8 theme-warning opacity-50" />
            </div>
          </div>
        </div>
      )}

      {/* Search, Filters, and View Toggle */}
      <div className="admin-card border admin-border rounded-lg p-4 space-y-4">
        {/* Search Bar and View Toggle */}
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`${getButtonClasses("secondary")} px-4 py-2 rounded-lg flex items-center gap-2`}
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
            <div className="flex items-center rounded-lg border admin-border">
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-2 ${
                  viewMode === "table"
                    ? "theme-primary-bg text-white"
                    : "admin-text hover:bg-gray-100 dark:hover:bg-gray-700"
                } rounded-l-lg transition-colors`}
                title="Table view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`px-3 py-2 ${
                  viewMode === "cards"
                    ? "theme-primary-bg text-white"
                    : "admin-text hover:bg-gray-100 dark:hover:bg-gray-700"
                } rounded-r-lg transition-colors`}
                title="Card view"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
            </div>
          </div>
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

      {/* Bulk Actions Bar */}
      {selectedCandidates.length > 0 && (
        <div className="admin-card border admin-border rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm admin-text">
              {selectedCandidates.length} candidate{selectedCandidates.length !== 1 ? "s" : ""} selected
            </span>
            <button
              onClick={() => handleExport("excel")}
              className={`${getButtonClasses("secondary")} px-3 py-1.5 rounded-lg text-sm flex items-center gap-2`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Selected
            </button>
          </div>
          <button
            onClick={() => setSelectedCandidates([])}
            className="text-sm theme-danger hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Results */}
      {loading && !refreshing ? (
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
              className={`${getButtonClasses("secondary")} px-4 py-2 rounded-lg mt-4`}
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
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSelectAll}
                className="text-sm theme-primary hover:underline flex items-center gap-1"
              >
                {selectedCandidates.length === candidates.length ? (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    Deselect all
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4" />
                    Select all
                  </>
                )}
              </button>
              <p className="text-sm admin-text-light">
                Page {pagination.page} of {pagination.totalPages}
              </p>
            </div>
          </div>

          {/* Table View */}
          {viewMode === "table" ? (
            <div className="admin-card border admin-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b admin-border">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedCandidates.length === candidates.length}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium admin-text uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center gap-1">
                          Name
                          {sortBy === "name" && (
                            <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium admin-text uppercase tracking-wider">
                        Current Position
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium admin-text uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => handleSort("location")}
                      >
                        <div className="flex items-center gap-1">
                          Location
                          {sortBy === "location" && (
                            <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium admin-text uppercase tracking-wider">
                        Skills
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium admin-text uppercase tracking-wider">
                        Experience
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium admin-text uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium admin-text uppercase tracking-wider">
                        Stats
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium admin-text uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y admin-border">
                    {candidates.map((candidate) => (
                      <tr
                        key={candidate.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        onClick={() => viewCandidateProfile(candidate.id)}
                      >
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedCandidates.includes(candidate.id)}
                            onChange={() => toggleCandidateSelection(candidate.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <div className="text-sm font-medium admin-text">
                              {candidate.name || "No name provided"}
                            </div>
                            <div className="text-sm admin-text-light">{candidate.email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm admin-text">
                            {candidate.current_title && (
                              <div>{candidate.current_title}</div>
                            )}
                            {candidate.current_company && (
                              <div className="admin-text-light">
                                at {candidate.current_company}
                              </div>
                            )}
                            {!candidate.current_title && !candidate.current_company && (
                              <span className="admin-text-light">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm admin-text">
                            {candidate.location || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1">
                            {candidate.skills && candidate.skills.length > 0 ? (
                              <>
                                {candidate.skills.slice(0, 3).map((skill, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 text-xs rounded-full admin-card border admin-border"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {candidate.skills.length > 3 && (
                                  <span className="px-2 py-1 text-xs rounded-full admin-text-light">
                                    +{candidate.skills.length - 3}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="admin-text-light text-sm">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm admin-text">
                            {candidate.years_experience
                              ? `${candidate.years_experience} years`
                              : "-"}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {candidate.available_for_opportunities ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                              Available
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                              Not Available
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-xs admin-text-light space-y-1">
                            <div>{candidate.stats?.totalApplications || 0} applications</div>
                            <div>{candidate.stats?.interactionsCount || 0} interactions</div>
                            {candidate.stats?.activeInvitationsCount > 0 && (
                              <div className="theme-warning">
                                {candidate.stats.activeInvitationsCount} active invites
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => viewCandidateProfile(candidate.id)}
                              className={`${getButtonClasses("primary")} text-xs px-2 py-1 rounded`}
                              title="View profile"
                            >
                              <Eye className="h-3 w-3" />
                            </button>
                            {candidate.linkedin_url && (
                              <a
                                href={candidate.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                                title="LinkedIn"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {candidate.portfolio_url && (
                              <a
                                href={candidate.portfolio_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-600 hover:text-purple-800"
                                title="Portfolio"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Card View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="admin-card border admin-border rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer relative"
                  onClick={() => viewCandidateProfile(candidate.id)}
                >
                  {/* Selection checkbox */}
                  <div
                    className="absolute top-4 right-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCandidates.includes(candidate.id)}
                      onChange={() => toggleCandidateSelection(candidate.id)}
                      className="rounded border-gray-300"
                    />
                  </div>

                  <div className="pr-8">
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
                        {candidate.current_title && <span>{candidate.current_title}</span>}
                        {candidate.current_title && candidate.current_company && (
                          <span>at</span>
                        )}
                        {candidate.current_company && (
                          <span className="font-medium">{candidate.current_company}</span>
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
                    <div className="flex items-center gap-4 text-xs admin-text-light mb-3">
                      <span>{candidate.stats?.totalApplications || 0} application(s)</span>
                      <span>{candidate.stats?.interactionsCount || 0} interaction(s)</span>
                      {candidate.stats?.activeInvitationsCount > 0 && (
                        <span className="theme-warning">
                          {candidate.stats.activeInvitationsCount} active invitation(s)
                        </span>
                      )}
                    </div>

                    {/* Links and Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          viewCandidateProfile(candidate.id);
                        }}
                        className={`${getButtonClasses("primary")} text-sm px-3 py-1.5 rounded-lg flex items-center gap-2`}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                disabled={pagination.page === 1}
                className={`${getButtonClasses("secondary")} px-4 py-2 rounded-lg flex items-center gap-2 ${
                  pagination.page === 1 ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <div className="flex items-center gap-2">
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = pagination.page <= 3
                    ? i + 1
                    : pagination.page + i - 2;
                  if (pageNum > 0 && pageNum <= pagination.totalPages) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() =>
                          setPagination((prev) => ({ ...prev, page: pageNum }))
                        }
                        className={`px-3 py-1 rounded ${
                          pageNum === pagination.page
                            ? "theme-primary-bg text-white"
                            : "admin-card border admin-border hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                disabled={!pagination.hasMore}
                className={`${getButtonClasses("secondary")} px-4 py-2 rounded-lg flex items-center gap-2 ${
                  !pagination.hasMore ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}