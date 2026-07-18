"use client";

import React, { useState, useEffect } from "react";
import { useAppData } from "@/lib/appContext";
import { logger } from "@/lib/logger";

export function TopHeader() {
  const { syncToSupabase, isSyncing, rejectedSyncCount } = useAppData();
  const [syncFailed, setSyncFailed] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Expose manual sync for user action and tests
  const handleSync = async () => {
    try {
      const result = await syncToSupabase();
      if (!result.success && result.errorType === 'NETWORK_ERROR') {
        logger.warn("Manual sync failed", { error: result.message });
        setSyncFailed(true);
      } else {
        setSyncFailed(false);
      }
    } catch (err: any) {
      logger.error("Manual sync crashed", { error: err.message });
      setSyncFailed(true);
    }
  };

  useEffect(() => {
    // Initial state
    setIsOnline(typeof window !== "undefined" ? window.navigator.onLine : true);

    const handleOnline = async () => {
      setIsOnline(true);
      try {
        const result = await syncToSupabase();
        if (!result.success && result.errorType === 'NETWORK_ERROR') {
          logger.warn("Background sync after online recovery failed", { error: result.message });
          setSyncFailed(true);
        } else {
          setSyncFailed(false);
        }
      } catch (err: any) {
        logger.error("Background sync after online recovery crashed", { error: err.message });
        setSyncFailed(true);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncFailed(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncToSupabase]);

  return (
    <header className="sticky top-0 z-30 w-full px-4 sm:px-6 py-3 bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 backdrop-blur-md transition-all shadow-sm">
      <div className="flex items-center gap-3">
        <div className="font-bold text-lg tracking-tight bg-gradient-to-r from-zinc-800 to-zinc-500 dark:from-zinc-100 dark:to-zinc-400 bg-clip-text text-transparent">
          financeOS
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Sync Status Indicators */}
        <div className="flex items-center gap-2">
          {/* Explicit Sync Button for tests and manual retries */}
          <button 
            onClick={handleSync} 
            disabled={isSyncing}
            className="hidden sm:flex text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 disabled:opacity-50 transition-colors"
          >
            {isSyncing ? "Syncing..." : "Sync"}
          </button>

          {syncFailed && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-bold uppercase tracking-wider transition-all duration-300">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              Sync Failed (Will Retry)
            </div>
          )}
          {rejectedSyncCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-wider transition-all duration-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {rejectedSyncCount} changes couldn't be saved
            </div>
          )}
        </div>

        {/* User Profile Stub (Reconstructed UI) */}
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center text-sm font-semibold shadow-inner cursor-pointer hover:opacity-90 transition-opacity">
          JA
        </div>
      </div>
    </header>
  );
}