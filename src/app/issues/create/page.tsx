"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  PlusCircle,
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  UserCheck,
  Shield,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Priority, Environment } from "@/types";

export default function CreateIssuePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [softwareId, setSoftwareId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [environment, setEnvironment] = useState<Environment>("TESTING");
  const [priority, setPriority] = useState<Priority>("HIGH");
  const [jobUrl, setJobUrl] = useState("");

  // Direct assignment
  const [assignedDeveloperId, setAssignedDeveloperId] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("18:30");

  // Auxiliary data
  const [softwareList, setSoftwareList] = useState<any[]>([]);
  const [developers, setDevelopers] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const [swRes, devRes] = await Promise.all([
          fetch("/api/software"),
          fetch("/api/analytics?timeRange=all"),
        ]);
        if (swRes.ok) {
          const swData = await swRes.json();
          setSoftwareList(swData.software || []);
          if (swData.software && swData.software.length > 0) {
            setSoftwareId(swData.software[0].id);
          }
        }
        if (devRes.ok) {
          const dData = await devRes.json();
          setDevelopers(dData.developerWorkload || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchFormData();
  }, []);

  const selectedSoftware = softwareList.find((s) => s.id === softwareId);
  const selectedDev = developers.find((d) => d.id === assignedDeveloperId);

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
    if (!title.trim()) {
      setError("Issue title is required.");
      return;
    }
    if (!description.trim()) {
      setError("Issue description and reproduction steps are required.");
      return;
    }
    if (!softwareId) {
      setError("Please select a software system.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          softwareId,
          moduleId: moduleId || null,
          environment,
          priority,
          jobUrl,
          assignedDeveloperId: assignedDeveloperId || null,
          deadlineDate: deadlineDate || null,
          deadlineTime: deadlineTime || null,
          attachments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create issue");
      }

      router.push(`/issues/${data.issue.issueCode}`);
    } catch (err: any) {
      setError(err.message || "Failed to create issue");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/issues"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Create New Quality Issue</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Report defect, assign developer, set resolution deadline, and attach evidence logs
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-2xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Issue Details Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
            1. Issue Overview & Details
          </h2>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Issue Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. GST 18% calculation difference on fractional currency conversions"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Software & Module */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Software System <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={softwareId}
                onChange={(e) => {
                  setSoftwareId(e.target.value);
                  setModuleId("");
                }}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {softwareList.map((sw) => (
                  <option key={sw.id} value={sw.id}>
                    [{sw.code}] {sw.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Module / Feature Area
              </label>
              <select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- Entire Software Suite --</option>
                {selectedSoftware?.modules?.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Environment & Priority & Job URL */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Environment <span className="text-red-500">*</span>
              </label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as Environment)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="TESTING">Testing / QA Staging</option>
                <option value="PRODUCTION">Production Live</option>
                <option value="DEV">Development</option>
                <option value="LOCAL">Local Environment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
              >
                <option value="CRITICAL">🔴 Critical (Immediate Attention)</option>
                <option value="HIGH">🟠 High Priority</option>
                <option value="MEDIUM">🟡 Medium Priority</option>
                <option value="LOW">🔵 Low / Cosmetic</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Job URL / Reference Link
              </label>
              <input
                type="text"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://app.visiondatalabs.com/..."
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Description & Reproduction Steps */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Description, Steps to Reproduce & Expected Behavior <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="1. Navigate to Invoicing module&#10;2. Create invoice with 3 USD line items&#10;3. Apply 18% GST currency conversion&#10;Observed: ₹0.01 mismatch on SGST total&#10;Expected: Total should match exact paisa."
              className="w-full text-xs p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Attachment Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Screenshots & Evidence Logs (Vercel Blob / Local)
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-4 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 transition">
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
              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    <span className="truncate">{att.fileName}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-600 ml-2"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Developer Assignment & Deadline Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
            2. Developer Assignment & Deadline (Optional Direct Assignment)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Assign Developer
              </label>
              <select
                value={assignedDeveloperId}
                onChange={(e) => setAssignedDeveloperId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- Assign Later (Unassigned) --</option>
                {developers.map((dev) => (
                  <option key={dev.id} value={dev.id}>
                    {dev.name} ({dev.activeIssuesCount} active, {dev.availability})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Deadline Date
              </label>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                disabled={!assignedDeveloperId}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Deadline Time (HH:MM)
              </label>
              <input
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                disabled={!assignedDeveloperId}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
              />
            </div>
          </div>

          {selectedDev && selectedDev.availability === "BUSY" && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                <strong>Workload Notice:</strong> {selectedDev.name} currently has {selectedDev.activeIssuesCount} active issues.
              </span>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/issues"
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting || uploading}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating Issue...</span>
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4" />
                <span>Publish Quality Issue</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
