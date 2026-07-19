"use client";

import React, { Component, ReactNode, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAppData } from "@/lib/appContext";
import { formatCycleLabel } from "@/lib/formatCycle";
import { calculateNetWorth, calculateBudgetCycleSummary, resolveAccountColumns } from "@/domain/financeEngine/engine";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ── Error Boundary ──────────────────────────────────────────────────────────
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
          <h2 className="text-xl font-bold mb-2">Couldn&apos;t calculate your balance right now.</h2>
          <p>There was an error processing your financial data.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(kobo / 100);
}

function abbreviateNaira(kobo: number): string {
  const val = kobo / 100;
  if (Math.abs(val) >= 1_000_000) return `₦${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000) return `₦${(val / 1_000).toFixed(0)}K`;
  return `₦${val.toLocaleString()}`;
}

function getGreeting(): { text: string; icon: string } {
  const hour = new Date().getHours();
  if (hour < 5) return { text: "Good night", icon: "🌙" };
  if (hour < 12) return { text: "Good morning", icon: "☀️" };
  if (hour < 17) return { text: "Good afternoon", icon: "🌤" };
  return { text: "Good evening", icon: "🌙" };
}

/**
 * Computes a daily net worth time series by walking events chronologically.
 * For each unique date, it replays all events up to that date across all accounts
 * to produce a running net worth total.
 */
function computeNetWorthTimeSeries(
  events: any[],
  accounts: any[]
): { date: string; netWorth: number }[] {
  const activeEvents = events.filter((e) => !e.deleted_at);
  const activeAccounts = accounts.filter((a) => {
    const st = String(a.status || "Active").toUpperCase();
    return st !== "INACTIVE" && st !== "CLOSED" && !a.deleted_at;
  });

  if (activeAccounts.length === 0) return [];

  // Sort events by timestamp NEWEST to OLDEST (descending)
  const sortedDesc = [...activeEvents]
    .filter((e) => e.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Build per-account CURRENT balances and alias mapping
  const balances: Record<string, number> = {};
  const aliasMap: Record<string, string> = {};

  activeAccounts.forEach((acc) => {
    const key = String(acc.id || "").trim().toLowerCase();
    const nameLower = String(acc.name || "").trim().toLowerCase();
    // Anchor strictly to current balance
    const rawBal = Number(acc.balance ?? acc.openingBalance ?? 0);
    balances[key] = rawBal;
    aliasMap[key] = key;
    if (nameLower && nameLower !== key) {
      aliasMap[nameLower] = key;
    }
  });

  // Helper: compute total net worth from current balances map
  function totalNW(): number {
    let total = 0;
    activeAccounts.forEach((acc) => {
      const key = String(acc.id || "").trim().toLowerCase();
      const accType = String(acc.type || "Bank").toUpperCase();
      const isAsset = ["BANK", "CHECKING", "MOBILE", "CASH", "SAVINGS", "INVESTMENT", "CASH_WALLET"].includes(accType);
      const isLiability = ["CREDIT", "LOAN"].includes(accType);
      const bal = balances[key] ?? 0;
      if (isAsset) total += bal;
      else if (isLiability) total -= bal;
    });
    return total;
  }

  const series: { date: string; netWorth: number }[] = [];
  const today = new Date().toISOString().split("T")[0];

  if (sortedDesc.length === 0) {
    series.push({ date: today, netWorth: totalNW() });
    return series;
  }

  // Walk backwards from present day
  let currentDateStr = today;
  // This is the closing balance of today
  series.push({ date: currentDateStr, netWorth: totalNW() });

  sortedDesc.forEach((event) => {
    const eventDate = new Date(event.timestamp).toISOString().split("T")[0];
    
    // When we cross a date boundary, the CURRENT state of balances
    // represents the closing balance of the older date.
    if (eventDate !== currentDateStr) {
      currentDateStr = eventDate;
      series.push({ date: currentDateStr, netWorth: totalNW() });
    }

    const { fromAccountId, toAccountId, amount } = resolveAccountColumns(event as any);

    // REVERSE the transaction since we are walking backwards in time
    if (fromAccountId) {
      const k = aliasMap[fromAccountId.trim().toLowerCase()];
      if (k && balances[k] !== undefined) balances[k] += amount;
    }
    if (toAccountId) {
      const k = aliasMap[toAccountId.trim().toLowerCase()];
      if (k && balances[k] !== undefined) balances[k] -= amount;
    }
  });

  // After all events are reversed, `totalNW()` is the true initial balance before any events occurred.
  const oldestDate = sortedDesc[sortedDesc.length - 1] 
    ? new Date(sortedDesc[sortedDesc.length - 1].timestamp).toISOString().split("T")[0]
    : today;

  // Add the opening balance on the day before the oldest event
  const openingDateObj = new Date(oldestDate);
  openingDateObj.setDate(openingDateObj.getDate() - 1);
  const openingDateStr = openingDateObj.toISOString().split("T")[0];
  series.push({ date: openingDateStr, netWorth: totalNW() });

  // Reverse it back to chronological order for the chart
  return series.reverse();
}

// ── Custom Tooltip ──────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-4 py-3 shadow-xl border text-xs"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
        color: "var(--foreground)",
      }}
    >
      <p className="font-bold text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--muted-foreground)" }}>
        {payload[0]?.payload?.date
          ? new Date(payload[0].payload.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
          : label}
      </p>
      <p className="text-sm font-extrabold">{formatNaira(payload[0].value)}</p>
    </div>
  );
}

// ── Cycle Selector ──────────────────────────────────────────────────────────
function CycleSelector({
  activeCycleId,
  availableCycles,
  setActiveCycleId,
}: {
  activeCycleId: string;
  availableCycles: string[];
  setActiveCycleId: (c: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
        Month:
      </span>
      <div className="relative">
        <select
          value={activeCycleId}
          onChange={(e) => setActiveCycleId(e.target.value)}
          className="appearance-none pl-3 pr-8 py-1.5 rounded-xl text-sm font-bold border cursor-pointer transition-all hover:border-[#635BFF]/40 focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30"
          style={{
            backgroundColor: "var(--muted)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          {availableCycles.map((c) => (
            <option key={c} value={c}>
              {formatCycleLabel(c)}
            </option>
          ))}
        </select>
        {/* Dropdown chevron */}
        <svg
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: "var(--muted-foreground)" }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

// ── Dashboard Content ───────────────────────────────────────────────────────
function DashboardContent() {
  const { accounts, events, budgets, activeCycleId, availableCycles, setActiveCycleId } = useAppData();
  const { data: session } = useSession();

  // Net worth from reconciled accounts
  const netWorth = calculateNetWorth(accounts as any);

  // Cycle-scoped income & expenses
  const cycleEvents = useMemo(
    () =>
      events.filter((e) => {
        if (e.deleted_at) return false;
        const eCycle = String(e.budgetCycleId || "").trim().toLowerCase();
        const target = String(activeCycleId || "").trim().toLowerCase();
        return !target || eCycle === target;
      }),
    [events, activeCycleId]
  );

  const { income, expenses } = useMemo(
    () => calculateBudgetCycleSummary(cycleEvents as any),
    [cycleEvents]
  );

  // 1. Top Spending Category
  const topCategory = useMemo(() => {
    const expensesByCategory: Record<string, number> = {};
    cycleEvents.forEach(e => {
      const type = String(e.eventType || e.type || "").toUpperCase();
      if (["EXPENSERECORDED", "EXPENSE_RECORDED", "EXPENSE", "BANKCHARGERECORDED", "BANK_CHARGE"].includes(type)) {
        const cat = (e as any).payload?.category || e.category || "Uncategorized";
        const amt = Number(e.amount || (e as any).payload?.amount || 0);
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + amt;
      }
    });
    let topCat = "None";
    let maxAmt = 0;
    for (const [cat, amt] of Object.entries(expensesByCategory)) {
      if (amt > maxAmt) {
        maxAmt = amt;
        topCat = cat;
      }
    }
    return { name: topCat, amount: maxAmt };
  }, [cycleEvents]);

  // 2. Budget Utilization
  const budgetUtilization = useMemo(() => {
    const cycleBudgets = (budgets || []).filter(b => !b.deleted_at && String(b.cycleId || "").trim().toLowerCase() === String(activeCycleId || "").trim().toLowerCase());
    const totalLimit = cycleBudgets.reduce((sum, b) => sum + Number(b.planned || 0), 0);
    if (totalLimit === 0) return null; // No budget set
    return (expenses / totalLimit) * 100;
  }, [budgets, activeCycleId, expenses]);

  // 3. Savings Rate
  const savingsRate = useMemo(() => {
    if (income === 0) return null;
    return ((income - expenses) / income) * 100;
  }, [income, expenses]);

  // 4. Net Worth Change (MoM)
  const netWorthChange = useMemo(() => {
    const currentGrowth = income - expenses;
    const currentCycleLower = String(activeCycleId || "").trim().toLowerCase();
    const prevIdx = availableCycles.findIndex(c => c.toLowerCase() === currentCycleLower) + 1;
    const prevCycleId = availableCycles[prevIdx];
    
    if (!prevCycleId) return null;

    const prevCycleEvents = events.filter((e) => {
        if (e.deleted_at) return false;
        const eCycle = String(e.budgetCycleId || "").trim().toLowerCase();
        return eCycle === prevCycleId.toLowerCase();
    });
    
    const { income: prevIncome, expenses: prevExpenses } = calculateBudgetCycleSummary(prevCycleEvents as any);
    const prevGrowth = prevIncome - prevExpenses;
    
    return {
      currentGrowth,
      prevGrowth,
      delta: currentGrowth - prevGrowth,
      percentDelta: prevGrowth !== 0 ? ((currentGrowth - prevGrowth) / Math.abs(prevGrowth)) * 100 : 0
    };
  }, [income, expenses, activeCycleId, availableCycles, events]);

  // Net worth time series
  const netWorthSeries = useMemo(
    () => computeNetWorthTimeSeries(events, accounts),
    [events, accounts]
  );

  // Format chart dates for display
  const chartData = useMemo(
    () =>
      netWorthSeries.map((d) => ({
        ...d,
        label: new Date(d.date + "T00:00:00").toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        }),
      })),
    [netWorthSeries]
  );

  useEffect(() => {
    // Expose globally for browser console debugging
    (window as any)._DEBUG_CHART_DATA = chartData;
  }, [chartData]);

  // User name from session
  const userName = session?.user?.name
    ? session.user.name.split(" ")[0]
    : session?.user?.email?.split("@")[0] || "there";

  const greeting = getGreeting();
  const cycleLabel = formatCycleLabel(activeCycleId || "Jul-26");

  return (
    <div className="space-y-6">
      {/* ── Top bar: Month selector ── */}
      <div className="flex items-center justify-between">
        <CycleSelector
          activeCycleId={activeCycleId}
          availableCycles={availableCycles}
          setActiveCycleId={setActiveCycleId}
        />
      </div>

      {/* ── Greeting section ── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: "var(--foreground)" }}>
          <span className="text-2xl">{greeting.icon}</span>
          {greeting.text}, {userName}
        </h1>
        <p className="text-sm font-medium mt-1" style={{ color: "var(--muted-foreground)" }}>
          Your complete financial command center snapshot for {cycleLabel}.
        </p>
      </div>

      {/* ── Three metric cards ── */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Total Net Worth */}
        <div
          className="flex-1 p-5 rounded-2xl border shadow-sm transition-all hover:shadow-md relative overflow-hidden group"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-[#635BFF]/10 blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
          <p className="text-[11px] font-extrabold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>
            Total Net Worth
          </p>
          <p className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
            {formatNaira(netWorth)}
          </p>
          <p className="text-xs font-bold mt-2 flex items-center gap-1 text-emerald-500">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            Live Total
          </p>
        </div>

        {/* Income (cycle) */}
        <div
          className="flex-1 p-5 rounded-2xl border shadow-sm transition-all hover:shadow-md relative overflow-hidden group"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
          <p className="text-[11px] font-extrabold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>
            Income ({cycleLabel})
          </p>
          <p className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-500">
            {formatNaira(income)}
          </p>
          <p className="text-xs font-bold mt-2 flex items-center gap-1" style={{ color: "var(--muted-foreground)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Cycle inflow
          </p>
        </div>

        {/* Expenses (cycle) */}
        <div
          className="flex-1 p-5 rounded-2xl border shadow-sm transition-all hover:shadow-md relative overflow-hidden group"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-rose-500/10 blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
          <p className="text-[11px] font-extrabold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>
            Expenses ({cycleLabel})
          </p>
          <p className="text-2xl sm:text-3xl font-black tracking-tight text-rose-500">
            {formatNaira(expenses)}
          </p>
          <p className="text-xs font-bold mt-2 flex items-center gap-1" style={{ color: "var(--muted-foreground)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Cycle outflow
          </p>
        </div>
      </div>

      {/* ── Four KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Top Spending Category */}
        <div className="p-4 sm:p-5 rounded-2xl border shadow-sm transition-all hover:shadow-md" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
          <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>
            Top Spending
          </p>
          <p className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
            {topCategory.name !== "None" ? formatNaira(topCategory.amount) : "N/A"}
          </p>
          <p className="text-xs font-bold mt-2 truncate" style={{ color: "var(--muted-foreground)" }}>
            {topCategory.name !== "None" ? topCategory.name : "No expenses"}
          </p>
        </div>

        {/* Budget Utilization */}
        <div className="p-4 sm:p-5 rounded-2xl border shadow-sm transition-all hover:shadow-md" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
          <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>
            Budget Used
          </p>
          <p className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
            {budgetUtilization === null ? "N/A" : `${budgetUtilization.toFixed(1)}%`}
          </p>
          <p className="text-xs font-bold mt-2 truncate" style={{ color: "var(--muted-foreground)" }}>
            {budgetUtilization === null ? "No budget set" : "Of active cycle limits"}
          </p>
        </div>

        {/* Savings Rate */}
        <div className="p-4 sm:p-5 rounded-2xl border shadow-sm transition-all hover:shadow-md" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
          <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>
            Savings Rate
          </p>
          <p className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
            {savingsRate === null ? "N/A" : `${savingsRate.toFixed(1)}%`}
          </p>
          <p className="text-xs font-bold mt-2 truncate" style={{ color: "var(--muted-foreground)" }}>
            {savingsRate === null ? "No income this cycle" : "Income kept as savings"}
          </p>
        </div>

        {/* Net Worth Change */}
        <div className="p-4 sm:p-5 rounded-2xl border shadow-sm transition-all hover:shadow-md" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
          <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>
            Net Growth (MoM)
          </p>
          {netWorthChange === null ? (
            <>
              <p className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
                N/A
              </p>
              <p className="text-xs font-bold mt-2 truncate" style={{ color: "var(--muted-foreground)" }}>
                No previous cycle
              </p>
            </>
          ) : (
            <>
              <p className={`text-xl sm:text-2xl font-black tracking-tight ${netWorthChange.currentGrowth >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {netWorthChange.currentGrowth >= 0 ? "+" : ""}{formatNaira(netWorthChange.currentGrowth)}
              </p>
              <p className="text-xs font-bold mt-2 flex items-center gap-1" style={{ color: "var(--muted-foreground)" }}>
                {netWorthChange.percentDelta === 0 ? null : (
                  <svg
                    className={`w-3 h-3 ${netWorthChange.percentDelta > 0 ? "text-emerald-500" : "text-rose-500"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ transform: netWorthChange.percentDelta > 0 ? "rotate(0deg)" : "rotate(180deg)" }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                )}
                {netWorthChange.percentDelta > 0 ? "+" : ""}{netWorthChange.percentDelta.toFixed(1)}% vs prev
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Net Worth Growth Chart ── */}
      <div
        className="p-5 sm:p-6 rounded-2xl border shadow-sm"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-extrabold uppercase tracking-wider mb-5" style={{ color: "var(--muted-foreground)" }}>
          Net Worth Growth Over Time
        </h2>

        {chartData.length > 0 ? (
          <div className="w-full" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tickFormatter={(v: number) => abbreviateNaira(v)}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  stroke="#7C3AED"
                  strokeWidth={2.5}
                  fill="url(#nwGradient)"
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "#7C3AED",
                    stroke: "var(--card)",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-16 text-sm font-medium"
            style={{ color: "var(--muted-foreground)" }}
          >
            <span className="text-3xl mb-3">📊</span>
            <p>No activity data yet. Record your first transaction to see your net worth trend.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Export ───────────────────────────────────────────────────────────────────
export function DashboardView() {
  return (
    <DashboardErrorBoundary>
      <DashboardContent />
    </DashboardErrorBoundary>
  );
}
