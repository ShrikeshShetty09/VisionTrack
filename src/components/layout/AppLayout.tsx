"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Layers,
  CheckSquare,
  PlusCircle,
  Clock,
  CheckCircle,
  FileCheck,
  Users,
  BarChart3,
  ScrollText,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Search,
  ChevronRight,
  Shield,
  Activity,
  AlertCircle,
  Boxes,
} from "lucide-react";
import { useAuth } from "../auth-provider";
import { useTheme } from "../theme-provider";
import { NotificationBell } from "../notifications/NotificationBell";
import { PushNotificationManager } from "../notifications/PushNotificationManager";
import { getRoleBadgeConfig } from "@/lib/utils";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fullUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;

  // Background deadline worker poll (every 60 seconds)
  useEffect(() => {
    if (!user) return;
    const runDeadlineCheck = async () => {
      try {
        await fetch("/api/cron/deadlines");
      } catch (err) {
        // silent
      }
    };
    runDeadlineCheck();
    const interval = setInterval(runDeadlineCheck, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // Handle route protection
  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.push("/login");
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading VisionTrack...</p>
        </div>
      </div>
    );
  }

  if (!user && pathname === "/login") {
    return <>{children}</>;
  }

  const roleConfig = user ? getRoleBadgeConfig(user.role) : null;

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "TESTER", "DEVELOPER"] },
    { label: "All Issues", href: "/issues", icon: Layers, roles: ["ADMIN", "TESTER", "DEVELOPER"] },
    {
      label: user?.role === "DEVELOPER" ? "My Assigned Issues" : "My Reported Issues",
      href: "/issues?myIssues=true",
      icon: CheckSquare,
      roles: ["TESTER", "DEVELOPER"],
    },
    { label: "+ Create Issue", href: "/issues/create", icon: PlusCircle, roles: ["ADMIN", "TESTER"], highlight: true },
    {
      heading: "QA & Testing",
      roles: ["ADMIN", "TESTER"],
      items: [
        { label: "Awaiting Testing", href: "/issues?status=FIXED", icon: Clock },
        { label: "Testing in Progress", href: "/issues?status=TESTING_IN_PROGRESS", icon: Activity },
        { label: "Regression Testing", href: "/issues?status=TESTED", icon: FileCheck },
      ],
    },
    {
      heading: "Quality Reports & Progress",
      roles: ["ADMIN", "TESTER", "DEVELOPER"],
      items: [
        { label: "Quality Analytics", href: "/reports?tab=analytics", icon: BarChart3 },
        { label: "Developer Status", href: "/reports?tab=developers", icon: Users },
        { label: "QA Productivity", href: "/reports?tab=testers", icon: Activity },
        { label: "Software Progress", href: "/reports?tab=software", icon: Layers },
      ],
    },
    {
      heading: "Administration",
      roles: ["ADMIN"],
      items: [
        { label: "User Management", href: "/admin/users", icon: Shield },
        { label: "Software & Modules", href: "/admin/software", icon: Boxes },
        { label: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText },
      ],
    },
    { label: "Settings", href: "/settings", icon: Settings, roles: ["ADMIN", "TESTER", "DEVELOPER"] },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Banner for Push Notification Setup */}
      <PushNotificationManager />

      {/* Mobile Overlay Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Layout Shell */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Sidebar Drawer */}
        <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-transform duration-300 md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}>
          {/* Brand Header */}
          <div className="h-16 px-4 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 shrink-0 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white p-0.5">
                <Image src="/logo.png" alt="Vision Datalabs Logo" fill className="object-contain" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white leading-none">
                  VisionTrack
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Vision Datalabs QA
                </span>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item, idx) => {
              if (item.heading) {
                if (user && !item.roles.includes(user.role)) return null;
                return (
                  <div key={idx} className="pt-4 pb-1">
                    <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {item.heading}
                    </p>
                    <div className="mt-1 space-y-0.5">
                      {item.items.map((sub: any, sIdx: number) => {
                        const active = sub.href === fullUrl || (sub.href === pathname && !searchParams.toString());
                        const Icon = sub.icon;
                        return (
                          <Link
                            key={sIdx}
                            href={sub.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                              active
                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              if (user && item.roles && !item.roles.includes(user.role)) return null;
              const Icon = item.icon!;
              const active = item.href === fullUrl || (item.href === pathname && !searchParams.toString());

              return (
                <Link
                  key={idx}
                  href={item.href!}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                    item.highlight
                      ? "bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow-sm"
                      : active
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile Footer */}
          {user && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {user.name}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 inline-block rounded font-medium border w-fit ${roleConfig?.bg}`}>
                      {roleConfig?.label}
                    </span>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Sidebar Desktop */}
        <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-30 shrink-0">
          {/* Brand Header */}
          <div className="h-16 px-4 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
            <div className="relative h-9 w-9 shrink-0 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white p-0.5">
              <Image src="/logo.png" alt="Vision Datalabs Logo" fill className="object-contain" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white leading-none">
                VisionTrack
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                Vision Datalabs QA
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item, idx) => {
              if (item.heading) {
                if (user && !item.roles.includes(user.role)) return null;
                return (
                  <div key={idx} className="pt-4 pb-1">
                    <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {item.heading}
                    </p>
                    <div className="mt-1 space-y-0.5">
                      {item.items.map((sub, sIdx) => {
                        const active = sub.href === fullUrl || (sub.href === pathname && !searchParams.toString());
                        const Icon = sub.icon;
                        return (
                          <Link
                            key={sIdx}
                            href={sub.href}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                              active
                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              if (user && item.roles && !item.roles.includes(user.role)) return null;
              const Icon = item.icon!;
              const active = item.href === fullUrl || (item.href === pathname && !searchParams.toString());

              return (
                <Link
                  key={idx}
                  href={item.href!}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                    item.highlight
                      ? "bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow-sm shadow-blue-500/20"
                      : active
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile Footer */}
          {user && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {user.name}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 inline-block rounded font-medium border w-fit ${roleConfig?.bg}`}>
                      {roleConfig?.label}
                    </span>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Topbar Header */}
          <header className="h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>Vision Datalabs</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-slate-900 dark:text-slate-200 font-semibold capitalize">
                  {pathname.split("/")[1] || "Dashboard"}
                </span>
              </div>
            </div>

            {/* Quick Actions & Header Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Quick Search */}
              <button
                onClick={() => router.push("/issues")}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-lg transition border border-slate-200 dark:border-slate-700"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Search issues, VT codes, devs...</span>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                  /
                </kbd>
              </button>

              {/* Dark / Light Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              >
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
              </button>

              {/* Notification Center */}
              <NotificationBell />

              {/* Role Indicator Banner */}
              {user && (
                <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${roleConfig?.bg}`}>
                    {user.role}
                  </span>
                </div>
              )}
            </div>
          </header>

          {/* Page Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950" />}>
      <AppLayoutContent>{children}</AppLayoutContent>
    </Suspense>
  );
}
