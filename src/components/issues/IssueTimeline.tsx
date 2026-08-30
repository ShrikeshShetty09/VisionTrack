"use client";

import React from "react";
import { Clock, CheckCircle2, XCircle, ArrowRight, UserPlus, PlayCircle, Eye, Wrench, Sparkles, AlertCircle } from "lucide-react";
import { formatDate, getStatusBadgeConfig } from "@/lib/utils";

interface StatusHistoryItem {
  id: string;
  fromStatus: string;
  toStatus: string;
  reason?: string | null;
  createdAt: string;
  changedBy: {
    name: string;
    role: string;
  };
}

interface IssueTimelineProps {
  history: StatusHistoryItem[];
  createdAt: string;
  createdByName: string;
  createdByRole: string;
}

export function IssueTimeline({
  history,
  createdAt,
  createdByName,
  createdByRole,
}: IssueTimelineProps) {
  const getEventIcon = (toStatus: string) => {
    switch (toStatus) {
      case "ASSIGNED":
        return <div className="p-1.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"><UserPlus className="h-3.5 w-3.5" /></div>;
      case "IN_PROGRESS":
        return <div className="p-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800"><PlayCircle className="h-3.5 w-3.5" /></div>;
      case "IN_REVIEW":
        return <div className="p-1.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800"><Eye className="h-3.5 w-3.5" /></div>;
      case "FIXED":
        return <div className="p-1.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800"><Wrench className="h-3.5 w-3.5" /></div>;
      case "TESTING_IN_PROGRESS":
        return <div className="p-1.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-800"><Clock className="h-3.5 w-3.5" /></div>;
      case "TESTED":
        return <div className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" /></div>;
      case "REGRESSION":
        return <div className="p-1.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800"><CheckCircle2 className="h-3.5 w-3.5" /></div>;
      case "RESOLVED":
        return <div className="p-1.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 border border-green-300 dark:border-green-800"><Sparkles className="h-3.5 w-3.5" /></div>;
      case "TEST_FAILED":
      case "REGRESSION_FAILED":
      case "REOPENED":
        return <div className="p-1.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"><XCircle className="h-3.5 w-3.5" /></div>;
      default:
        return <div className="p-1.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"><Clock className="h-3.5 w-3.5" /></div>;
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {/* Creation Event */}
      <div className="relative flex items-start gap-3">
        <div className="absolute -left-6 mt-0.5">
          <div className="p-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900">
            <Clock className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="flex-1 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white">Issue Reported</span>
            <span className="text-[10px] text-slate-400 font-mono">{formatDate(createdAt)}</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Created by <strong className="text-slate-800 dark:text-slate-200">{createdByName}</strong> ({createdByRole})
          </p>
        </div>
      </div>

      {/* Subsequent History Transitions */}
      {history.map((event) => {
        const fromBadge = getStatusBadgeConfig(event.fromStatus as any);
        const toBadge = getStatusBadgeConfig(event.toStatus as any);

        return (
          <div key={event.id} className="relative flex items-start gap-3">
            <div className="absolute -left-6 mt-0.5 bg-white dark:bg-slate-900 rounded-full">
              {getEventIcon(event.toStatus)}
            </div>

            <div className="flex-1 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${fromBadge.bg}`}>
                    {fromBadge.label}
                  </span>
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${toBadge.bg}`}>
                    {toBadge.label}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{formatDate(event.createdAt)}</span>
              </div>

              {event.reason && (
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                  {event.reason}
                </p>
              )}

              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                Action by <span className="font-semibold text-slate-700 dark:text-slate-300">{event.changedBy.name}</span> ({event.changedBy.role})
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
