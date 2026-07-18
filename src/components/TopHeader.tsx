"use client";

import React, { useState } from "react";
import { useAppData } from "@/lib/appContext";

export function TopHeader() {
  const { syncToSupabase, isSyncing, rejectedSyncCount } = useAppData();
  const [syncFailed, setSyncFailed] = useState(false);

  const handleSync = async () => {
    const res = await syncToSupabase();
    if (!res.success && res.errorType === 'NETWORK_ERROR') {
      setSyncFailed(true);
    } else {
      setSyncFailed(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full px-4 sm:px-6 py-3 border-b flex items-center justify-between gap-4 backdrop-blur-md transition-all shadow-sm">
      <div className="flex items-center gap-3">
        <button onClick={handleSync} disabled={isSyncing}>
          {isSyncing ? "Syncing..." : "Sync"}
        </button>
        {syncFailed && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Sync Failed (Will Retry)
          </div>
        )}
        {rejectedSyncCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-wider">
            {rejectedSyncCount} changes couldn't be saved
          </div>
        )}
      </div>
    </header>
  );
}