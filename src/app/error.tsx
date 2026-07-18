"use client";

import React, { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Global Frontend Route Boundary Caught Unhandled Exception", { digest: error.digest }, error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <div className="max-w-md w-full p-8 rounded-3xl border shadow-2xl space-y-6 text-center" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto text-3xl font-black">
          ⚠️
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold tracking-tight">Something went wrong</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            An unexpected error occurred while rendering this interface. Our system telemetry has automatically logged this incident.
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono text-muted-foreground/80 bg-black/5 dark:bg-white/5 py-1 px-2 rounded">
              Incident ID: {error.digest}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-extrabold text-xs bg-[#635BFF] text-white shadow-lg shadow-[#635BFF]/20 hover:opacity-90 transition-all"
          >
            🔄 Try Again
          </button>
          <button
            type="button"
            onClick={() => window.location.href = "/"}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs border border-border bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
          >
            🏠 Return Home
          </button>
        </div>
      </div>
    </div>
  );
}
