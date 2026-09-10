"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  UserPlus,
  Users,
  Calendar,
  Clock,
  Check,
  Search,
  X,
  ChevronDown,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { triggerActionUpdate } from "@/lib/events";

interface RowAssigneeDropdownProps {
  issue: any;
  availableUsers?: any[];
  canAssign: boolean;
  onUpdated: (updatedIssue: any) => void;
}

export function RowAssigneeDropdown({
  issue,
  availableUsers: propUsers,
  canAssign,
  onUpdated,
}: RowAssigneeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<any[]>(propUsers || []);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("18:30");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    placeAbove: false,
  });

  // Sync prop users if passed
  useEffect(() => {
    if (propUsers && propUsers.length > 0) {
      setUsers(propUsers);
    }
  }, [propUsers]);

  // When opening dropdown, initialize local state from current issue
  useEffect(() => {
    if (isOpen) {
      const initialIds =
        issue.assignees && issue.assignees.length > 0
          ? issue.assignees.map((a: any) => a.id)
          : issue.assignedDeveloperId
          ? [issue.assignedDeveloperId]
          : [];
      setSelectedIds(initialIds);

      if (issue.deadlineTimestamp) {
        const d = new Date(issue.deadlineTimestamp);
        if (!isNaN(d.getTime())) {
          // Format as YYYY-MM-DD in local time
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          setDeadlineDate(`${year}-${month}-${day}`);
          const hours = String(d.getHours()).padStart(2, "0");
          const mins = String(d.getMinutes()).padStart(2, "0");
          setDeadlineTime(issue.deadlineTime || `${hours}:${mins}`);
        }
      } else {
        setDeadlineDate("");
        setDeadlineTime("18:30");
      }

      setError("");
      setSuccessMsg("");
      setSearchQuery("");

      // Fetch users if not already available
      if (users.length === 0) {
        fetchUsers();
      }

      // Compute anchor position
      updatePosition();
    }
  }, [isOpen, issue]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
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
        setUsers(merged);
      }
    } catch (err) {
      console.error("Failed to load users for assignee dropdown:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 340;
    const popoverHeight = 440;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - popoverWidth - 16);
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

    const top = placeAbove
      ? Math.max(16, rect.top - popoverHeight - 6)
      : Math.min(window.innerHeight - popoverHeight - 16, rect.bottom + 6);

    setPopoverPos({ top, left, placeAbove });
  };

  // Close on outside click or scroll or escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        updatePosition();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isOpen]);

  const handleToggleUser = (userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleApplyPreset = (daysFromNow: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromNow);
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, "0");
    const d = String(target.getDate()).padStart(2, "0");
    setDeadlineDate(`${y}-${m}-${d}`);
    if (!deadlineTime) setDeadlineTime("18:30");
  };

  const handleClearDeadline = () => {
    setDeadlineDate("");
    setDeadlineTime("18:30");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setSubmitting(true);
    setError("");

    try {
      let deadlineTimestamp: string | null = null;
      if (deadlineDate) {
        const [year, month, day] = deadlineDate.split("-").map(Number);
        const [h, m] = (deadlineTime || "18:30").split(":").map(Number);
        const localDeadline = new Date(year, month - 1, day, isNaN(h) ? 18 : h, isNaN(m) ? 30 : m, 0, 0);
        deadlineTimestamp = localDeadline.toISOString();
      }

      const res = await fetch(`/api/issues/${issue.issueCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN_DEVELOPER",
          developerIds: selectedIds,
          developerId: selectedIds[0] || null,
          deadlineDate: deadlineDate || null,
          deadlineTime: deadlineDate ? (deadlineTime || "18:30") : null,
          deadlineTimestamp,
          clearDeadline: !deadlineDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update assignees/deadline");
      }

      setSuccessMsg("Updated successfully!");
      triggerActionUpdate();

      if (data.issue) {
        onUpdated(data.issue);
      }

      setTimeout(() => {
        setIsOpen(false);
      }, 400);
    } catch (err: any) {
      setError(err.message || "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  const selectedUsersList = users.filter((u) => selectedIds.includes(u.id));
  const busySelected = selectedUsersList.filter(
    (u) => u.activeIssuesCount >= 5 || u.urgentUpcomingDeadlines >= 2 || u.overdueCount >= 2
  );

  const hasAssignees =
    (issue.assignees && issue.assignees.length > 0) || Boolean(issue.assignedDeveloper);

  // If user cannot assign, render plain read-only view
  if (!canAssign) {
    if (issue.assignees && issue.assignees.length > 0) {
      return (
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1.5 overflow-hidden shrink-0">
            {issue.assignees.slice(0, 3).map((a: any) => (
              <div
                key={a.id}
                title={a.name}
                className="h-5 w-5 rounded-full bg-indigo-600 text-white font-bold text-[9px] flex items-center justify-center border-2 border-white dark:border-slate-900 shrink-0"
              >
                {a.name?.charAt(0) || "U"}
              </div>
            ))}
          </div>
          <span className="font-medium text-slate-800 dark:text-slate-200 truncate block text-[11px]">
            {issue.assignees.map((a: any) => a.name).join(", ")}
          </span>
        </div>
      );
    } else if (issue.assignedDeveloper) {
      return (
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
            {issue.assignedDeveloper.name?.charAt(0) || "U"}
          </div>
          <span className="font-medium text-slate-800 dark:text-slate-200 truncate text-[11px]">
            {issue.assignedDeveloper.name}
          </span>
        </div>
      );
    }
    return <span className="text-slate-400 italic text-[11px]">Unassigned</span>;
  }

  // Tester or Admin interactive trigger & dropdown
  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`group text-left transition flex items-center gap-1.5 rounded-lg text-[11px] outline-none ${
          hasAssignees
            ? "px-2 py-1 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800/60"
            : "px-2.5 py-1 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-700/80 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-semibold shadow-xs"
        }`}
        title="Click to assign developers or set deadline"
      >
        {hasAssignees ? (
          <>
            <div className="flex -space-x-1.5 overflow-hidden shrink-0">
              {(issue.assignees && issue.assignees.length > 0
                ? issue.assignees.slice(0, 2)
                : [issue.assignedDeveloper]
              ).map((a: any) => (
                <div
                  key={a.id || "dev"}
                  className="h-5 w-5 rounded-full bg-indigo-600 text-white font-bold text-[9px] flex items-center justify-center border-2 border-white dark:border-slate-900 shrink-0"
                >
                  {a.name?.charAt(0) || "U"}
                </div>
              ))}
            </div>
            <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[95px] block text-[11px]">
              {issue.assignees && issue.assignees.length > 0
                ? issue.assignees.map((a: any) => a.name).join(", ")
                : issue.assignedDeveloper?.name}
            </span>
            <ChevronDown className="h-3 w-3 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shrink-0 transition" />
          </>
        ) : (
          <>
            <UserPlus className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Assign</span>
            <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
          </>
        )}
      </button>

      {/* Render Portal Popover */}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
              width: "350px",
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 text-xs space-y-3.5 animate-fade-in"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white leading-tight">
                    Assign & Set Deadline
                  </h4>
                  <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                    {issue.issueCode}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Selected Users Chips */}
            {selectedUsersList.length > 0 && (
              <div className="flex flex-wrap gap-1 p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 max-h-20 overflow-y-auto">
                {selectedUsersList.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60"
                  >
                    <span>{u.name}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleUser(u.id)}
                      className="text-slate-400 hover:text-red-500 rounded p-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Assignee Selection Section */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Assignees ({selectedIds.length})
                </label>
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="text-[10px] text-slate-400 hover:text-red-500 font-medium"
                  >
                    Unassign All
                  </button>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Users List */}
              {loadingUsers ? (
                <div className="py-6 text-center text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1 text-blue-600" />
                  <span>Loading team members...</span>
                </div>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-1 p-1 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40">
                  {filteredUsers.length === 0 ? (
                    <div className="py-3 text-center text-[11px] text-slate-400">
                      No active users found.
                    </div>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelected = selectedIds.includes(u.id);
                      const isBusy = u.availability === "BUSY";
                      const isModerate = u.availability === "MODERATE";

                      return (
                        <div
                          key={u.id}
                          onClick={() => handleToggleUser(u.id)}
                          className={`p-2 rounded-lg cursor-pointer transition flex items-center justify-between gap-2 text-[11px] ${
                            isSelected
                              ? "bg-blue-500/10 border border-blue-500 text-blue-900 dark:text-blue-200"
                              : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`h-3.5 w-3.5 rounded flex items-center justify-center border transition shrink-0 ${
                                isSelected
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "border-slate-300 dark:border-slate-700"
                              }`}
                            >
                              {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                            </div>
                            <div className="truncate">
                              <span className="font-semibold text-slate-900 dark:text-white truncate block">
                                {u.name}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {u.role}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 text-right">
                            {u.availability && u.availability !== "N/A" && (
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                                  isBusy
                                    ? "bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/40"
                                    : isModerate
                                    ? "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900/40"
                                    : "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900/40"
                                }`}
                              >
                                {u.availability}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              {u.activeIssuesCount ?? 0} active
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {busySelected.length > 0 && (
              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl text-[10px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span>
                  <strong>Workload Warning:</strong> {busySelected.map((u) => u.name).join(", ")} have heavy workloads.
                </span>
              </div>
            )}

            {/* Deadline Section */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                  Resolution Deadline (Optional)
                </label>
                {deadlineDate && (
                  <button
                    type="button"
                    onClick={handleClearDeadline}
                    className="text-[10px] text-slate-400 hover:text-red-500 font-medium"
                  >
                    Clear Deadline
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="date"
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <input
                    type="time"
                    value={deadlineTime}
                    onChange={(e) => setDeadlineTime(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-400">Quick:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(1)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-medium text-slate-700 dark:text-slate-300 transition"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(3)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-medium text-slate-700 dark:text-slate-300 transition"
                >
                  +3 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(7)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-medium text-slate-700 dark:text-slate-300 transition"
                >
                  +1 Week
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
