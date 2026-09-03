"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  Search,
  FolderGit2,
  Boxes,
  ExternalLink,
  ChevronRight,
  Loader2,
  AlertCircle,
  X,
  Edit2,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { formatDate } from "@/lib/utils";

export default function AdminSoftwarePage() {
  const { user } = useAuth();
  const [softwareList, setSoftwareList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create Software Modal
  const [showCreateSoftware, setShowCreateSoftware] = useState(false);
  const [swName, setSwName] = useState("");
  const [swCode, setSwCode] = useState("");
  const [swDesc, setSwDesc] = useState("");
  const [swRepo, setSwRepo] = useState("");
  const [submittingSw, setSubmittingSw] = useState(false);
  const [swError, setSwError] = useState("");

  // Create Module Modal
  const [selectedSoftwareForModule, setSelectedSoftwareForModule] = useState<any>(null);
  const [modName, setModName] = useState("");
  const [modCode, setModCode] = useState("");
  const [modDesc, setModDesc] = useState("");
  const [submittingMod, setSubmittingMod] = useState(false);
  const [modError, setModError] = useState("");

  const fetchSoftware = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/software");
      if (res.ok) {
        const data = await res.json();
        setSoftwareList(data.software || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSoftware();
  }, []);

  const handleCreateSoftware = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingSw(true);
    setSwError("");

    try {
      const res = await fetch("/api/software", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: swName,
          code: swCode.toUpperCase(),
          description: swDesc,
          repositoryUrl: swRepo,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create software suite");
      }

      setShowCreateSoftware(false);
      setSwName("");
      setSwCode("");
      setSwDesc("");
      setSwRepo("");
      await fetchSoftware();
    } catch (err: any) {
      setSwError(err.message || "Failed to create software suite");
    } finally {
      setSubmittingSw(false);
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSoftwareForModule) return;
    setSubmittingMod(true);
    setModError("");

    try {
      const res = await fetch("/api/software", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_MODULE",
          softwareId: selectedSoftwareForModule.id,
          name: modName,
          code: modCode.toUpperCase(),
          description: modDesc,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create module");
      }

      setSelectedSoftwareForModule(null);
      setModName("");
      setModCode("");
      setModDesc("");
      await fetchSoftware();
    } catch (err: any) {
      setModError(err.message || "Failed to create module");
    } finally {
      setSubmittingMod(false);
    }
  };

  const handleDeleteModule = async (moduleId: string, moduleName: string) => {
    if (!window.confirm(`Are you sure you want to remove the module "${moduleName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/software?moduleId=${moduleId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove module");
      }
      await fetchSoftware();
    } catch (err: any) {
      alert(err.message || "Failed to remove module");
    }
  };

  const handleDeleteSoftware = async (softwareId: string, softwareName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the software system "${softwareName}"? If it has logged defects, it will be deactivated and archived.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/software?softwareId=${softwareId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete software");
      }
      await fetchSoftware();
    } catch (err: any) {
      alert(err.message || "Failed to delete software");
    }
  };

  const filteredSoftware = softwareList.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-blue-600" />
            <span>Software Suites & Modules Manager</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Organize Vision Datalabs software applications, functional modules, and track defect distributions
          </p>
        </div>

        <button
          onClick={() => setShowCreateSoftware(true)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>+ Add Software Suite</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search software suite name or code..."
            className="w-full text-xs pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Software Suites Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          <p className="text-xs text-slate-500">Loading software suites and modules...</p>
        </div>
      ) : filteredSoftware.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          No software suites found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSoftware.map((sw) => (
            <div
              key={sw.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-500/50 transition"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    {sw.code}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {sw.issues?.length || sw._count?.issues || 0} Total Issues
                    </span>
                    <button
                      onClick={() => setSelectedSoftwareForModule(sw)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 transition"
                    >
                      <Plus className="h-3 w-3" /> Add Module
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-blue-600" />
                    <span>{sw.name}</span>
                  </h3>
                  {sw.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {sw.description}
                    </p>
                  )}
                </div>

                {sw.repositoryUrl && (
                  <a
                    href={sw.repositoryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600 font-mono"
                  >
                    <FolderGit2 className="h-3.5 w-3.5" />
                    <span className="truncate">{sw.repositoryUrl}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                {/* Modules list */}
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                    Configured Modules ({sw.modules?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {sw.modules && sw.modules.length > 0 ? (
                      sw.modules.map((m: any) => (
                        <div
                          key={m.id}
                          className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex items-center gap-1.5 group"
                        >
                          <span className="text-slate-800 dark:text-slate-200 font-medium">{m.name}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteModule(m.id, m.name)}
                            className="text-slate-400 hover:text-red-600 p-0.5 rounded transition hover:bg-red-50 dark:hover:bg-red-950/40"
                            title={`Remove module "${m.name}"`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No sub-modules defined yet</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Created {formatDate(sw.createdAt, "dd MMM yyyy")}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-500">{sw.isActive ? "Active Suite" : "Inactive"}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteSoftware(sw.id, sw.name)}
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 px-2 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1"
                    title={`Delete "${sw.name}" software suite`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE SOFTWARE SUITE MODAL */}
      {showCreateSoftware && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="h-4 w-4 text-blue-600" />
                <span>Add New Software Suite</span>
              </h3>
              <button onClick={() => setShowCreateSoftware(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSoftware} className="p-6 space-y-4 text-xs">
              {swError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{swError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Software Suite Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={swName}
                  onChange={(e) => setSwName(e.target.value)}
                  placeholder="e.g. VisionFlow Core"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Identifier Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={swCode}
                  onChange={(e) => setSwCode(e.target.value.toUpperCase())}
                  placeholder="e.g. VF-CORE"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={swDesc}
                  onChange={(e) => setSwDesc(e.target.value)}
                  placeholder="Describe the software scope and capabilities..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Git Repository URL
                </label>
                <input
                  type="url"
                  value={swRepo}
                  onChange={(e) => setSwRepo(e.target.value)}
                  placeholder="https://github.com/visiondatalabs/visionflow"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSoftware(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSw}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingSw ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>Create Software</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE MODULE MODAL */}
      {selectedSoftwareForModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Add Module to {selectedSoftwareForModule.name}
              </h3>
              <button onClick={() => setSelectedSoftwareForModule(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateModule} className="p-6 space-y-4 text-xs">
              {modError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{modError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Module Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={modName}
                  onChange={(e) => setModName(e.target.value)}
                  placeholder="e.g. Analytics Engine"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={modDesc}
                  onChange={(e) => setModDesc(e.target.value)}
                  placeholder="Functional area or component description..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSoftwareForModule(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMod}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingMod ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>Save Module</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
