"use client";

import React, { useState, useEffect } from "react";
import { Edit3, X, Loader2, Save, Layers, CheckCircle2 } from "lucide-react";
import { Priority, Environment, PublicationStatus } from "@/types";
import { triggerActionUpdate } from "@/lib/events";

interface EditIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  issue: any;
  onSuccess?: (updatedIssue: any) => void;
}

export function EditIssueModal({
  isOpen,
  onClose,
  issue,
  onSuccess,
}: EditIssueModalProps) {
  const [title, setTitle] = useState(issue?.title || "");
  const [description, setDescription] = useState(issue?.description || "");
  const [softwareId, setSoftwareId] = useState(issue?.softwareId || "");
  const [moduleId, setModuleId] = useState(issue?.moduleId || "");
  const [environment, setEnvironment] = useState<Environment>(issue?.environment || "TESTING");
  const [priority, setPriority] = useState<Priority>(issue?.priority || "HIGH");
  const [jobUrl, setJobUrl] = useState(issue?.jobUrl || "");
  const [publicationStatus, setPublicationStatus] = useState<PublicationStatus>(
    issue?.publicationStatus || "PUBLISHED"
  );

  const [softwareList, setSoftwareList] = useState<any[]>([]);
  const [loadingSoftware, setLoadingSoftware] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Sync state when modal opens or issue changes
  useEffect(() => {
    if (issue) {
      setTitle(issue.title || "");
      setDescription(issue.description || "");
      setSoftwareId(issue.softwareId || "");
      setModuleId(issue.moduleId || "");
      setEnvironment(issue.environment || "TESTING");
      setPriority(issue.priority || "HIGH");
      setJobUrl(issue.jobUrl || "");
      setPublicationStatus(issue.publicationStatus || "PUBLISHED");
    }
  }, [issue, isOpen]);

  // Fetch software list
  useEffect(() => {
    if (!isOpen) return;
    const fetchSoftware = async () => {
      try {
        setLoadingSoftware(true);
        const res = await fetch("/api/software");
        if (res.ok) {
          const data = await res.json();
          setSoftwareList(data.software || []);
        }
      } catch (err) {
        console.error("Failed to load software list:", err);
      } finally {
        setLoadingSoftware(false);
      }
    };
    fetchSoftware();
  }, [isOpen]);

  if (!isOpen || !issue) return null;

  const selectedSoftware = softwareList.find((s) => s.id === softwareId) || issue.software;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    if (!softwareId) {
      setError("Software system is required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/issues/${issue.issueCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "EDIT_ISSUE",
          title: title.trim(),
          description: description.trim(),
          softwareId,
          moduleId: moduleId || null,
          environment,
          priority,
          jobUrl: jobUrl?.trim() || null,
          publicationStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update issue");
      }

      triggerActionUpdate();
      if (onSuccess) onSuccess(data.issue);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update issue");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Edit Issue</h2>
              <p className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">{issue.issueCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Publication Status Toggle */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-4">
            <div>
              <label className="text-xs font-bold text-slate-900 dark:text-white block">
                Publication Status
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {publicationStatus === "DRAFT"
                  ? "Draft: Visible ONLY to Testers and Admins. Developers cannot see it."
                  : "Published: Visible to assigned developers and listed in All Issues."}
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPublicationStatus("DRAFT")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  publicationStatus === "DRAFT"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Draft
              </button>
              <button
                type="button"
                onClick={() => setPublicationStatus("PUBLISHED")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  publicationStatus === "PUBLISHED"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Published
              </button>
            </div>
          </div>

          {/* Issue Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Issue Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Software & Module */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Software System <span className="text-red-500">*</span>
              </label>
              <select
                value={softwareId}
                onChange={(e) => {
                  setSoftwareId(e.target.value);
                  setModuleId("");
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {softwareList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Module (Optional)
              </label>
              <select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- None / Core --</option>
                {selectedSoftware?.modules?.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Environment & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Environment
              </label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as Environment)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TESTING">Testing / QA</option>
                <option value="DEV">Development</option>
                <option value="PRODUCTION">Production</option>
                <option value="LOCAL">Local</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CRITICAL">🔴 Critical</option>
                <option value="HIGH">🟠 High</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="LOW">🟢 Low</option>
              </select>
            </div>
          </div>

          {/* Job URL */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Job URL / Reference Link (Optional)
            </label>
            <input
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Description & Reproduction Steps <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
