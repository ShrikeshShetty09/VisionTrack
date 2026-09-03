"use client";

import React, { useState, useEffect } from "react";
import { X, UserCheck, AlertTriangle, Calendar, Clock, Loader2, AlertCircle } from "lucide-react";

interface AssignDeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
  issueCode: string;
  issueTitle: string;
  currentDeveloperId?: string | null;
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
  currentDeadlineDate,
  currentDeadlineTime,
  onAssigned,
}: AssignDeveloperModalProps) {
  const [developers, setDevelopers] = useState<any[]>([]);
  const [selectedDevId, setSelectedDevId] = useState(currentDeveloperId || "");
  const [deadlineDate, setDeadlineDate] = useState(currentDeadlineDate || "");
  const [deadlineTime, setDeadlineTime] = useState(currentDeadlineTime || "18:30");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingDevs, setFetchingDevs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showWorkloadWarning, setShowWorkloadWarning] = useState(false);
  const [warningIgnored, setWarningIgnored] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedDevId(currentDeveloperId || "");
      setDeadlineDate(currentDeadlineDate || "");
      setDeadlineTime(currentDeadlineTime || "18:30");
      setNotes("");
      setError("");
      setWarningIgnored(false);
    }
  }, [isOpen, currentDeveloperId, currentDeadlineDate, currentDeadlineTime]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchDevelopers = async () => {
      try {
        setFetchingDevs(true);
        const res = await fetch("/api/analytics?timeRange=all");
        if (res.ok) {
          const data = await res.json();
          setDevelopers(data.developerWorkload || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setFetchingDevs(false);
      }
    };
    fetchDevelopers();
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedDev = developers.find((d) => d.id === selectedDevId);

  const handleDevSelect = (devId: string) => {
    setSelectedDevId(devId);
    setWarningIgnored(false);
    const dev = developers.find((d) => d.id === devId);
    if (dev && (dev.activeIssuesCount >= 5 || dev.urgentUpcomingDeadlines >= 2 || dev.overdueCount >= 2)) {
      setShowWorkloadWarning(true);
    } else {
      setShowWorkloadWarning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevId) {
      setError("Please select a developer.");
      return;
    }
    if (!deadlineDate) {
      setError("Please specify a deadline date.");
      return;
    }

    if (showWorkloadWarning && !warningIgnored) {
      setError("Please acknowledge the workload conflict warning or choose another developer.");
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
          developerId: selectedDevId,
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
      setError(err.message || "Failed to assign developer");
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
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Assign Developer & Set Deadline</h3>
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

          {/* Developer Availability List */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              Select Active Developer <span className="text-red-500">*</span>
            </label>

            {fetchingDevs ? (
              <div className="py-4 text-center text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                Loading developer availability...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-950/50">
                {developers.map((dev) => {
                  const isSelected = selectedDevId === dev.id;
                  const isBusy = dev.availability === "BUSY";
                  const isModerate = dev.availability === "MODERATE";

                  return (
                    <div
                      key={dev.id}
                      onClick={() => handleDevSelect(dev.id)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition flex items-center justify-between gap-2 text-xs ${
                        isSelected
                          ? "bg-blue-500/10 border-blue-500 ring-1 ring-blue-500 text-blue-900 dark:text-blue-200"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {dev.name.charAt(0)}
                        </div>
                        <div className="truncate">
                          <span className="font-semibold text-slate-900 dark:text-white">{dev.name}</span>
                          <span className="text-slate-400 text-[10px] block truncate">{dev.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-right">
                        <div className="text-[10px] text-slate-500">
                          <span>{dev.activeIssuesCount} active</span>
                          {dev.overdueCount > 0 && <span className="text-red-500 font-bold ml-1">({dev.overdueCount} overdue)</span>}
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isBusy
                              ? "bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/40"
                              : isModerate
                              ? "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900/40"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900/40"
                          }`}
                        >
                          {dev.availability}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Workload Warning Box */}
          {showWorkloadWarning && selectedDev && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 rounded-xl text-xs space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Developer Workload Conflict Warning</span>
              </div>
              <p className="text-amber-700 dark:text-amber-400 leading-relaxed text-[11px]">
                <strong>{selectedDev.name}</strong> currently has {selectedDev.activeIssuesCount} active issues
                {selectedDev.urgentUpcomingDeadlines > 0 ? ` and ${selectedDev.urgentUpcomingDeadlines} deadlines due soon.` : "."}
              </p>
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
              placeholder="Any specific instructions, priority requests, or reproduction details..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-end gap-2">
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
            disabled={submitting || (showWorkloadWarning && !warningIgnored)}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
            <span>Assign Issue & Notify Developer</span>
          </button>
        </div>
      </div>
    </div>
  );
}
