"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Send,
  UserCheck,
  Clock,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  Download,
  RefreshCw,
  Filter,
  Eye,
  Mail,
  MessageSquare,
  Award,
  MapPin,
  Briefcase,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function TalentPoolAnalyticsPage() {
  const router = useRouter();
  const { getButtonClasses } = useThemeClasses();

  const [timeRange, setTimeRange] = useState("30d");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/talent-pool/analytics?range=${timeRange}`);

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
  };

  const timeRangeOptions = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "1y", label: "Last year" },
  ];

  const getChangeIcon = (change) => {
    if (change > 0) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getChangeColor = (change) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-500";
  };

  // Mock data for demonstration - replace with real API data
  const mockAnalytics = {
    overview: {
      totalCandidates: 1245,
      totalCandidatesChange: 8.5,
      activeInvitations: 42,
      activeInvitationsChange: 15.2,
      sourcedCandidates: 86,
      sourcedCandidatesChange: 12.3,
      responseRate: 68,
      responseRateChange: -2.1,
    },
    invitationMetrics: {
      sent: 156,
      viewed: 124,
      applied: 86,
      declined: 12,
      expired: 26,
      responseRate: 68.4,
      averageResponseTime: "2.3 days",
    },
    sourcingMetrics: {
      totalSourced: 86,
      byStatus: {
        Applied: 12,
        Reviewing: 28,
        Interview: 32,
        Hired: 8,
        Rejected: 6,
      },
      conversionRate: 9.3,
      averageTimeToHire: "18 days",
    },
    topPerformers: {
      skills: [
        { name: "JavaScript", count: 342, percentage: 27.5 },
        { name: "React", count: 298, percentage: 23.9 },
        { name: "Node.js", count: 245, percentage: 19.7 },
        { name: "Python", count: 198, percentage: 15.9 },
        { name: "TypeScript", count: 176, percentage: 14.1 },
      ],
      locations: [
        { name: "Toronto", count: 412, percentage: 33.1 },
        { name: "Vancouver", count: 298, percentage: 23.9 },
        { name: "Montreal", count: 186, percentage: 14.9 },
        { name: "Remote", count: 245, percentage: 19.7 },
        { name: "Calgary", count: 104, percentage: 8.4 },
      ],
    },
    activityTimeline: [
      { date: "Mon", invitations: 12, sourcings: 4, interactions: 28 },
      { date: "Tue", invitations: 18, sourcings: 6, interactions: 32 },
      { date: "Wed", invitations: 22, sourcings: 8, interactions: 45 },
      { date: "Thu", invitations: 28, sourcings: 12, interactions: 52 },
      { date: "Fri", invitations: 32, sourcings: 14, interactions: 48 },
      { date: "Sat", invitations: 8, sourcings: 2, interactions: 12 },
      { date: "Sun", invitations: 6, sourcings: 1, interactions: 8 },
    ],
  };

  const data = analytics || mockAnalytics;

  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"];

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-3 admin-text">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold admin-text">Talent Pool Analytics</h1>
          <p className="admin-text-light mt-1">
            Track performance metrics and insights for your talent pool
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border admin-border rounded-lg admin-text admin-card focus:ring-2 theme-primary"
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`${getButtonClasses("secondary")} px-4 py-2 rounded-lg flex items-center gap-2`}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => router.push("/admin/talent-pool")}
            className={`${getButtonClasses("primary")} px-4 py-2 rounded-lg`}
          >
            Back to Talent Pool
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="admin-card border admin-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm admin-text-light">Total Candidates</p>
            <Users className="h-5 w-5 theme-primary opacity-50" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold admin-text">{data.overview.totalCandidates.toLocaleString()}</p>
            <div className={`flex items-center text-sm ${getChangeColor(data.overview.totalCandidatesChange)}`}>
              {getChangeIcon(data.overview.totalCandidatesChange)}
              <span>{Math.abs(data.overview.totalCandidatesChange)}%</span>
            </div>
          </div>
        </div>

        <div className="admin-card border admin-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm admin-text-light">Active Invitations</p>
            <Send className="h-5 w-5 theme-success opacity-50" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold admin-text">{data.overview.activeInvitations}</p>
            <div className={`flex items-center text-sm ${getChangeColor(data.overview.activeInvitationsChange)}`}>
              {getChangeIcon(data.overview.activeInvitationsChange)}
              <span>{Math.abs(data.overview.activeInvitationsChange)}%</span>
            </div>
          </div>
        </div>

        <div className="admin-card border admin-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm admin-text-light">Sourced Candidates</p>
            <UserCheck className="h-5 w-5 theme-accent opacity-50" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold admin-text">{data.overview.sourcedCandidates}</p>
            <div className={`flex items-center text-sm ${getChangeColor(data.overview.sourcedCandidatesChange)}`}>
              {getChangeIcon(data.overview.sourcedCandidatesChange)}
              <span>{Math.abs(data.overview.sourcedCandidatesChange)}%</span>
            </div>
          </div>
        </div>

        <div className="admin-card border admin-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm admin-text-light">Response Rate</p>
            <Target className="h-5 w-5 theme-warning opacity-50" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold admin-text">{data.overview.responseRate}%</p>
            <div className={`flex items-center text-sm ${getChangeColor(data.overview.responseRateChange)}`}>
              {getChangeIcon(data.overview.responseRateChange)}
              <span>{Math.abs(data.overview.responseRateChange)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline Chart */}
      <div className="admin-card border admin-border rounded-lg p-6">
        <h2 className="text-xl font-bold admin-text mb-4">Activity Timeline</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.activityTimeline}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="date" className="admin-text" />
            <YAxis className="admin-text" />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card-bg)",
                border: "1px solid var(--border-color)",
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="invitations"
              stackId="1"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="sourcings"
              stackId="1"
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="interactions"
              stackId="1"
              stroke="#F59E0B"
              fill="#F59E0B"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invitation Metrics */}
        <div className="admin-card border admin-border rounded-lg p-6">
          <h2 className="text-xl font-bold admin-text mb-4">Invitation Metrics</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm admin-text-light">Sent</span>
              <span className="font-semibold admin-text">{data.invitationMetrics.sent}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm admin-text-light">Viewed</span>
              <span className="font-semibold admin-text">{data.invitationMetrics.viewed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm admin-text-light">Applied</span>
              <span className="font-semibold theme-success">{data.invitationMetrics.applied}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm admin-text-light">Declined</span>
              <span className="font-semibold theme-danger">{data.invitationMetrics.declined}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm admin-text-light">Expired</span>
              <span className="font-semibold admin-text-light">{data.invitationMetrics.expired}</span>
            </div>
            <div className="border-t admin-border pt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium admin-text">Response Rate</span>
                <span className="font-bold theme-primary text-lg">{data.invitationMetrics.responseRate}%</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm font-medium admin-text">Avg Response Time</span>
                <span className="font-semibold admin-text">{data.invitationMetrics.averageResponseTime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sourcing Metrics */}
        <div className="admin-card border admin-border rounded-lg p-6">
          <h2 className="text-xl font-bold admin-text mb-4">Sourcing Pipeline</h2>
          <div className="mb-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={Object.entries(data.sourcingMetrics.byStatus).map(([key, value]) => ({
                    name: key,
                    value,
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label
                >
                  {Object.entries(data.sourcingMetrics.byStatus).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium admin-text">Total Sourced</span>
              <span className="font-bold admin-text">{data.sourcingMetrics.totalSourced}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium admin-text">Conversion Rate</span>
              <span className="font-bold theme-success">{data.sourcingMetrics.conversionRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium admin-text">Avg Time to Hire</span>
              <span className="font-semibold admin-text">{data.sourcingMetrics.averageTimeToHire}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Skills and Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Skills */}
        <div className="admin-card border admin-border rounded-lg p-6">
          <h2 className="text-xl font-bold admin-text mb-4">Top Skills in Pool</h2>
          <div className="space-y-3">
            {data.topPerformers.skills.map((skill, index) => (
              <div key={skill.name}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm admin-text">{skill.name}</span>
                  <span className="text-sm admin-text-light">{skill.count} ({skill.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${skill.percentage}%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Locations */}
        <div className="admin-card border admin-border rounded-lg p-6">
          <h2 className="text-xl font-bold admin-text mb-4">Top Locations</h2>
          <div className="space-y-3">
            {data.topPerformers.locations.map((location, index) => (
              <div key={location.name}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm admin-text">{location.name}</span>
                  <span className="text-sm admin-text-light">{location.count} ({location.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${location.percentage}%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}