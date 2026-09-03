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
  Paperclip,
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

  const uploadFileList = async (files: File[]) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError("");

    try {
      for (const file of files) {
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFileList(Array.from(files));
    e.target.value = "";
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const filesToUpload: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/") || item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          // If screenshot or image from clipboard, assign timestamped friendly name
          const ext = file.type.split("/")[1] || "png";
          const fileName =
            file.name && file.name !== "image.png"
              ? file.name
              : `pasted-evidence-${Date.now()}.${ext}`;
          const renamedFile = new File([file], fileName, { type: file.type || "image/png" });
          filesToUpload.push(renamedFile);
        }
      }
    }

    if (filesToUpload.length > 0) {
      // Don't interfere if pasting text into a text field, but handle image attachments
      await uploadFileList(filesToUpload);
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
      // Compute accurate local ISO deadline timestamp
      let deadlineTimestamp: string | null = null;
      if (deadlineDate) {
        const [year, month, day] = deadlineDate.split("-").map(Number);
        const [h, m] = (deadlineTime || "18:30").split(":").map(Number);
        const localDeadline = new Date(year, month - 1, day, isNaN(h) ? 18 : h, isNaN(m) ? 30 : m, 0, 0);
        deadlineTimestamp = localDeadline.toISOString();
      }

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
          deadlineTimestamp,
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
      <form onSubmit={handleSubmit} onPaste={handlePaste} className="space-y-6">
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
              placeholder="e.g. Broken invoice tax calculation in billing workflow"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Software & Module Select */}
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
                <option value="">Select Software Application...</option>
                {softwareList.map((sw) => (
                  <option key={sw.id} value={sw.id}>
                    {sw.name} ({sw.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Sub-Module (Optional)
              </label>
              <select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                disabled={!selectedSoftware || (selectedSoftware.modules || []).length === 0}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
              >
                <option value="">
                  {selectedSoftware && (selectedSoftware.modules || []).length > 0
                    ? "Select Specific Module..."
                    : "No modules configured"}
                </option>
                {selectedSoftware?.modules?.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Environment, Priority, Job URL */}
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
                <option value="DEVELOPMENT">Development</option>
                <option value="TESTING">QA / Testing</option>
                <option value="STAGING">Staging / Pre-Prod</option>
                <option value="PRODUCTION">Production</option>
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

          {/* Attachment Upload & Paste Zone */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                Screenshots & Evidence Logs (Copy-paste media supported)
              </label>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                💡 Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">Ctrl+V</kbd> anywhere to paste screenshot
              </span>
            </div>

            <div
              onPaste={handlePaste}
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  await uploadFileList(Array.from(e.dataTransfer.files));
                }
              }}
              className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950 transition flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Paste image from clipboard (<kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800">Ctrl+V</kbd>) or drag & drop files
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Supports PNG, JPG, JPEG, WEBP, PDF, DOCX, XLSX (up to 25MB)
                  </p>
                </div>
              </div>

              <label className="cursor-pointer px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm flex items-center gap-1.5 transition shrink-0">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" /> : <PlusCircle className="h-3.5 w-3.5 text-blue-600" />}
                <span>{uploading ? "Uploading..." : "Browse Files"}</span>
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
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {attachments.map((att, idx) => {
                  const isImage = att.mimeType?.startsWith("image/") || att.fileUrl?.match(/\.(png|jpe?g|webp|gif)$/i);
                  return (
                    <div
                      key={idx}
                      className="relative group p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2.5 overflow-hidden"
                    >
                      {isImage ? (
                        <img
                          src={att.fileUrl}
                          alt={att.fileName}
                          className="h-10 w-10 rounded-lg object-cover border border-slate-200 dark:border-slate-800 shrink-0 bg-slate-100"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Paperclip className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate" title={att.fileName}>
                          {att.fileName}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {att.fileSize ? `${(att.fileSize / 1024).toFixed(0)} KB` : "Uploaded"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition shrink-0"
                        title="Remove attachment"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
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
