"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, Loader2, AlertCircle, ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export default function LoginPage() {
  const { user, loading, refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // If already logged in, redirect straight to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email/username and password.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed. Please check your credentials.");
      }

      await refreshUser();
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // If loading or already logged in (redirecting), show a clean screen to avoid flashing login form
  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          <p className="text-xs font-medium text-slate-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-slate-100 relative">
      {/* Soft corporate branding grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />
      
      <div className="w-full max-w-[440px] z-10 space-y-8">
        {/* Corporate Identity */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-24 w-24 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-center relative">
            <div className="relative h-16 w-16">
              <Image src="/logo.png" alt="Vision Datalabs" fill className="object-contain" priority />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              <span>VisionTrack</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold uppercase tracking-wider">
                QA Suite
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 max-w-sm">
              Software Quality Assurance, Bug Testing, and Issue Management Portal for Vision Datalabs
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800/80 p-8 rounded-2xl shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Sign In</h2>
            <p className="text-xs text-slate-400">
              Authorized personnel only. Please sign in using your system credentials.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username/Email Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@visiondatalabs.com"
                  className="w-full text-xs pl-10 pr-3.5 py-3 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs pl-10 pr-3.5 py-3 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none transition"
                />
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security / Compliance Disclaimer */}
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3.5 bg-slate-900/40 border border-slate-800/40 rounded-xl">
            <ShieldAlert className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 leading-normal">
              This system is property of Vision Datalabs. All activity is logged and monitored for security compliance. Unauthorized access attempts are subject to disciplinary action or prosecution.
            </p>
          </div>
          <p className="text-center text-[10px] text-slate-600">
            VisionTrack Version 2.0 &copy; {new Date().getFullYear()} Vision Datalabs. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
