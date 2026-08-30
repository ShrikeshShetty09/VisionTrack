import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, isValid } from "date-fns";
import { IssueStatus, Priority, Role } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined, formatString: string = "dd MMM yyyy, hh:mm a"): string {
  if (!date) return "—";
  try {
    const parsed = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(parsed)) return "—";
    return format(parsed, formatString);
  } catch (err) {
    return "—";
  }
}

export function formatDeadline(date: string | Date | null | undefined): string {
  if (!date) return "No deadline";
  return formatDate(date, "dd MMM yyyy, hh:mm a");
}

export function getStatusBadgeConfig(status: IssueStatus) {
  switch (status) {
    case "NEW":
      return {
        label: "NEW",
        bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
        dot: "bg-blue-500",
      };
    case "ASSIGNED":
      return {
        label: "ASSIGNED",
        bg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/40",
        dot: "bg-indigo-500",
      };
    case "IN_PROGRESS":
      return {
        label: "IN PROGRESS",
        bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
        dot: "bg-amber-500 animate-pulse",
      };
    case "IN_REVIEW":
      return {
        label: "IN REVIEW",
        bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/40",
        dot: "bg-purple-500",
      };
    case "FIXED":
      return {
        label: "FIXED",
        bg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/40",
        dot: "bg-cyan-500",
      };
    case "TESTING_IN_PROGRESS":
      return {
        label: "TESTING",
        bg: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800/40",
        dot: "bg-pink-500 animate-pulse",
      };
    case "TESTED":
      return {
        label: "TESTED",
        bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
        dot: "bg-emerald-500",
      };
    case "REGRESSION":
      return {
        label: "REGRESSION",
        bg: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800/40",
        dot: "bg-teal-500",
      };
    case "RESOLVED":
      return {
        label: "RESOLVED",
        bg: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/40",
        dot: "bg-green-500",
      };
    case "TEST_FAILED":
    case "REGRESSION_FAILED":
    case "REOPENED":
      return {
        label: status.replace("_", " "),
        bg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40",
        dot: "bg-red-500",
      };
    default:
      return {
        label: status,
        bg: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800/40",
        dot: "bg-slate-500",
      };
  }
}

export function getPriorityBadgeConfig(priority: Priority) {
  switch (priority) {
    case "CRITICAL":
      return {
        label: "Critical",
        bg: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-300 dark:border-red-900/50 font-semibold",
        indicator: "🔴",
      };
    case "HIGH":
      return {
        label: "High",
        bg: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-900/50",
        indicator: "🟠",
      };
    case "MEDIUM":
      return {
        label: "Medium",
        bg: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-900/50",
        indicator: "🟡",
      };
    case "LOW":
      return {
        label: "Low",
        bg: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-900/50",
        indicator: "🔵",
      };
  }
}

export function getRoleBadgeConfig(role: Role) {
  switch (role) {
    case "ADMIN":
      return {
        label: "Admin",
        bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/40",
      };
    case "TESTER":
      return {
        label: "Tester (QA)",
        bg: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800/40",
      };
    case "DEVELOPER":
      return {
        label: "Developer",
        bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
      };
  }
}
