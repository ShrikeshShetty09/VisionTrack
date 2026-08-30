"use client";

import React, { useState, useEffect } from "react";
import { ScrollText, Search, Shield, ChevronLeft, ChevronRight, Loader2, Eye, Filter } from "lucide-react";
import { formatDate, getRoleBadgeConfig } from "@/lib/utils";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (entityType) params.set("entityType", entityType);
      params.set("page", page.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, entityType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-indigo-600" />
          <span>System Audit Trail & Compliance Logs</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Immutable records of all quality actions, status transitions, developer fixes, and administrative overrides
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-3 justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action or entity..."
            className="w-full text-xs pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
          >
            <option value="">All Entities</option>
            <option value="Issue">Issue Events</option>
            <option value="User">User Events</option>
            <option value="Resolution">Resolution Events</option>
            <option value="Testing">Testing Events</option>
            <option value="Regression">Regression Events</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-2">
            <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading audit trail...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">No audit records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider bg-slate-50/50 dark:bg-slate-950/50">
                <tr>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => {
                  const roleBadge = log.user ? getRoleBadgeConfig(log.user.role) : null;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {log.action}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{log.entityType}</span>
                        <span className="text-[10px] text-slate-400 block font-mono truncate">{log.entityId}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {log.user ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-900 dark:text-white">{log.user.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded border ${roleBadge?.bg}`}>
                              {roleBadge?.label}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">System Trigger</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                        {log.ipAddress || "127.0.0.1"}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1 text-slate-400 hover:text-indigo-600 transition"
                          title="Inspect JSON payload"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
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
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {logs.length} of {pagination.total} audit events</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* JSON Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Audit Event Details</h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs overflow-y-auto max-h-[70vh]">
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Action:</span>
                <span className="font-mono text-indigo-600 font-bold">{selectedLog.action}</span>
              </div>
              {selectedLog.oldValue && (
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Old Value State:</span>
                  <pre className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 text-[11px] font-mono overflow-x-auto text-slate-800 dark:text-slate-200">
                    {selectedLog.oldValue}
                  </pre>
                </div>
              )}
              {selectedLog.newValue && (
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">New Value State:</span>
                  <pre className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 text-[11px] font-mono overflow-x-auto text-slate-800 dark:text-slate-200">
                    {selectedLog.newValue}
                  </pre>
                </div>
              )}
              {selectedLog.metadata && (
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Metadata:</span>
                  <pre className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 text-[11px] font-mono overflow-x-auto text-slate-800 dark:text-slate-200">
                    {selectedLog.metadata}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
