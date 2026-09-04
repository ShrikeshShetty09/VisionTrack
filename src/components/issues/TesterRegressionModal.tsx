"use client";

import React, { useState } from "react";
import { X, CheckCircle2, XCircle, Upload, AlertCircle, Loader2, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import { RegressionResult } from "@/types";

interface TesterRegressionModalProps {
  isOpen: boolean;
  onClose: () => void;
  issueCode: string;
  issueTitle: string;
  onRegressionSubmitted: () => void;
}

export function TesterRegressionModal({
  isOpen,
  onClose,
  issueCode,
  issueTitle,
  onRegressionSubmitted,
}: TesterRegressionModalProps) {
  const [result, setResult] = useState<RegressionResult>("PASS");
  const [regressionNotes, setRegressionNotes] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

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
          const ext = file.type.split("/")[1] || "png";
          const fileName =
            file.name && file.name !== "image.png" && file.name !== "blob"
              ? file.name
              : `qa-regression-evidence-${Date.now()}.${ext}`;
          const renamedFile = new File([file], fileName, { type: file.type || "image/png" });
          filesToUpload.push(renamedFile);
        }
      }
    }

    if (filesToUpload.length > 0) {
      await uploadFileList(filesToUpload);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/issues/${issueCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT_REGRESSION",
          result,
          regressionNotes,
          attachments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit regression results");
      }

      if (result === "PASS") {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      onRegressionSubmitted();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit regression verification");
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
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400">
                Final Step
              </span>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Regression Testing Verification</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md mt-0.5">
              {issueCode} — {issueTitle}
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
        <form onSubmit={handleSubmit} onPaste={handlePaste} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Regression Verdict */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
              Regression Testing Result <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setResult("PASS")}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition ${
                  result === "PASS"
                    ? "bg-green-500/15 border-green-500 text-green-600 dark:text-green-400 ring-2 ring-green-500/20"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                }`}
              >
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>PASS (Resolve Issue)</span>
              </button>

              <button
                type="button"
                onClick={() => setResult("FAIL")}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition ${
                  result === "FAIL"
                    ? "bg-red-500/15 border-red-500 text-red-600 dark:text-red-400 ring-2 ring-red-500/20"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                }`}
              >
                <XCircle className="h-4 w-4 text-red-500" />
                <span>FAIL (Regression Defect)</span>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Regression Verification Notes
            </label>
            <textarea
              rows={3}
              value={regressionNotes}
              onChange={(e) => setRegressionNotes(e.target.value)}
              placeholder="Confirm that adjacent modules and dependent features were tested and operate normally..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Attachments & Paste Zone */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                Regression Evidence / Screenshots
              </label>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                💡 Press <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">Ctrl+V</kbd> to paste screenshot
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
              className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950 transition flex flex-col sm:flex-row items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 shrink-0">
                  <Upload className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Paste image (<kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800">Ctrl+V</kbd>) or drag files here
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Supports PNG, JPG, WEBP, PDF, DOCX (up to 25MB)
                  </p>
                </div>
              </div>

              <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm flex items-center gap-1.5 transition shrink-0">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" /> : <Upload className="h-3.5 w-3.5 text-teal-600" />}
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
              <div className="mt-2.5 space-y-1.5">
                {attachments.map((att, i) => {
                  const isImg = att.mimeType?.startsWith("image/") || att.fileUrl?.match(/\.(png|jpe?g|webp|gif)$/i);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs px-3 py-2 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isImg ? (
                          <img
                            src={att.fileUrl}
                            alt={att.fileName}
                            className="h-8 w-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-white"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 flex items-center justify-center shrink-0">
                            <Upload className="h-3.5 w-3.5" />
                          </div>
                        )}
                        <span className="truncate text-slate-800 dark:text-slate-200 font-medium">{att.fileName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 ml-2 shrink-0 transition"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
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
            className={`px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 ${
              result === "PASS" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : result === "PASS" ? (
              <Sparkles className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span>{result === "PASS" ? "Mark Issue as RESOLVED" : "Submit Failure & Reopen"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
