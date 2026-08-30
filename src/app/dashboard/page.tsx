"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  PlusCircle,
  TrendingUp,
  Users,
  Activity,
  ArrowUpRight,
  Shield,
  FileCheck,
  RotateCcw,
  BarChart2,
  Wrench,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useAuth } from "@/components/auth-provider";
import { formatDate, formatDeadline, getStatusBadgeConfig, getPriorityBadgeConfig } from "@/lib/utils";
import { DeveloperFixModal } from "@/components/issues/DeveloperFixModal";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState("all");
  const [analytics, setAnalytics] = useState<any>(null);
  const [recentIssues, setRecentIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fix modal state for developers
  const [selectedFixIssue, setSelectedFixIssue] = useState<any>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, issuesRes] = await Promise.all([
        fetch(`/api/analytics?timeRange=${timeRange}`),
        fetch(`/api/issues?limit=8&myIssues=${user?.role === "DEVELOPER" ? "true" : "false"}`),
      ]);

      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        setAnalytics(aData);
      }
      if (issuesRes.ok) {
        const iData = await issuesRes.json();
        setRecentIssues(iData.issues || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, timeRange]);

  if (loading || !analytics) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="text-xs font-medium text-slate-500">Loading live quality metrics...</p>
      </div>
    );
  }

  const { summary } = analytics;

  const kpis = [
    { label: "Total Issues", count: summary.totalIssues, icon: Layers, href: "/issues", color: "text-blue-600 bg-blue-500/10 border-blue-200 dark:border-blue-900" },
    { label: "New (Unassigned)", count: summary.newCount, icon: PlusCircle, href: "/issues?status=NEW", color: "text-indigo-600 bg-indigo-500/10 border-indigo-200 dark:border-indigo-900" },
    { label: "In Progress", count: summary.inProgressCount, icon: Activity, href: "/issues?status=IN_PROGRESS", color: "text-amber-600 bg-amber-500/10 border-amber-200 dark:border-amber-900" },
    { label: "In Review", count: summary.inReviewCount, icon: Clock, href: "/issues?status=IN_REVIEW", color: "text-purple-600 bg-purple-500/10 border-purple-200 dark:border-purple-900" },
    { label: "Fixed (Needs QA)", count: summary.fixedCount, icon: Wrench, href: "/issues?status=FIXED", color: "text-cyan-600 bg-cyan-500/10 border-cyan-200 dark:border-cyan-900" },
    { label: "Testing Active", count: summary.testingCount + summary.testedCount + summary.regressionCount, icon: FileCheck, href: "/issues?status=TESTING_IN_PROGRESS", color: "text-pink-600 bg-pink-500/10 border-pink-200 dark:border-pink-900" },
    { label: "Resolved", count: summary.resolvedCount, icon: CheckCircle2, href: "/issues?status=RESOLVED", color: "text-emerald-600 bg-emerald-500/10 border-emerald-200 dark:border-emerald-900" },
    { label: "Reopened", count: summary.reopenedCount, icon: RotateCcw, href: "/issues?status=REOPENED", color: "text-red-600 bg-red-500/10 border-red-200 dark:border-red-900" },
    { label: "Overdue", count: summary.overdueCount, icon: Flame, href: "/issues?overdue=true", color: "text-rose-600 bg-rose-500/15 border-rose-300 dark:border-rose-900 animate-pulse-subtle" },
    { label: "Critical Priority", count: summary.criticalCount, icon: AlertTriangle, href: "/issues?priority=CRITICAL", color: "text-red-600 bg-red-500/10 border-red-200 dark:border-red-900" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {user?.role === "ADMIN" && "Quality & Issue Intelligence Overview"}
              {user?.role === "TESTER" && "QA Testing & Verification Command"}
              {user?.role === "DEVELOPER" && "Developer Workbench & Assignments"}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800">
              Live
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tracking software reliability, deadlines, developer assignment, and regression health.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Time Range Filter (Admin/Tester) */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 text-xs">
            {["all", "30d", "7d", "today"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  timeRange === range
                    ? "bg-blue-600 text-white font-semibold shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {range === "all" ? "All Time" : range === "30d" ? "30 Days" : range === "7d" ? "7 Days" : "Today"}
              </button>
            ))}
          </div>

          {(user?.role === "TESTER" || user?.role === "ADMIN") && (
            <Link
              href="/issues/create"
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 shrink-0"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Issue</span>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={idx}
              href={kpi.href}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                  {kpi.label}
                </span>
                <div className={`p-1.5 rounded-lg border ${kpi.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between mt-3">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                  {kpi.count}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Analytics Charts Section (Admin & Tester) */}
      {(user?.role === "ADMIN" || user?.role === "TESTER") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Distribution Bar Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Issue Status Distribution</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Current workflow pipeline count</p>
              </div>
              <BarChart2 className="h-4 w-4 text-slate-400" />
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.statusDistribution}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#1e293b",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                    {analytics.statusDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Priority Distribution Pie Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Priority Breakdown</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Severity split of reported issues</p>
            </div>

            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.priorityDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {analytics.priorityDistribution.map((entry: any, index: number) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#1e293b",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#fff",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Priority Legend */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {analytics.priorityDistribution.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-slate-600 dark:text-slate-400">{p.name}:</span>
                  <strong className="text-slate-900 dark:text-white ml-auto">{p.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Software Progress Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Software Progress & Resolution Rate</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live calculated percentage of resolved issues across active Vision Datalabs software suites
            </p>
          </div>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {analytics.softwareProgress.map((sw: any) => (
            <div
              key={sw.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  {sw.code}
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {sw.progressPercent}%
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{sw.name}</h4>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${sw.progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Resolved: {sw.resolvedIssues}/{sw.totalIssues}</span>
                <span>Open: {sw.openIssues}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Developer Workload & Availability Table (Visible to Admin & Tester) */}
      {(user?.role === "ADMIN" || user?.role === "TESTER") && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Developer Availability & Workload</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live capacity tracking to prevent assignment bottlenecks and deadline conflicts
              </p>
            </div>
            <Users className="h-4 w-4 text-slate-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Developer</th>
                  <th className="py-2.5 px-3">Active Issues</th>
                  <th className="py-2.5 px-3">In Progress</th>
                  <th className="py-2.5 px-3">Fixed (QA)</th>
                  <th className="py-2.5 px-3">Overdue</th>
                  <th className="py-2.5 px-3">Availability</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {analytics.developerWorkload.map((dev: any) => (
                  <tr key={dev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                          {dev.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white block">{dev.name}</span>
                          <span className="text-[10px] text-slate-400">{dev.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{dev.activeIssuesCount}</td>
                    <td className="py-3 px-3 text-amber-600 font-medium">{dev.inProgressCount}</td>
                    <td className="py-3 px-3 text-cyan-600 font-medium">{dev.fixedCount}</td>
                    <td className="py-3 px-3">
                      {dev.overdueCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-bold text-[10px]">
                          {dev.overdueCount} Overdue
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          dev.availability === "BUSY"
                            ? "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800"
                            : dev.availability === "MODERATE"
                            ? "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800"
                            : "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800"
                        }`}
                      >
                        {dev.availability}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/issues?developerId=${dev.id}`}
                        className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                      >
                        View Assigned →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actionable Issue List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {user?.role === "DEVELOPER" ? "My Active Issue Queue" : "Recent Active Issues"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click any issue to open complete details, timeline, reproduction logs, or status actions
            </p>
          </div>
          <Link href="/issues" className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline">
            View All Issues →
          </Link>
        </div>

        {recentIssues.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30 text-emerald-500" />
            No active issues currently in your queue.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentIssues.map((issue) => {
              const statusBadge = getStatusBadgeConfig(issue.status);
              const priorityBadge = getPriorityBadgeConfig(issue.priority);

              return (
                <div
                  key={issue.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 p-2 rounded-xl transition"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                      {issue.issueCode}
                    </span>

                    <div className="min-w-0">
                      <Link
                        href={`/issues/${issue.issueCode}`}
                        className="text-xs font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition truncate block"
                      >
                        {issue.title}
                      </Link>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                        <span>{issue.software?.name}</span>
                        <span>•</span>
                        <span>{issue.environment}</span>
                        <span>•</span>
                        <span>Due: {formatDeadline(issue.deadlineTimestamp)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${priorityBadge.bg}`}>
                      {priorityBadge.indicator} {priorityBadge.label}
                    </span>

                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold ${statusBadge.bg}`}>
                      {statusBadge.label}
                    </span>

                    {/* Developer 1-Click Fix Button */}
                    {user?.role === "DEVELOPER" && issue.status !== "FIXED" && issue.status !== "RESOLVED" && (
                      <button
                        onClick={() => setSelectedFixIssue(issue)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm transition"
                      >
                        Submit Fix
                      </button>
                    )}

                    <Link
                      href={`/issues/${issue.issueCode}`}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Developer Fix Modal */}
      {selectedFixIssue && (
        <DeveloperFixModal
          isOpen={!!selectedFixIssue}
          onClose={() => setSelectedFixIssue(null)}
          issueCode={selectedFixIssue.issueCode}
          issueTitle={selectedFixIssue.title}
          onFixSubmitted={() => {
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
}
