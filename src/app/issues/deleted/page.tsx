"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trash2,
  RotateCcw,
  Search,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Shield,
  MessageSquare,
  AlertCircle,
  Loader2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { formatDate, getPriorityBadgeConfig, getStatusBadgeConfig, getRoleBadgeConfig } from "@/lib/utils";
import { triggerActionUpdate } from "@/lib/events";

export default function DeletedIssuesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchDeletedIssues = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", page.toString());
      params.set("limit", "15");

      const res = await fetch(`/api/issues/deleted?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setIssues(data.issues || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (err) {
      console.error("Failed to load deleted issues:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedIssues();
  }, [page, search]);

  useEffect(() => {
    const handleAction = () => fetchDeletedIssues(true);
    window.addEventListener("visiontrack:action", handleAction);
    return () => window.removeEventListener("visiontrack:action", handleAction);
  }, []);

  const handleRestore = async (issue: any) => {
    if (!confirm(`Are you sure you want to restore issue ${issue.issueCode}? It will be returned to active issues.`)) {
      return;
    }

    try {
      setRestoringId(issue.id);
      const res = await fetch(`/api/issues/${issue.issueCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESTORE_ISSUE" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to restore issue");
      }

      showToast(`Issue ${issue.issueCode} restored successfully!`);
      triggerActionUpdate();
      fetchDeletedIssues();
    } catch (err: any) {
      showToast(err.message || "Failed to restore issue", "error");
    } finally {
      setRestoringId(null);
    }
  };

  // Only Tester & Admin can view this section
  if (user && user.role !== "ADMIN" && user.role !== "TESTER") {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-4">
        <Shield className="h-12 w-12 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Restricted Access</h2>
        <p className="text-xs text-slate-500">
          The Deleted Issues section is exclusively accessible to Quality Assurance Testers and Administrators.
        </p>
        <Link
          href="/issues"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Active Issues
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 border text-xs font-semibold animate-in slide-in-from-bottom-3 duration-300 ${
            toast.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-red-50 dark:bg-red-950/80 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/issues"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Deleted Issues Archive</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                {pagination.total} Deleted
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Archived records of soft-deleted issues with user identity, deletion timestamp, and mandatory remarks
            </p>
          </div>
        </div>

        <Link
          href="/issues"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold shadow-sm transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Active Issues</span>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by issue code, title, software, remark, or deleted by..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-7 w-7 text-blue-600 animate-spin" />
            <p className="text-xs font-medium text-slate-500">Loading deleted issues archive...</p>
          </div>
        ) : issues.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Deleted Issues Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search ? "No deleted issues match your search criteria." : "There are currently no soft-deleted issues."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Issue Code & Title</th>
                  <th className="py-3 px-4">Software / System</th>
                  <th className="py-3 px-4">Deleted By</th>
                  <th className="py-3 px-4">Deleted At</th>
                  <th className="py-3 px-4">Remark / Reason</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {issues.map((item) => {
                  const priorityBadge = getPriorityBadgeConfig(item.priority);
                  const deletedByRoleBadge = item.deletedBy ? getRoleBadgeConfig(item.deletedBy.role) : null;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                    >
                      {/* Code & Title */}
                      <td className="py-3.5 px-4 min-w-[240px]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                              {item.issueCode}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${priorityBadge.bg}`}>
                              {priorityBadge.label}
                            </span>
                          </div>
                          <Link
                            href={`/issues/${item.issueCode}`}
                            className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition line-clamp-1 block"
                          >
                            {item.title}
                          </Link>
                        </div>
                      </td>

                      {/* Software & Module */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                            {item.software?.name || "—"}
                          </span>
                          {item.module && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                              {item.module.name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Deleted By */}
                      <td className="py-3.5 px-4 min-w-[160px]">
                        {item.deletedBy ? (
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {item.deletedBy.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 dark:text-white block truncate">
                                {item.deletedBy.name}
                              </span>
                              <span className="text-[10px] text-red-600 dark:text-red-400 font-bold block">
                                {item.deletedBy.role}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unknown</span>
                        )}
                      </td>

                      {/* Deleted At */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.deletedAt ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span>{formatDate(item.deletedAt)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <Clock className="h-3 w-3 text-slate-400" />
                              <span>
                                {new Date(item.deletedAt).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Remark */}
                      <td className="py-3.5 px-4 max-w-[260px]">
                        {item.deleteRemark ? (
                          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <span className="text-xs text-amber-900 dark:text-amber-200 font-medium line-clamp-2">
                              &ldquo;{item.deleteRemark}&rdquo;
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No remark provided</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/issues/${item.issueCode}`}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>View</span>
                          </Link>

                          <button
                            onClick={() => handleRestore(item)}
                            disabled={restoringId === item.id}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition disabled:opacity-50"
                            title="Restore issue back to active issues"
                          >
                            {restoringId === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3 w-3" />
                            )}
                            <span>Restore</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total deleted issues)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
