"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Filter,
  PlusCircle,
  Clock,
  Layers,
  ArrowUpDown,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Flame,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { formatDate, formatDeadline, getStatusBadgeConfig, getPriorityBadgeConfig } from "@/lib/utils";
import { IssueStatus, Priority, Environment } from "@/types";

function IssuesTableContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters - initialized from searchParams
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState<string>(searchParams.get("status") || "");
  const [priority, setPriority] = useState<string>(searchParams.get("priority") || "");
  const [softwareId, setSoftwareId] = useState(searchParams.get("softwareId") || "");
  const [moduleId, setModuleId] = useState(searchParams.get("moduleId") || "");
  const [developerId, setDeveloperId] = useState(searchParams.get("developerId") || "");
  const [overdueOnly, setOverdueOnly] = useState(searchParams.get("overdue") === "true");
  const [myIssuesOnly, setMyIssuesOnly] = useState(searchParams.get("myIssues") === "true");

  // Sorting and Pagination
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Data
  const [issues, setIssues] = useState<any[]>([]);
  const [softwareList, setSoftwareList] = useState<any[]>([]);
  const [developers, setDevelopers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter drawer toggle
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Sync state whenever URL query params change (e.g. clicking sidebar links or dashboard cards)
  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setStatus(searchParams.get("status") || "");
    setPriority(searchParams.get("priority") || "");
    setSoftwareId(searchParams.get("softwareId") || "");
    setModuleId(searchParams.get("moduleId") || "");
    setDeveloperId(searchParams.get("developerId") || "");
    setOverdueOnly(searchParams.get("overdue") === "true");
    setMyIssuesOnly(searchParams.get("myIssues") === "true");
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    // Fetch dropdown filter options
    const fetchOptions = async () => {
      try {
        const [swRes, devRes] = await Promise.all([
          fetch("/api/software"),
          fetch("/api/analytics?timeRange=all"),
        ]);
        if (swRes.ok) {
          const sw = await swRes.json();
          setSoftwareList(sw.software || []);
        }
        if (devRes.ok) {
          const devs = await devRes.json();
          setDevelopers(devs.developerWorkload || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchOptions();
  }, []);

  const fetchIssues = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (softwareId) params.set("softwareId", softwareId);
      if (moduleId) params.set("moduleId", moduleId);
      if (developerId) params.set("developerId", developerId);
      if (overdueOnly) params.set("overdue", "true");
      if (myIssuesOnly) params.set("myIssues", "true");
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("page", page.toString());
      params.set("limit", "15");

      const res = await fetch(`/api/issues?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setIssues(data.issues || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
    // Silent periodic refresh every 10s for issues list
    const interval = setInterval(() => {
      fetchIssues(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [page, sortBy, sortOrder, status, priority, softwareId, moduleId, developerId, overdueOnly, myIssuesOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchIssues();
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatus("");
    setPriority("");
    setSoftwareId("");
    setModuleId("");
    setDeveloperId("");
    setOverdueOnly(false);
    setMyIssuesOnly(false);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Issue & Defect Repository
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse, search, filter, and track all software quality issues and verification lifecycles
          </p>
        </div>

        {(user?.role === "TESTER" || user?.role === "ADMIN") && (
          <Link
            href="/issues/create"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Issue</span>
          </Link>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by VT-code, title, description, software, or developer..."
              className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </form>

          {/* Filter Trigger Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition w-full sm:w-auto justify-center ${
                showFilterDrawer || status || priority || softwareId || developerId || overdueOnly || myIssuesOnly
                  ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filters</span>
              {(status || priority || softwareId || developerId || overdueOnly || myIssuesOnly) && (
                <span className="h-2 w-2 rounded-full bg-blue-600" />
              )}
            </button>

            <button
              onClick={handleClearFilters}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Clear all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Drawer */}
        {showFilterDrawer && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-fade-in">
            {/* Status Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="NEW">NEW</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="IN_REVIEW">IN REVIEW</option>
                <option value="FIXED">FIXED (Needs QA)</option>
                <option value="TESTING_IN_PROGRESS">TESTING IN PROGRESS</option>
                <option value="TESTED">TESTED (Passed)</option>
                <option value="REGRESSION">REGRESSION PENDING</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="REOPENED">REOPENED</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value="">All Priorities</option>
                <option value="CRITICAL">🔴 Critical</option>
                <option value="HIGH">🟠 High</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="LOW">🔵 Low</option>
              </select>
            </div>

            {/* Software Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Software Suite
              </label>
              <select
                value={softwareId}
                onChange={(e) => {
                  setSoftwareId(e.target.value);
                  setModuleId("");
                  setPage(1);
                }}
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value="">All Software</option>
                {softwareList.map((sw) => (
                  <option key={sw.id} value={sw.id}>
                    {sw.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Module Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Module / Feature
              </label>
              <select
                value={moduleId}
                onChange={(e) => {
                  setModuleId(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value="">All Modules</option>
                {softwareList
                  .filter((sw) => !softwareId || sw.id === softwareId)
                  .flatMap((sw) =>
                    (sw.modules || []).map((m: any) => ({
                      ...m,
                      swName: sw.name,
                    }))
                  )
                  .map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {!softwareId ? `[${m.swName}] ${m.name}` : m.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Developer Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Assigned Developer
              </label>
              <select
                value={developerId}
                onChange={(e) => {
                  setDeveloperId(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value="">All Developers</option>
                {developers.map((dev) => (
                  <option key={dev.id} value={dev.id}>
                    {dev.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Overdue Toggle */}
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={overdueOnly}
                  onChange={(e) => {
                    setOverdueOnly(e.target.checked);
                    setPage(1);
                  }}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5" /> Overdue Only
                </span>
              </label>
            </div>

            {/* My Issues Toggle */}
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={myIssuesOnly}
                  onChange={(e) => {
                    setMyIssuesOnly(e.target.checked);
                    setPage(1);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-blue-600 dark:text-blue-400">My Scoped Issues</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Issues Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-2">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading issues...</p>
          </div>
        ) : issues.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <CheckCircle2 className="h-10 w-10 text-slate-400 mx-auto opacity-40" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No issues found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No issues match your active search or filter criteria. Try clearing your filters or create a new quality issue.
            </p>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider bg-slate-50/50 dark:bg-slate-950/50">
                <tr>
                  <th className="py-3 px-4">Issue Code</th>
                  <th className="py-3 px-4">Title & Details</th>
                  <th className="py-3 px-4">Software</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Developer</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {issues.map((issue) => {
                  const statusBadge = getStatusBadgeConfig(issue.status);
                  const priorityBadge = getPriorityBadgeConfig(issue.priority);

                  return (
                    <tr
                      key={issue.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group cursor-pointer"
                      onClick={() => router.push(`/issues/${issue.issueCode}`)}
                    >
                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition">
                          {issue.issueCode}
                        </span>
                      </td>

                      {/* Title */}
                      <td className="py-3.5 px-4 max-w-xs sm:max-w-sm">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 block">
                          {issue.title}
                        </span>
                        <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {issue.description}
                        </span>
                      </td>

                      {/* Software & Module */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800 dark:text-slate-200 block truncate">
                          {issue.software?.name}
                        </span>
                        {issue.module && (
                          <span className="text-[10px] text-slate-400 block truncate">
                            {issue.module.name}
                          </span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold inline-block ${priorityBadge.bg}`}>
                          {priorityBadge.indicator} {priorityBadge.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold inline-block ${statusBadge.bg}`}>
                          {statusBadge.label}
                        </span>
                      </td>

                      {/* Developer */}
                      <td className="py-3.5 px-4">
                        {issue.assignedDeveloper ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                              {issue.assignedDeveloper.name.charAt(0)}
                            </div>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {issue.assignedDeveloper.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Deadline */}
                      <td className="py-3.5 px-4">
                        {issue.deadlineTimestamp ? (
                          <div className="flex items-center gap-1">
                            {issue.isOverdue && issue.status !== "RESOLVED" && (
                              <Flame className="h-3.5 w-3.5 text-red-500 shrink-0 animate-pulse" />
                            )}
                            <span
                              className={`text-[11px] font-mono ${
                                issue.isOverdue && issue.status !== "RESOLVED"
                                  ? "text-red-600 dark:text-red-400 font-bold"
                                  : "text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              {formatDeadline(issue.deadlineTimestamp)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {formatDate(issue.createdAt, "dd MMM yyyy")}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/issues/${issue.issueCode}`}
                          className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 inline-block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {issues.length} of {pagination.total} total issues
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function IssuesPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs text-slate-500">Loading issues...</div>}>
      <IssuesTableContent />
    </Suspense>
  );
}
