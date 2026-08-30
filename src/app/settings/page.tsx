"use client";

import React, { useState } from "react";
import {
  Settings,
  Bell,
  Mail,
  Smartphone,
  ShieldCheck,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export default function SettingsPage() {
  const { user } = useAuth();
  const [testingPush, setTestingPush] = useState(false);
  const [pushStatus, setPushStatus] = useState("");

  // Notification Preferences State
  const [desktopPush, setDesktopPush] = useState(true);
  const [email, setEmail] = useState(true);
  const [issueAssigned, setIssueAssigned] = useState(true);
  const [statusChanged, setStatusChanged] = useState(true);
  const [deadline30Min, setDeadline30Min] = useState(true);
  const [deadline10Min, setDeadline10Min] = useState(true);
  const [deadlineOverdue, setDeadlineOverdue] = useState(true);
  const [issueFixed, setIssueFixed] = useState(true);
  const [issueReopened, setIssueReopened] = useState(true);
  const [testingRequired, setTestingRequired] = useState(true);
  const [regressionRequired, setRegressionRequired] = useState(true);

  const handleTestPush = async () => {
    try {
      setTestingPush(true);
      setPushStatus("");

      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setPushStatus("Test notification sent! Check your desktop / browser notifications.");
      } else {
        setPushStatus("Failed to send test push: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      setPushStatus("Error: " + err.message);
    } finally {
      setTestingPush(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="h-6 w-6 text-blue-600" />
          <span>Settings & Notification Preferences</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure real-time Web Push channels, deadline alerts, and email notifications
        </p>
      </div>

      {/* Browser Web Push Banner Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Desktop Push Notifications</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Web Push delivers alerts even when VisionTrack is minimized or in another tab
              </p>
            </div>
          </div>

          <button
            onClick={handleTestPush}
            disabled={testingPush}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {testingPush ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            <span>Test Browser Push</span>
          </button>
        </div>

        {pushStatus && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
            <span>{pushStatus}</span>
          </div>
        )}
      </div>

      {/* Granular Notification Channels */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notification Alert Preferences</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Choose which event triggers send push and email notifications to you
          </p>
        </div>

        <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
          {[
            { label: "Desktop Push Notifications", desc: "Show operating system desktop banner when updates occur", state: desktopPush, setter: setDesktopPush },
            { label: "Email Notifications (Brevo)", desc: "Send HTML transactional emails for important alerts", state: email, setter: setEmail },
            { label: "Issue Assigned", desc: "When a new issue is assigned to you by QA Tester or Admin", state: issueAssigned, setter: setIssueAssigned },
            { label: "Status Changed", desc: "When issue moves to In Progress, In Review, or Tested", state: statusChanged, setter: setStatusChanged },
            { label: "Deadline - 30 Minutes Reminder", desc: "Pre-deadline alert 30 minutes before expiration", state: deadline30Min, setter: setDeadline30Min },
            { label: "Deadline - 10 Minutes Urgent Reminder", desc: "Urgent countdown notification 10 minutes prior", state: deadline10Min, setter: setDeadline10Min },
            { label: "Deadline Overdue Alert", desc: "Urgent alert when an active issue has passed its deadline", state: deadlineOverdue, setter: setDeadlineOverdue },
            { label: "Issue Fixed (Testing Required)", desc: "When developer submits resolution details and code fix", state: issueFixed, setter: setIssueFixed },
            { label: "Issue Reopened (QA Failure)", desc: "When testing or regression validation fails", state: issueReopened, setter: setIssueReopened },
            { label: "Regression Required", desc: "When testing passes and regression checklist is pending", state: regressionRequired, setter: setRegressionRequired },
          ].map((item, idx) => (
            <div key={idx} className="pt-3 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{item.label}</span>
                <span className="text-[11px] text-slate-400 block">{item.desc}</span>
              </div>
              <button
                type="button"
                onClick={() => item.setter(!item.state)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                  item.state ? "bg-blue-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
