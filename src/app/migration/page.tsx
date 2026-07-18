"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAppData } from "@/lib/appContext";
import { CsvImportTool } from "@/components/CsvImportTool";

export default function MigrationPage() {
  const { data: session, status } = useSession();
  const { runPurge, syncToSupabase, events, accounts } = useAppData();
  const [purging, setPurging] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isPracticeMode = typeof window !== "undefined" && localStorage.getItem("financeos_practice_mode") === "true";
  const hasCustomEvents = (events || []).some(e => !String(e.id || "").startsWith("demo-") && !String(e.id || "").startsWith("tx-00") && !String(e.id || "").startsWith("sample-"));
  const hasCustomAccounts = (accounts || []).some(a => !["GTBank Salary", "Zenith Savings", "OPay Wallet", "Cash", "Kuda Daily", "PiggyVest Savings", "Cowrywise Invest", "Main Checking"].includes(a.name));
  const isRealWorkspace = !isPracticeMode && (
    (typeof window !== "undefined" && localStorage.getItem("financeos_onboarding_completed") === "true") ||
    hasCustomEvents ||
    hasCustomAccounts
  );

  const handleRunSync = async () => {
    setSyncing(true);
    setResult(null);
    const res = await syncToSupabase();
    setSyncing(false);
    setResult(res);
  };

  const handleResetLocal = async () => {
    if (!window.confirm("Are you sure you want to restore standard sample data for practice?")) return;
    setPurging(true);
    setResult(null);
    const res = await runPurge("local");
    setPurging(false);
    setResult(res);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--foreground)" }}>
          Import & Backup Center
        </h1>
        <p className="text-sm font-medium mt-1" style={{ color: "var(--muted-foreground)" }}>
          Download standardized import templates, upload historical transaction spreadsheets, and synchronize your records across devices.
        </p>
      </div>

      {result && (
        <div className={`p-4 rounded-2xl border font-bold text-sm flex items-center gap-2 ${result.success ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : "bg-red-500/10 text-red-500 border-red-500/30"}`}>
          <span>{result.success ? "✅" : "❌"}</span>
          <span>{result.message}</span>
        </div>
      )}

      {/* CSV Bulk Import Tool Section */}
      <CsvImportTool />

      {/* Data Sync Card */}
      <div className="p-6 sm:p-8 rounded-3xl border space-y-6" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
              ⚡ Multi-Device Data Sync
            </h2>
            <p className="text-xs font-medium mt-1" style={{ color: "var(--muted-foreground)" }}>
              Ensure all your recent activity, accounts, and budget categories are safely backed up to your account.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRunSync}
              disabled={syncing}
              className="px-5 py-2.5 bg-[#635BFF] hover:bg-[#5851e5] disabled:opacity-50 text-white rounded-2xl font-bold text-xs shadow-md transition-transform active:scale-95"
            >
              {syncing ? "Synchronizing..." : "Synchronize Records Now"}
            </button>

            {mounted && !isRealWorkspace && (
              <button
                onClick={handleResetLocal}
                disabled={purging}
                className="px-5 py-2.5 rounded-2xl font-bold text-xs border transition-transform active:scale-95 text-amber-500 border-amber-500/30 bg-amber-500/10"
              >
                {purging ? "Loading..." : "Load Sample Data"}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="p-4 rounded-2xl bg-muted border">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Speed & Offline Performance</p>
            <p className="text-base font-extrabold mt-1" style={{ color: "var(--foreground)" }}>
              Instant Local Storage (&lt; 50ms)
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted border">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active User Account</p>
            <p className="text-base font-extrabold mt-1 truncate" style={{ color: "var(--foreground)" }}>
              {status === "authenticated" && session?.user?.email ? session.user.email : "Local Demo Workspace"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}