"use client";

import React, { useState } from "react";
import { X, CheckCircle2, Upload, FileCode, AlertCircle, Loader2 } from "lucide-react";

interface DeveloperFixModalProps {
  isOpen: boolean;
  onClose: () => void;
  issueCode: string;
  issueTitle: string;
  onFixSubmitted: () => void;
}

export function DeveloperFixModal({
  isOpen,
  onClose,
  issueCode,
  issueTitle,
  onFixSubmitted,
}: DeveloperFixModalProps) {
  const [resolutionText, setResolutionText] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [filesChanged, setFilesChanged] = useState("");
  const [commitRef, setCommitRef] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError("");

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to upload file");
        }

        const uploaded = await res.json();
        setAttachments((prev) => [...prev, uploaded]);
      }
    } catch (err: any) {
      setError(err.message || "File upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionText.trim()) {
      setError("Please explain how you resolved this issue.");
      return;
    }
    if (!rootCause.trim()) {
      setError("Please describe the root cause analysis.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/issues/${issueCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT_FIX",
          resolutionText,
          rootCause,
          filesChanged,
          commitRef,
          additionalNotes,
          attachments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit resolution");
      }

      onFixSubmitted();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit fix");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                {issueCode}
              </span>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Submit Issue Resolution</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-lg mt-0.5">
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

          {/* Resolution Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              How did you resolve this issue? <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              placeholder="Describe the code changes, algorithm fixes, or configuration adjustments applied..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Root Cause Analysis */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Root Cause Analysis <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="What caused this bug in the first place? (e.g. unhandled edge case, rounding precision, concurrency race condition)"
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Files Changed & Commit Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Files Changed
              </label>
              <input
                type="text"
                value={filesChanged}
                onChange={(e) => setFilesChanged(e.target.value)}
                placeholder="e.g. src/services/tax/gstCalculator.ts"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Git Commit / PR Reference
              </label>
              <input
                type="text"
                value={commitRef}
                onChange={(e) => setCommitRef(e.target.value)}
                placeholder="e.g. git: 8a93ef0 or PR #42"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Additional Notes for QA Tester
            </label>
            <textarea
              rows={2}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Any specific test scenarios, staging env variables, or test accounts QA should use..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Attachments Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Attachments / Verification Evidence
            </label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 transition">
                <Upload className="h-4 w-4 text-blue-600" />
                <span>{uploading ? "Uploading..." : "Upload Evidence / Screenshots"}</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.xlsx"
                />
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {attachments.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
                  >
                    <span className="truncate">{att.fileName}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                      className="text-red-500 hover:text-red-600 ml-2"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
            disabled={submitting || uploading}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            <span>Mark as Fixed & Notify QA</span>
          </button>
        </div>
      </div>
    </div>
  );
}
