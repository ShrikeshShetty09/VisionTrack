"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  UserCheck,
  Wrench,
  PlayCircle,
  Eye,
  FileCheck,
  RotateCcw,
  Sparkles,
  MessageSquare,
  Paperclip,
  Calendar,
  ExternalLink,
  Shield,
  FileText,
  Loader2,
  AlertCircle,
  Send,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { formatDate, formatDeadline, getStatusBadgeConfig, getPriorityBadgeConfig, getRoleBadgeConfig } from "@/lib/utils";
import { DeveloperFixModal } from "@/components/issues/DeveloperFixModal";
import { TesterTestingModal } from "@/components/issues/TesterTestingModal";
import { TesterRegressionModal } from "@/components/issues/TesterRegressionModal";
import { AssignDeveloperModal } from "@/components/issues/AssignDeveloperModal";
import { IssueTimeline } from "@/components/issues/IssueTimeline";

export default function IssueDetailPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const router = useRouter();

  const [issue, setIssue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentMessage, setCommentMessage] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Modals
  const [showFixModal, setShowFixModal] = useState(false);
  const [showTestingModal, setShowTestingModal] = useState(false);
  const [showRegressionModal, setShowRegressionModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const fetchIssueDetail = async (silent = false) => {
    if (!code) return;
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`/api/issues/${code}`);
      if (res.ok) {
        const data = await res.json();
        setIssue(data.issue);
      } else if (!silent) {
        setError("Issue not found or unauthorized access.");
      }
    } catch (err) {
      console.error(err);
      if (!silent) setError("Failed to load issue.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssueDetail();
    // 2.5-second live real-time sync loop for comments and statuses
    const interval = setInterval(() => {
      fetchIssueDetail(true);
    }, 2500);
    return () => clearInterval(interval);
  }, [code]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="text-xs font-medium text-slate-500">Loading issue details & lifecycle records...</p>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="py-16 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Issue Not Found</h2>
        <p className="text-xs text-slate-500">{error || "The requested issue does not exist."}</p>
        <Link
          href="/issues"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Issues
        </Link>
      </div>
    );
  }

  const isAssignedDev = user?.id === issue.assignedDeveloperId;
  const isTester = user?.role === "TESTER" || user?.role === "ADMIN";
  const statusBadge = getStatusBadgeConfig(issue.status);
  const priorityBadge = getPriorityBadgeConfig(issue.priority);

  // Quick Developer Status Update (e.g. In Progress / In Review)
  const handleDeveloperStatusChange = async (targetStatus: string) => {
    const originalStatus = issue.status;
    // Optimistic Update
    setIssue((prev: any) => prev ? { ...prev, status: targetStatus } : null);
    showToast(`Status updated to "${targetStatus.replace("_", " ")}" successfully!`);

    try {
      const res = await fetch(`/api/issues/${issue.issueCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DEVELOPER_STATUS_UPDATE",
          targetStatus,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update status");
      }

      await fetchIssueDetail(true);
    } catch (err: any) {
      // Revert on failure
      setIssue((prev: any) => prev ? { ...prev, status: originalStatus } : null);
      showToast(err.message || "Failed to update status", "error");
    }
  };

  // Start Testing
  const handleStartTesting = async () => {
    const originalStatus = issue.status;
    // Optimistic Update
    setIssue((prev: any) => prev ? { ...prev, status: "TESTING_IN_PROGRESS" } : null);
    showToast('QA Testing started successfully! Status: "TESTING IN PROGRESS"');

    try {
      const res = await fetch(`/api/issues/${issue.issueCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "START_TESTING" }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to start testing");
      }

      await fetchIssueDetail(true);
    } catch (err: any) {
      // Revert on failure
      setIssue((prev: any) => prev ? { ...prev, status: originalStatus } : null);
      showToast(err.message || "Failed to start testing", "error");
    }
  };

  // Submit Comment (Real-Time Optimistic Update)
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = commentMessage.trim();
    if (!msg || !user) return;

    // Optimistically prepend / append comment immediately
    const optimisticComment = {
      id: `temp-${Date.now()}`,
      message: msg,
      createdAt: new Date().toISOString(),
      author: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };

    setIssue((prev: any) => ({
      ...prev,
      comments: [...(prev.comments || []), optimisticComment],
    }));
    setCommentMessage("");

    try {
      setSubmittingComment(true);
      const res = await fetch(`/api/issues/${issue.issueCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_COMMENT",
          message: msg,
        }),
      });

      if (res.ok) {
        await fetchIssueDetail(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/issues"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-black px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              {issue.issueCode}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${priorityBadge.bg}`}>
              {priorityBadge.indicator} {priorityBadge.label}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${statusBadge.bg}`}>
              {statusBadge.label}
            </span>
          </div>
        </div>

        {/* Action Controls for Tester / Developer */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tester / Admin Assignment */}
          {isTester && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
              <span>{issue.assignedDeveloper ? "Reassign / Deadline" : "Assign Developer"}</span>
            </button>
          )}

          {/* DEVELOPER ACTIONS */}
          {(isAssignedDev || user?.role === "ADMIN") && (
            <>
              {issue.status === "ASSIGNED" && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleDeveloperStatusChange("IN_PROGRESS")}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  <PlayCircle className="h-3.5 w-3.5" />
                  <span>Start Work (In Progress)</span>
                </button>
              )}

              {issue.status === "IN_PROGRESS" && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleDeveloperStatusChange("IN_REVIEW")}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Move to In Review</span>
                </button>
              )}

              {/* Developer Fix Modal Trigger */}
              {(issue.status === "IN_PROGRESS" || issue.status === "IN_REVIEW" || issue.status === "ASSIGNED" || issue.status === "REOPENED") && (
                <button
                  onClick={() => setShowFixModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm shadow-cyan-500/20"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>Mark as Fixed (Submit Resolution)</span>
                </button>
              )}
            </>
          )}

          {/* TESTER ACTIONS */}
          {isTester && (
            <>
              {issue.status === "FIXED" && (
                <button
                  disabled={actionLoading}
                  onClick={handleStartTesting}
                  className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm shadow-pink-500/20"
                >
                  <PlayCircle className="h-3.5 w-3.5" />
                  <span>Start QA Testing</span>
                </button>
              )}

              {issue.status === "TESTING_IN_PROGRESS" && (
                <button
                  onClick={() => setShowTestingModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  <span>Submit Testing Verdict</span>
                </button>
              )}

              {issue.status === "TESTED" && (
                <button
                  onClick={() => setShowRegressionModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm shadow-teal-500/20"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Perform Regression Testing</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Issue Description, Developer Resolution, QA Testing, Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Issue Header Info Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
              {issue.title}
            </h1>

            {/* Meta Tags Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Software Suite</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                  {issue.software?.name}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Module</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                  {issue.module ? issue.module.name : "Entire Suite"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Environment</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {issue.environment}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Deadline</span>
                <span
                  className={`font-semibold mt-0.5 block truncate ${
                    issue.isOverdue && issue.status !== "RESOLVED" ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-200"
                  }`}
                >
                  {formatDeadline(issue.deadlineTimestamp)}
                </span>
              </div>
            </div>

            {/* Description Body */}
            <div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Description & Steps to Reproduce
              </h3>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans">
                {issue.description}
              </div>
            </div>

            {/* Job URL if provided */}
            {issue.jobUrl && (
              <div className="flex items-center gap-2 text-xs pt-1">
                <span className="font-semibold text-slate-500">Reference / Job URL:</span>
                <a
                  href={issue.jobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono truncate"
                >
                  {issue.jobUrl} <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
            )}

            {/* Attachments Section */}
            {issue.attachments && issue.attachments.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Evidence & Attachments ({issue.attachments.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {issue.attachments.map((att: any) => (
                    <a
                      key={att.id}
                      href={att.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 hover:border-blue-500 transition flex items-center justify-between gap-2 text-xs group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span className="truncate text-slate-800 dark:text-slate-200 font-medium group-hover:text-blue-600">
                          {att.fileName}
                        </span>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* DEVELOPER RESOLUTION CARD (Mandatory Requirement) */}
          {issue.resolutions && issue.resolutions.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-cyan-200 dark:border-cyan-900/40 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Developer Resolution Record</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Submitted by {issue.resolutions[0].developer.name} on {formatDate(issue.resolutions[0].createdAt)}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-600 border border-cyan-300 dark:border-cyan-800">
                  Fixed
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {/* Resolution Description */}
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Technical Solution & Code Changes:
                  </span>
                  <p className="p-3 bg-cyan-50/40 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/30 rounded-xl text-slate-800 dark:text-slate-200 leading-relaxed">
                    {issue.resolutions[0].resolutionText}
                  </p>
                </div>

                {/* Root Cause */}
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Root Cause Analysis:
                  </span>
                  <p className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 leading-relaxed">
                    {issue.resolutions[0].rootCause}
                  </p>
                </div>

                {/* Files / Commit references */}
                {(issue.resolutions[0].filesChanged || issue.resolutions[0].commitRef) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {issue.resolutions[0].filesChanged && (
                      <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Files Changed:</span>
                        <span className="text-slate-800 dark:text-slate-200 truncate block">
                          {issue.resolutions[0].filesChanged}
                        </span>
                      </div>
                    )}
                    {issue.resolutions[0].commitRef && (
                      <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Commit / PR:</span>
                        <span className="text-slate-800 dark:text-slate-200 truncate block">
                          {issue.resolutions[0].commitRef}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* QA TESTING & REGRESSION RECORDS */}
          {((issue.testingRecords && issue.testingRecords.length > 0) ||
            (issue.regressionRecords && issue.regressionRecords.length > 0)) && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                QA Testing & Regression Verification History
              </h3>

              {/* Testing Records */}
              {issue.testingRecords?.map((test: any) => (
                <div
                  key={test.id}
                  className={`p-4 rounded-xl border ${
                    test.result === "PASS"
                      ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40"
                      : "bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/40"
                  } space-y-2`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {test.result === "PASS" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-bold text-slate-900 dark:text-white">
                        Testing Verdict: {test.result}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{formatDate(test.testedAt)}</span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pl-6">
                    {test.testingNotes}
                  </p>

                  <div className="text-[11px] text-slate-500 pl-6">
                    Tested By: <strong className="text-slate-700 dark:text-slate-300">{test.tester.name}</strong>
                  </div>
                </div>
              ))}

              {/* Regression Records */}
              {issue.regressionRecords?.map((reg: any) => (
                <div
                  key={reg.id}
                  className={`p-4 rounded-xl border ${
                    reg.result === "PASS"
                      ? "bg-green-50/50 dark:bg-green-950/30 border-green-300 dark:border-green-800"
                      : "bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/40"
                  } space-y-2`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-green-600" />
                      <span className="font-bold text-slate-900 dark:text-white">
                        Regression Verification: {reg.result}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{formatDate(reg.testedAt)}</span>
                  </div>

                  {reg.regressionNotes && (
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pl-6">
                      {reg.regressionNotes}
                    </p>
                  )}

                  <div className="text-[11px] text-slate-500 pl-6">
                    Verified By: <strong className="text-slate-700 dark:text-slate-300">{reg.tester.name}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Discussion & Comments Thread */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <span>Discussion & Team Comments ({issue.comments?.length || 0})</span>
              </h3>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Sync Active</span>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-3">
              {issue.comments?.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No comments posted yet. Add instructions or notes below.</p>
              ) : (
                issue.comments.map((comment: any) => {
                  const roleBadge = getRoleBadgeConfig(comment.author.role);
                  return (
                    <div
                      key={comment.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">{comment.author.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded border ${roleBadge?.bg}`}>
                            {roleBadge?.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {comment.message}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Comment Input */}
            <form onSubmit={handleAddComment} className="pt-2 flex gap-2">
              <input
                type="text"
                value={commentMessage}
                onChange={(e) => setCommentMessage(e.target.value)}
                placeholder="Post a QA verification note, developer clarification, or status note..."
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                type="submit"
                disabled={submittingComment || !commentMessage.trim()}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {submittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>Post</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right 1 Column: Responsible People, Deadline info, Activity Timeline */}
        <div className="space-y-6">
          {/* People & Accountability Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Accountability & Assignment
            </h3>

            {/* Reporter / Tester */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="h-9 w-9 rounded-full bg-pink-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {issue.createdBy.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Reported By :</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                  {issue.createdBy.name}
                </span>
                <span className="text-[10px] text-slate-500 truncate block">{issue.createdBy.email}</span>
              </div>
            </div>

            {/* Assigned Developer */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="h-9 w-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {issue.assignedDeveloper ? issue.assignedDeveloper.name.charAt(0) : "?"}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Developer</span>
                {issue.assignedDeveloper ? (
                  <>
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                      {issue.assignedDeveloper.name}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate block">{issue.assignedDeveloper.email}</span>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 italic">No developer assigned yet</span>
                )}
              </div>
            </div>

            {/* Reopen Counter if > 0 */}
            {issue.reopenCount > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs flex items-center justify-between text-red-600 dark:text-red-400">
                <span className="font-semibold flex items-center gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" /> Reopened Count
                </span>
                <span className="font-black text-sm">{issue.reopenCount} times</span>
              </div>
            )}
          </div>

          {/* Immutable Activity Timeline */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Activity & Transition Timeline
            </h3>

            <IssueTimeline
              history={issue.statusHistory || []}
              createdAt={issue.createdAt}
              createdByName={issue.createdBy.name}
              createdByRole={issue.createdBy.role}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showFixModal && (
        <DeveloperFixModal
          isOpen={showFixModal}
          onClose={() => setShowFixModal(false)}
          issueCode={issue.issueCode}
          issueTitle={issue.title}
          onFixSubmitted={async () => {
            await fetchIssueDetail(true);
            showToast("Issue marked as FIXED successfully!");
          }}
        />
      )}

      {showTestingModal && (
        <TesterTestingModal
          isOpen={showTestingModal}
          onClose={() => setShowTestingModal(false)}
          issueCode={issue.issueCode}
          issueTitle={issue.title}
          onTestingSubmitted={async () => {
            await fetchIssueDetail(true);
            showToast("Testing verdict submitted successfully!");
          }}
        />
      )}

      {showRegressionModal && (
        <TesterRegressionModal
          isOpen={showRegressionModal}
          onClose={() => setShowRegressionModal(false)}
          issueCode={issue.issueCode}
          issueTitle={issue.title}
          onRegressionSubmitted={async () => {
            await fetchIssueDetail(true);
            showToast("Regression testing completed successfully!");
          }}
        />
      )}

      {showAssignModal && (
        <AssignDeveloperModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          issueCode={issue.issueCode}
          issueTitle={issue.title}
          currentDeveloperId={issue.assignedDeveloperId}
          onAssigned={async () => {
            await fetchIssueDetail(true);
            showToast("Developer assigned successfully!");
          }}
        />
      )}

      {/* Floating Confirmation Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3.5 rounded-xl border shadow-2xl transition-all duration-300 animate-slide-in ${
          toast.type === "success" 
            ? "bg-slate-900 border-slate-800 text-white dark:bg-slate-950" 
            : "bg-red-950 border-red-900 text-red-200"
        }`}>
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
          <button 
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-white transition-colors text-base leading-none font-bold"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
