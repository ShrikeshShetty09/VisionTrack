"use client";

import React, { useState } from "react";
import { Trash2, AlertTriangle, X, Loader2, MessageSquare, Bell } from "lucide-react";
import { triggerActionUpdate } from "@/lib/events";

interface DeleteIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  issueCode: string;
  issueTitle: string;
  hasAssignedDev?: boolean;
  onSuccess?: () => void;
}

const RECOMMENDATIONS = [
  "Wrong issue reported",
  "Typing mistake",
  "Duplicate issue",
  "Not reproducible / Invalid",
  "Other",
];

export function DeleteIssueModal({
  isOpen,
  onClose,
  issueCode,
  issueTitle,
  hasAssignedDev = false,
  onSuccess,
}: DeleteIssueModalProps) {
  const [remark, setRemark] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSelectRecommendation = (rec: string) => {
    setSelectedTag(rec);
    if (rec === "Other") {
      setRemark("");
    } else {
      setRemark(rec);
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remark.trim()) {
      setError("Please provide a remark explaining why you are deleting this issue.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/issues/${issueCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_ISSUE",
          deleteRemark: remark.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete issue");
      }

      triggerActionUpdate();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete issue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-red-200 dark:border-red-900/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-red-50/50 dark:bg-red-950/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200 dark:border-red-800">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Delete Issue</h2>
              <p className="text-xs font-mono text-red-600 dark:text-red-400 font-semibold">{issueCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleDelete} className="p-5 space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <span className="font-semibold">Soft Deletion:</span> This issue will be moved to the{" "}
              <span className="font-bold">Deleted Issues</span> archive and removed from active workflows.
              Testers and Admins can view it in the Deleted Issues section.
            </div>
          </div>

          {hasAssignedDev && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-xl flex items-center gap-2.5 text-xs text-blue-700 dark:text-blue-300 font-medium">
              <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Assigned developer(s) will be automatically notified about this deletion with your remark.</span>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Issue Title: <span className="font-normal text-slate-600 dark:text-slate-400">&ldquo;{issueTitle}&rdquo;</span>
            </p>
          </div>

          {/* Recommendation Chips */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Reason Recommendation <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {RECOMMENDATIONS.map((rec) => (
                <button
                  type="button"
                  key={rec}
                  onClick={() => handleSelectRecommendation(rec)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                    selectedTag === rec
                      ? "bg-red-600 text-white border-red-600 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-700"
                  }`}
                >
                  {rec}
                </button>
              ))}
            </div>
          </div>

          {/* Remark Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
              <span>Deletion Remark / Explanation</span>
            </label>
            <textarea
              rows={3}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Explain why this issue is being deleted (e.g., Wrong issue reported, Typo, Duplicate of VT-000042...)"
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !remark.trim()}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 shadow-lg shadow-red-500/20 disabled:opacity-50 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Confirm Soft Delete</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
