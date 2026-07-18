"use client";

import React, { Component, ReactNode } from "react";
import { useAppData } from "@/lib/appContext";
import { calculateNetWorth } from "@/domain/financeEngine/engine";

class DashboardErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Dashboard caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300">
          <h2 className="text-xl font-bold mb-2">Couldn't calculate your balance right now.</h2>
          <p>There was an error processing your financial data.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function DashboardContent() {
  const { accounts, events, activeCycleId } = useAppData();
  
  // Reconstructed Verified Logic: calling calculateNetWorth
  const netWorth = calculateNetWorth(accounts);

  return (
    <div className="flex flex-col md:flex-row gap-6 p-6">
      {/* 
        NEW UI RECONSTRUCTION: 
        The specific charts and balance display components were lost.
        These metric cards are new implementations using Tailwind.
      */}
      <div className="w-full md:w-1/3 flex flex-col gap-4">
        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Total Net Worth</h3>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            ₦{(netWorth / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Active Cycle</h3>
          <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            {activeCycleId || "None"}
          </p>
        </div>
      </div>
      
      {/* 
        NEW UI RECONSTRUCTION: 
        A placeholder for the activity/chart section that was lost. 
      */}
      <div className="w-full md:w-2/3 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
        <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100">Recent Activity</h3>
        <div className="space-y-3">
          {events && events.length > 0 ? (
            events.slice(0, 5).map((e: any, i: number) => (
              <div key={e.id || i} className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{e.type || "Event"}</span>
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  ₦{((e.payload?.amount || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No recent events found.</p>
          )}
        </div>
        
        <div className="mt-8 p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 text-sm">
          [Chart Placeholder]
        </div>
      </div>
    </div>
  );
}

export function DashboardView() {
  return (
    <DashboardErrorBoundary>
      <DashboardContent />
    </DashboardErrorBoundary>
  );
}
