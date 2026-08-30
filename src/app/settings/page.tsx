"use client";

import React, { useState, useEffect } from "react";
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
  User,
  Lock,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [testingPush, setTestingPush] = useState(false);
  const [pushStatus, setPushStatus] = useState("");

  // Profile Credentials State
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Sync user details once loaded
  useEffect(() => {
    if (user) {
      setProfileName(user.name || "");
      setProfileEmail(user.email || "");
    }
  }, [user]);

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

      // 1. Request permission if not yet granted
      if (typeof window === "undefined" || !("Notification" in window)) {
        setPushStatus("Your browser does not support desktop notifications.");
        setTestingPush(false);
        return;
      }

      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }

      if (Notification.permission !== "granted") {
        setPushStatus("Please enable system notifications for this site in your browser settings (click the lock icon in the address bar).");
        setTestingPush(false);
        return;
      }

      // 2. Use ServiceWorkerRegistration.showNotification() — the modern API
      // (new Notification() is deprecated in browsers with an active Service Worker)
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification("🔔 VisionTrack — Test Notification", {
          body: "Push notifications are active! You'll receive live updates even when VisionTrack is in another tab.",
          icon: "/logo.png",
          badge: "/logo.png",
          requireInteraction: true,
          tag: `vt-test-${Date.now()}`,
        } as NotificationOptions);
      }

      // 3. Also trigger server-side Web Push for full end-to-end validation
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setPushStatus("✅ Test notification sent successfully! It should appear on your desktop now.");
      } else {
        setPushStatus("Local alert shown. Server push failed: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      setPushStatus("Error: " + err.message);
    } finally {
      setTestingPush(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newPassword && newPassword !== confirmPassword) {
      setProfileError("Passwords do not match.");
      setProfileSuccess("");
      return;
    }

    setUpdatingProfile(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile details.");
      }

      setProfileSuccess("Account credentials updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
      await refreshUser();
    } catch (err: any) {
      setProfileError(err.message || "An unexpected error occurred.");
    } finally {
      setUpdatingProfile(false);
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
          Configure real-time Web Push channels, credentials, and email notifications
        </p>
      </div>

      {/* Profile & Credentials Form Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-5">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-blue-600" />
            <span>Update Account & Credentials</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Change your display name, username/email, or reset your login password
          </p>
        </div>

        {profileSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{profileSuccess}</span>
          </div>
        )}

        {profileError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Username / Email
              </label>
              <input
                type="text"
                required
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                New Password (leave blank to keep current)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none transition"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={updatingProfile}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 disabled:cursor-not-allowed"
            >
              {updatingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
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
