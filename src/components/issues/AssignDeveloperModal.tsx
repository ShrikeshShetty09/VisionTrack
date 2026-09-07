"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  UserCheck,
  AlertTriangle,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  Search,
  Check,
  Users,
} from "lucide-react";

interface AssignDeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
  issueCode: string;
  issueTitle: string;
  currentDeveloperId?: string | null;
  currentDeveloperIds?: string[];
  currentDeadlineDate?: string | null;
  currentDeadlineTime?: string | null;
  onAssigned: () => void;
}

export function AssignDeveloperModal({
  isOpen,
  onClose,
  issueCode,
  issueTitle,
  currentDeveloperId,
  currentDeveloperIds,
  currentDeadlineDate,
  currentDeadlineTime,
  onAssigned,
}: AssignDeveloperModalProps) {
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedDevIds, setSelectedDevIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deadlineDate, setDeadlineDate] = useState(currentDeadlineDate || "");
  const [deadlineTime, setDeadlineTime] = useState(currentDeadlineTime || "18:30");
  const [notes, setNotes] = useState("");
  const [fetchingUsers, setFetchingUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [warningIgnored, setWarningIgnored] = useState(false);

  const prevIsOpenRef = React.useRef(false);

  useEffect(() => {
    // Only reset state when the modal transitions from closed to open
    if (isOpen && !prevIsOpenRef.current) {
      const initialIds =
        currentDeveloperIds && currentDeveloperIds.length > 0
          ? currentDeveloperIds
          : currentDeveloperId
          ? [currentDeveloperId]
          : [];
      setSelectedDevIds(initialIds);
      setDeadlineDate(currentDeadlineDate || "");
      setDeadlineTime(currentDeadlineTime || "18:30");
      setNotes("");
      setError("");
      setSearchQuery("");
      setWarningIgnored(false);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, currentDeveloperId, currentDeveloperIds, currentDeadlineDate, currentDeadlineTime]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchUsers = async () => {
      try {
        setFetchingUsers(true);
        const [analyticsRes, usersRes] = await Promise.all([
          fetch("/api/analytics?timeRange=all"),
          fetch("/api/users?activeOnly=true"),
        ]);

        let devWorkloads: Record<string, any> = {};
        if (analyticsRes.ok) {
          const aData = await analyticsRes.json();
          (aData.developerWorkload || []).forEach((w: any) => {
            devWorkloads[w.id] = w;
          });
        }

        if (usersRes.ok) {
          const uData = await usersRes.json();
          const merged = (uData.users || []).map((u: any) => {
            const wl = devWorkloads[u.id];
            return {
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              activeIssuesCount: wl?.activeIssuesCount ?? 0,
              overdueCount: wl?.overdueCount ?? 0,
              urgentUpcomingDeadlines: wl?.urgentUpcomingDeadlines ?? 0,
              availability: wl?.availability ?? (u.role === "DEVELOPER" ? "AVAILABLE" : "N/A"),
            };
          });
          setAvailableUsers(merged);
        } else if (analyticsRes.ok) {
          const aData = await analyticsRes.json();
          setAvailableUsers(aData.developerWorkload || []);
        }
      } catch (err) {
        console.error("Error fetching assignable users:", err);
      } finally {
        setFetchingUsers(false);
      }
    };
    fetchUsers();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleUser = (userId: string) => {
    setSelectedDevIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
    setWarningIgnored(false);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedDevIds((prev) => prev.filter((id) => id !== userId));
  };

  const filteredUsers = availableUsers.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const selectedUsersList = availableUsers.filter((u) => selectedDevIds.includes(u.id));

  // Check if any selected user has workload warnings
  const busySelectedUsers = selectedUsersList.filter(
    (u) => u.activeIssuesCount >= 5 || u.urgentUpcomingDeadlines >= 2 || u.overdueCount >= 2
  );
  const showWorkloadWarning = busySelectedUsers.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDevIds.length === 0) {
      setError("Please select at least one user to assign.");
      return;
    }
    if (!deadlineDate) {
      setError("Please specify a deadline date.");
      return;
    }

    if (showWorkloadWarning && !warningIgnored) {
      setError("Please acknowledge the workload conflict warning or choose other assignees.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Accurately compute client-side local ISO timestamp so server doesn't alter date or time
      const [year, month, day] = deadlineDate.split("-").map(Number);
      const [h, m] = (deadlineTime || "18:30").split(":").map(Number);
      const localDeadline = new Date(year, month - 1, day, isNaN(h) ? 18 : h, isNaN(m) ? 30 : m, 0, 0);

      const res = await fetch(`/api/issues/${issueCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN_DEVELOPER",
          developerIds: selectedDevIds,
          developerId: selectedDevIds[0],
          deadlineDate,
          deadlineTime: deadlineTime || "18:30",
          deadlineTimestamp: localDeadline.toISOString(),
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to assign issue");
      }

      onAssigned();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to assign users");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                {issueCode}
              </span>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Assign Issue to User(s) & Set Deadline
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md mt-0.5">
              {issueTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* User Selection Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                Select Assignee(s) <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-medium text-slate-500">
                {selectedDevIds.length} user{selectedDevIds.length === 1 ? "" : "s"} selected
              </span>
            </div>

            {/* Selected User Chips */}
            {selectedUsersList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-100/70 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60">
                {selectedUsersList.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 shadow-xs"
                  >
                    <span>{u.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveUser(u.id)}
                      className="text-slate-400 hover:text-red-500 rounded-sm p-0.5 transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* User Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search active users by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* User List with Multi-Select Checkboxes */}
            {fetchingUsers ? (
              <div className="py-4 text-center text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                Loading users and availability...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-950/50">
                {filteredUsers.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">No users match search.</div>
                ) : (
                  filteredUsers.map((userItem) => {
                    const isSelected = selectedDevIds.includes(userItem.id);
                    const isBusy = userItem.availability === "BUSY";
                    const isModerate = userItem.availability === "MODERATE";

                    return (
                      <div
                        key={userItem.id}
                        onClick={() => handleToggleUser(userItem.id)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition flex items-center justify-between gap-2 text-xs ${
                          isSelected
                            ? "bg-blue-500/10 border-blue-500 ring-1 ring-blue-500 text-blue-900 dark:text-blue-200"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`h-4 w-4 rounded flex items-center justify-center border transition ${
                              isSelected
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-slate-300 dark:border-slate-700"
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>

                          <div className="h-7 w-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {userItem.name.charAt(0)}
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {userItem.name}
                              </span>
                              <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                {userItem.role}
                              </span>
                            </div>
                            <span className="text-slate-400 text-[10px] block truncate">{userItem.email}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 text-right">
                          {userItem.role === "DEVELOPER" && (
                            <div className="text-[10px] text-slate-500">
                              <span>{userItem.activeIssuesCount} active</span>
                              {userItem.overdueCount > 0 && (
                                <span className="text-red-500 font-bold ml-1">
                                  ({userItem.overdueCount} overdue)
                                </span>
                              )}
                            </div>
                          )}
                          {userItem.availability !== "N/A" && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isBusy
                                  ? "bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/40"
                                  : isModerate
                                  ? "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900/40"
                                  : "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900/40"
                              }`}
                            >
                              {userItem.availability}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Workload Warning Box */}
          {showWorkloadWarning && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 rounded-xl text-xs space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Assignee Workload Conflict Warning</span>
              </div>
              <p className="text-amber-700 dark:text-amber-400 leading-relaxed text-[11px]">
                The following selected user(s) currently have high active workloads:
              </p>
              <ul className="list-disc list-inside text-amber-800 dark:text-amber-300 text-[11px] font-medium space-y-0.5 pl-1">
                {busySelectedUsers.map((bu) => (
                  <li key={bu.id}>
                    <strong>{bu.name}</strong> ({bu.activeIssuesCount} active issues
                    {bu.urgentUpcomingDeadlines > 0 ? `, ${bu.urgentUpcomingDeadlines} due soon` : ""})
                  </li>
                ))}
              </ul>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={warningIgnored}
                  onChange={(e) => setWarningIgnored(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                  Assign anyway despite workload warning
                </span>
              </label>
            </div>
          )}

          {/* Deadline Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Deadline Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Deadline Time (HH:MM) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  required
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Assignment Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Assignment Notes / Instructions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific instructions, priority requests, or reproduction details for the assigned team..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">
            {selectedDevIds.length > 0 ? (
              <span>
                Assigning to <strong>{selectedDevIds.length}</strong> user{selectedDevIds.length === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="text-amber-500">No users selected</span>
            )}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || selectedDevIds.length === 0 || (showWorkloadWarning && !warningIgnored)}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              <span>
                {selectedDevIds.length > 1
                  ? `Assign ${selectedDevIds.length} Users & Notify`
                  : "Assign Issue & Notify"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
