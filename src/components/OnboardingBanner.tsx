"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { useAppData } from "@/lib/appContext";
import { CsvImportTool } from "@/components/CsvImportTool";
import Link from "next/link";

export function OnboardingBanner() {
  const { data: session, status } = useSession();
  const {
    isSyncing,
    activeCycleId,
    setActiveCycleId,
    availableCycles,
    runPurge,
    refreshData,
    syncToSupabase,
    logoutAndClearCache,
    events,
    accounts,
  } = useAppData();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [demoDismissed, setDemoDismissed] = useState(false);
  const [isPurgingLocal, setIsPurgingLocal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSupabaseSyncing, setIsSupabaseSyncing] = useState(false);
  const [showCsvTool, setShowCsvTool] = useState(false);
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

  const isExplicitlyLoggedOut = typeof window !== "undefined" && localStorage.getItem("financeos_logged_out") === "true";
  const isLoggedIn = status === "authenticated" || (mounted && !isExplicitlyLoggedOut && (
    localStorage.getItem("financeos_onboarding_completed") === "true" ||
    Boolean(localStorage.getItem("financeos_display_name")) ||
    isRealWorkspace ||
    Boolean((session as any)?.user)
  ));

  const handleSafeLocalReset = async () => {
    setIsPurgingLocal(true);
    await runPurge("sample");
    setIsPurgingLocal(false);
  };

  // If not explicitly open, render nothing since TopHeader now handles global cycle/sync/actions
  if (!isOpen && !showCsvTool) {
    return null;
  }

  if (showCsvTool) {
    return (
      <div className="mb-6 relative">
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={() => setShowCsvTool(false)}
            className="px-4 py-2 rounded-xl text-xs font-bold border transition-all"
            style={{ backgroundColor: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            ✕ Close CSV Tool
          </button>
        </div>
        <CsvImportTool />
      </div>
    );
  }

  if (demoDismissed && !isLoggedIn) {
    return null;
  }

  return (
    <div
      className="mb-6 p-6 sm:p-8 rounded-3xl border shadow-lg relative overflow-hidden transition-all"
      style={{
        backgroundImage: "linear-gradient(135deg, rgba(99, 91, 255, 0.12) 0%, rgba(99, 91, 255, 0.03) 100%)",
        borderColor: "rgba(99, 91, 255, 0.25)",
        backgroundColor: "var(--card)",
      }}
    >
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 rounded-full bg-[#635BFF]/15 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#635BFF] text-white shadow-sm">
              FinanceOS
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full border border-[#635BFF]/30 text-[#635BFF] bg-[#635BFF]/5">
              Secure Data Engine Active
            </span>
          </div>

          <h3 className="text-lg font-extrabold tracking-tight" style={{ color: "var(--foreground)" }}>
            {!isLoggedIn
              ? "Your Personal Financial Operating System — Fast, Private & Secure"
              : `Welcome Back, ${(session as any)?.user?.name || (mounted && localStorage.getItem("financeos_display_name")) || (session as any)?.user?.email || "User"}`}
          </h3>

          <p className="text-xs font-medium leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            {!isLoggedIn
              ? "All your financial activity is recorded instantly on your device. Sign in anytime to access and manage your records across devices."
              : "Your account is active and secure. You can import transactions from spreadsheets or save your latest updates below."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-shrink-0 w-full lg:w-auto">
          {!isLoggedIn ? (
            <>
              <Link
                href="/login"
                className="px-6 py-3 bg-[#635BFF] hover:bg-[#5851e5] text-white rounded-xl text-xs font-bold transition-all shadow-[0_4px_14px_rgba(99,91,255,0.4)] active:scale-95 flex items-center justify-center gap-2.5"
              >
                Sign In to Access Account
              </Link>
              <button
                onClick={() => setDemoDismissed(true)}
                className="px-4 py-3 rounded-xl text-xs font-bold border transition-all hover:opacity-80 text-center"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                Explore Guest Demo
              </button>
            </>
          ) : (
            <div className="flex gap-2.5 flex-wrap w-full">
              <button
                type="button"
                onClick={async () => {
                  setIsSupabaseSyncing(true);
                  const res = await syncToSupabase();
                  setIsSupabaseSyncing(false);
                  alert(res.success ? "✅ " + res.message : "❌ " + res.message);
                }}
                disabled={isSupabaseSyncing || isSyncing}
                className="px-5 py-3 bg-[#635BFF] hover:bg-[#5851e5] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex-1 sm:flex-initial text-center"
              >
                {isSupabaseSyncing ? "Saving..." : "⚡ Save & Synchronize"}
              </button>
              <button
                type="button"
                onClick={() => setShowCsvTool(true)}
                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex-1 sm:flex-initial text-center"
              >
                📥 Import Transactions
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm("Sign out and clear local device cache for privacy?")) {
                    await logoutAndClearCache();
                    await signOut({ callbackUrl: "/login" });
                  }
                }}
                className="px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex-1 sm:flex-initial text-center"
              >
                🚪 Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}