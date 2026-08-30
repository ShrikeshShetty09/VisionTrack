"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Shield,
  Search,
  KeyRound,
  CheckCircle2,
  XCircle,
  Edit2,
  Lock,
  Mail,
  User,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { formatDate, getRoleBadgeConfig } from "@/lib/utils";
import { Role } from "@/types";

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Create User Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("TESTER");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  // Password Reset Modal state
  const [resettingUser, setResettingUser] = useState<any>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);

      const res = await fetch(`/api/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError("");

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user account");
      }

      setShowCreateModal(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      await fetchUsers();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create user");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    setResetSubmitting(true);
    setResetError("");

    try {
      const res = await fetch(`/api/users/${resettingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: resetPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setResettingUser(null);
      setResetPassword("");
      alert(`Password for ${resettingUser.name} updated successfully!`);
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password");
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleToggleActive = async (targetUser: any) => {
    const confirmMsg = targetUser.isActive
      ? `Are you sure you want to deactivate ${targetUser.name}? They will not be able to log in.`
      : `Reactivate account for ${targetUser.name}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/users/${targetUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !targetUser.isActive,
        }),
      });

      if (res.ok) {
        await fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-purple-600" />
            <span>User & Access Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Create and provision credentials for Testers, Developers, and Administrators
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>+ Create User Account</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-3 justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full text-xs pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Administrators</option>
            <option value="TESTER">QA Testers</option>
            <option value="DEVELOPER">Developers</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-2">
            <Loader2 className="h-6 w-6 text-purple-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading user accounts...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider bg-slate-50/50 dark:bg-slate-950/50">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Active Issues</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => {
                  const roleBadge = getRoleBadgeConfig(u.role);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white block">{u.name}</span>
                            <span className="text-[11px] text-slate-400">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold inline-block ${roleBadge?.bg}`}>
                          {roleBadge?.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                            <XCircle className="h-3 w-3" /> Deactivated
                          </span>
                        )}
                      </td>

                      {/* Active Issues Count */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {u._count?.assignedIssues || 0}
                      </td>

                      {/* Last Login */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] font-mono">
                        {formatDate(u.lastLoginAt)}
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] font-mono">
                        {formatDate(u.createdAt, "dd MMM yyyy")}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reset Password Button */}
                          <button
                            onClick={() => setResettingUser(u)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Reset User Password"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>

                          {/* Toggle Active / Deactivate */}
                          <button
                            onClick={() => handleToggleActive(u)}
                            className={`p-1.5 rounded-lg border text-xs font-semibold transition ${
                              u.isActive
                                ? "border-slate-200 dark:border-slate-800 text-slate-500 hover:text-red-600"
                                : "border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={u.isActive ? "Deactivate User" : "Activate User"}
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-purple-600" />
                <span>Create New User Account</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-xs">
              {createError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 rounded-xl text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Vikram Mehta"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Corporate Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@visiondatalabs.com"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  System Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                >
                  <option value="TESTER">QA Tester (Primary Role)</option>
                  <option value="DEVELOPER">Developer (Assignments & Fixes)</option>
                  <option value="ADMIN">Administrator (Full Access)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Initial Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {createSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Reset User Password</h3>
              <button onClick={() => setResettingUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4 text-xs">
              <p className="text-slate-500">
                Enter a new password for <strong>{resettingUser.name}</strong> ({resettingUser.email}):
              </p>

              {resetError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs">{resetError}</div>
              )}

              <div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="New Password (min 6 chars)"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                >
                  {resetSubmitting ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
