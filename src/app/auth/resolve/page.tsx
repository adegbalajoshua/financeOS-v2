"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAppData } from "@/lib/appContext";

export default function ResolveAuthPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { refreshData } = useAppData();
  const [resolveStep, setResolveStep] = useState<string>("Verifying session credentials...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function resolveUser() {
      if (status === "loading") return;

      if (status === "unauthenticated" || !session?.user?.email) {
        if (isMounted) router.replace("/login");
        return;
      }

      try {
        setResolveStep(`Inspecting workspace and syncing records for ${session.user.email}...`);
        
        // 1. ALWAYS run refreshData() first to auto-migrate default_user rows and spool database
        let refreshRes: any = { success: false, hasData: false };
        try {
          refreshRes = await refreshData();
        } catch (e) {
          console.error("Spool error during resolution:", e);
        }

        const checkRes = await fetch(`/api/auth/check-status?email=${encodeURIComponent(session.user.email)}`);
        const checkData = await checkRes.json();

        const hasRealRecordsOrCompleted = Boolean(
          (checkData && checkData.hasCompletedOnboarding) ||
          (checkData && checkData.hasRecords)
        );

        if (hasRealRecordsOrCompleted) {
          setResolveStep("Workspace synchronized! Directing to command center...");
          localStorage.setItem("financeos_onboarding_completed", "true");
          try {
            await fetch("/api/auth/check-status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "mark_onboarding_complete" }),
            });
          } catch (_) {}

          setTimeout(() => {
            if (isMounted) router.replace("/");
          }, 300);
        } else {
          setResolveStep("New workspace detected! Directing to quick-start wizard...");
          setTimeout(() => {
            if (isMounted) router.replace("/onboarding");
          }, 300);
        }
      } catch (err: any) {
        console.error("Resolution check failed:", err);
        setErrorMsg("Proceeding to workspace setup...");
        setTimeout(() => {
          if (isMounted) router.replace("/");
        }, 1200);
      }
    }

    resolveUser();
    return () => { isMounted = false; };
  }, [status, session]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#06060A] text-white p-4 font-sans">
      <div className="w-full max-w-md p-8 rounded-3xl bg-[#0F0F1A] border border-white/10 text-center space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-8 right-8 h-[1.5px] bg-gradient-to-r from-transparent via-[#635BFF] to-transparent opacity-80" />
        
        <div className="w-14 h-14 rounded-2xl bg-[#635BFF]/20 border border-[#635BFF]/40 text-[#635BFF] flex items-center justify-center mx-auto shadow-inner">
          <div className="w-7 h-7 border-3 border-[#635BFF]/30 border-t-[#635BFF] rounded-full animate-spin" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-white tracking-tight">Syncing Workspace</h2>
          <p className="text-xs text-white/60 font-medium leading-relaxed min-h-[2.5rem] flex items-center justify-center">
            {errorMsg || resolveStep}
          </p>
        </div>

        <div className="pt-4 border-t border-white/[0.06] flex items-center justify-center gap-2 text-[11px] font-bold text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Encrypted Session Active</span>
        </div>
      </div>
    </div>
  );
}
