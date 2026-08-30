"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BarChart3,
  Users,
  Layers,
  CheckCircle2,
  Clock,
  Flame,
  FileCheck,
  RotateCcw,
  TrendingUp,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

function ReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "analytics";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Synchronize activeTab when query string changes (e.g. from sidebar navigation)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/reports?tab=${tabId}`);
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/analytics?timeRange=all");
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading || !analytics) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="text-xs font-medium text-slate-500">Generating software quality reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <span>Quality Analytics & Performance Reports</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Deep-dive analysis into QA testing velocity, developer turnaround, and software resolution progress
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-semibold overflow-x-auto">
        {[
          { id: "analytics", label: "Issue Analytics" },
          { id: "developers", label: "Developer Performance" },
          { id: "testers", label: "Tester Performance" },
          { id: "software", label: "Software Progress" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-3.5 py-2 rounded-xl transition shrink-0 ${
              activeTab === tab.id
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: ISSUE ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Status Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.statusDistribution}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "10px", color: "#fff", fontSize: "12px" }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                    {analytics.statusDistribution.map((e: any, idx: number) => (
                      <Cell key={idx} fill={e.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Priority Breakdown</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.priorityDistribution}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {analytics.priorityDistribution.map((e: any, idx: number) => (
                      <Cell key={idx} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "10px", color: "#fff", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEVELOPER PERFORMANCE */}
      {activeTab === "developers" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Developer Performance Metrics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider bg-slate-50/50 dark:bg-slate-950/50">
                <tr>
                  <th className="py-3 px-4">Developer</th>
                  <th className="py-3 px-4">Active Queue</th>
                  <th className="py-3 px-4">In Progress</th>
                  <th className="py-3 px-4">Fixed (Awaiting QA)</th>
                  <th className="py-3 px-4">Overdue</th>
                  <th className="py-3 px-4">Avg Resolution Turnaround</th>
                  <th className="py-3 px-4">Availability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {analytics.developerWorkload.map((dev: any) => (
                  <tr key={dev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{dev.name}</td>
                    <td className="py-3.5 px-4 font-semibold">{dev.activeIssuesCount}</td>
                    <td className="py-3.5 px-4 text-amber-600 font-medium">{dev.inProgressCount}</td>
                    <td className="py-3.5 px-4 text-cyan-600 font-medium">{dev.fixedCount}</td>
                    <td className="py-3.5 px-4">
                      {dev.overdueCount > 0 ? (
                        <span className="text-red-600 font-bold">{dev.overdueCount} Overdue</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {dev.avgResolutionHours} hrs
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-blue-500/10 text-blue-600 border-blue-200">
                        {dev.availability}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TESTER PERFORMANCE */}
      {activeTab === "testers" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">QA Tester Productivity Metrics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider bg-slate-50/50 dark:bg-slate-950/50">
                <tr>
                  <th className="py-3 px-4">QA Tester</th>
                  <th className="py-3 px-4">Issues Reported</th>
                  <th className="py-3 px-4">Verifications Performed</th>
                  <th className="py-3 px-4">Issues Resolved</th>
                  <th className="py-3 px-4">Failed / Reopened</th>
                  <th className="py-3 px-4">Avg QA Verification Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {analytics.testerPerformance.map((tester: any) => (
                  <tr key={tester.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{tester.name}</td>
                    <td className="py-3.5 px-4 font-semibold">{tester.issuesRaised}</td>
                    <td className="py-3.5 px-4 text-pink-600 font-medium">{tester.issuesTested}</td>
                    <td className="py-3.5 px-4 text-emerald-600 font-medium">{tester.issuesResolved}</td>
                    <td className="py-3.5 px-4 text-red-600 font-medium">{tester.issuesReopened}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {tester.avgTestingHours} hrs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SOFTWARE PROGRESS */}
      {activeTab === "software" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analytics.softwareProgress.map((sw: any) => (
            <div
              key={sw.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  {sw.code}
                </span>
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  {sw.progressPercent}% Resolved
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">{sw.name}</h4>

              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${sw.progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Total Reported: {sw.totalIssues}</span>
                <span>Resolved: {sw.resolvedIssues}</span>
                <span>Active Open: {sw.openIssues}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs text-slate-500">Loading reports...</div>}>
      <ReportsContent />
    </Suspense>
  );
}
