"use client";

import React, { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { EventComposer } from "./EventComposer";
import { EventEditModal } from "./EventEditModal";
import { useAppData } from "@/lib/appContext";
import { formatCycleLabel } from "@/lib/formatCycle";
import { calculateNetWorth } from "@/domain/financeEngine/engine";
import Link from "next/link";

const EVENT_META: Record<string, { label: string; color: string; dot: string; icon: string }> = {
  INCOME_RECEIVED:      { label: "Income",     color: "#10b981", dot: "#10b981", icon: "💰" },
  EXPENSE_RECORDED:     { label: "Expense",    color: "var(--foreground)", dot: "#f43f5e", icon: "💸" },
  SAVINGS_CONTRIBUTION: { label: "Savings",    color: "#635BFF", dot: "#635BFF", icon: "🎯" },
  TRANSFER_COMPLETED:   { label: "Transfer",   color: "#f59e0b", dot: "#f59e0b", icon: "↔️" },
  RECEIVABLE_RECORDED:  { label: "Receivable", color: "#8b5cf6", dot: "#8b5cf6", icon: "⏳" },
};

const FILTER_TABS = [
  { key: "ALL",        label: "All Activity",  typeStr: null },
  { key: "EXPENSE",    label: "Expenses",      typeStr: "EXPENSE_RECORDED" },
  { key: "INCOME",     label: "Income",        typeStr: "INCOME_RECEIVED" },
  { key: "TRANSFER",   label: "Transfers",     typeStr: "TRANSFER_COMPLETED" },
  { key: "SAVINGS",    label: "Savings",       typeStr: "SAVINGS_CONTRIBUTION" },
  { key: "RECEIVABLE", label: "Receivables",   typeStr: "RECEIVABLE_RECORDED" },
];

function formatCurrency(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(kobo / 100);
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function TimelineView() {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const { events, accounts, budgets, isSyncing, refreshData, isConnected, activeCycleId, deleteEvent } = useAppData();

  // Filter events based on selected tab, search query, and active budget cycle
  const cycleEvents = events.filter((e) => {
    const evCycle = (e.budgetCycleId || "Jul-26").toLowerCase();
    const currCycle = (activeCycleId || "Jul-26").toLowerCase();
    return evCycle === currCycle;
  });

  const filteredEvents = cycleEvents.filter((e) => {
    const tabMeta = FILTER_TABS.find((t) => t.key === activeFilter);
    if (tabMeta && tabMeta.typeStr) {
      const eType = (e.type || e.eventType || "EXPENSE_RECORDED").toUpperCase();
      if (!eType.includes(tabMeta.typeStr) && !tabMeta.typeStr.includes(eType)) {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const cat = (e.category || "").toLowerCase();
      const desc = (e.description || "").toLowerCase();
      const acc = (e.accountName || "").toLowerCase();
      if (!cat.includes(q) && !desc.includes(q) && !acc.includes(q)) {
        return false;
      }
    }

    return true;
  });

  // Calculate analytical insights for right sidebar & metrics
  let cycleInflow = 0;
  let cycleOutflow = 0;
  const categorySpendMap = new Map<string, number>();

  cycleEvents.forEach((e) => {
    const rawType = (e.type || e.eventType || "EXPENSE_RECORDED").toUpperCase();
    const amt = Number(e.amount || 0);

    if (rawType.includes("INCOME") || rawType.includes("SALARY")) {
      cycleInflow += amt;
    } else if (rawType.includes("EXPENSE") || rawType.includes("BANK_CHARGE") || rawType.includes("BANKCHARGE")) {
      cycleOutflow += amt;
      const cat = (e.category || "General").trim();
      categorySpendMap.set(cat, (categorySpendMap.get(cat) || 0) + amt);
    }
  });

  const topCategories = Array.from(categorySpendMap.entries()).sort((a, b) => b[1] - a[1]);
  const netDelta = cycleInflow - cycleOutflow;

  return (
    <div className="space-y-8 pb-12">
      {/* ── Top Summary Strip (`Clean, Minimalist 3-Metric Cards instead of bulky double tables`) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* Cycle Inflow Tile */}
        <div
          className="p-5 rounded-3xl border shadow-sm flex items-center justify-between transition-all hover:shadow-md"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Income ({formatCycleLabel(activeCycleId || "Jul-26")})</span>
            </p>
            <p className="text-xl sm:text-2xl font-black text-emerald-500 mt-1 tracking-tight">
              + {formatCurrency(cycleInflow)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 text-xl font-bold">
            📈
          </div>
        </div>

        {/* Cycle Outflow Tile */}
        <div
          className="p-5 rounded-3xl border shadow-sm flex items-center justify-between transition-all hover:shadow-md"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Expenses ({formatCycleLabel(activeCycleId || "Jul-26")})</span>
            </p>
            <p className="text-xl sm:text-2xl font-black text-rose-500 mt-1 tracking-tight">
              - {formatCurrency(cycleOutflow)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 text-xl font-bold">
            📉
          </div>
        </div>

        {/* Net Cycle Delta Tile */}
        <div
          className="p-5 rounded-3xl border shadow-sm flex items-center justify-between transition-all hover:shadow-md relative overflow-hidden"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#635BFF]/10 to-transparent pointer-events-none" />
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#635BFF]" />
              <span>Net Saved ({formatCycleLabel(activeCycleId || "Jul-26")})</span>
            </p>
            <p className={`text-xl sm:text-2xl font-black mt-1 tracking-tight ${netDelta >= 0 ? "text-[#635BFF]" : "text-amber-500"}`}>
              {netDelta >= 0 ? "+" : ""} {formatCurrency(netDelta)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#635BFF]/10 border border-[#635BFF]/20 flex items-center justify-center text-[#635BFF] text-xl font-bold">
            ⚡
          </div>
        </div>
      </div>

      {/* ── Main Activity Layout (`8/4 Grid`) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Ledger & Filters (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Action & Filter Bar */}
          <div
            className="p-4 sm:p-5 rounded-3xl border shadow-sm space-y-4 transition-all"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            {/* Top Row: Title + Record Button + Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#635BFF]/15 flex items-center justify-center text-[#635BFF] font-bold text-base">
                  💳
                </div>
                <div>
                  <h2 className="text-base font-extrabold tracking-tight" style={{ color: "var(--foreground)" }}>
                    Activity & Transactions
                  </h2>
                  <p className="text-xs font-medium text-muted-foreground">
                    Showing {filteredEvents.length} of {cycleEvents.length} items
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {isConnected && (
                  <button
                    onClick={() => refreshData()}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all disabled:opacity-50 hover:bg-muted"
                    style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                    title="Refresh data records"
                  >
                    <span className={`w-2 h-2 rounded-full ${isSyncing ? "bg-amber-400 animate-spin" : "bg-emerald-500"}`} />
                    <span>{isSyncing ? "Updating..." : "Refresh"}</span>
                  </button>
                )}
                <button
                  onClick={() => setIsComposerOpen(true)}
                  className="px-4 py-2 bg-[#635BFF] hover:bg-[#524ac7] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <span>+</span>
                  <span>Add Transaction</span>
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Search transactions by description, category, or account..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-medium transition-all outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 shadow-inner"
                style={{ backgroundColor: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold px-2 py-1 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Segmented Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
              {FILTER_TABS.map((tab) => {
                const isActive = activeFilter === tab.key;
                const count = cycleEvents.filter((e) => {
                  if (!tab.typeStr) return true;
                  const t = (e.type || e.eventType || "").toUpperCase();
                  return t.includes(tab.typeStr) || tab.typeStr.includes(t);
                }).length;

                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "bg-[#635BFF] text-white shadow-md shadow-[#635BFF]/25 scale-[1.02]"
                        : "hover:bg-muted/60 border border-transparent hover:border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        isActive ? "bg-white/20 text-white" : "bg-black/5 dark:bg-white/10 text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Event Composer & Edit Modals */}
          {isComposerOpen && <EventComposer onClose={() => setIsComposerOpen(false)} />}
          {editingEvent && <EventEditModal event={editingEvent} onClose={() => setEditingEvent(null)} />}

          {/* Transaction Ledger Feed (`Sleek Horizontal Cards`) */}
          {filteredEvents.length === 0 ? (
            <div
              className="p-12 sm:p-16 rounded-3xl border text-center space-y-3 shadow-sm"
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
            >
              <p className="text-4xl">📭</p>
              <p className="text-base font-bold" style={{ color: "var(--foreground)" }}>
                No transactions found
              </p>
              <p className="text-xs max-w-md mx-auto" style={{ color: "var(--muted-foreground)" }}>
                {searchQuery
                  ? `No entries match "${searchQuery}". Try clearing your search query.`
                  : "No activity recorded for this budget cycle yet. Click '+ Record Event' above to get started."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => {
                const rawType = (event.type || event.eventType || "EXPENSE_RECORDED").toUpperCase();
                const meta = EVENT_META[rawType] || EVENT_META.EXPENSE_RECORDED;
                const isIncome = rawType.includes("INCOME") || rawType.includes("SALARY");
                const prefix = isIncome
                  ? "+"
                  : rawType.includes("EXPENSE") || rawType.includes("BANKCHARGE") || rawType === "BANK_CHARGE"
                  ? "-"
                  : "";

                const fromAcc = event.payload?.fromAccountId || event.payload?.fromAccount || event.accountName || "Bank";
                const toAcc = event.payload?.toAccountId || event.payload?.toGoalId || event.payload?.toAccount || "Destination";
                const debtor = event.payload?.debtorName || event.payload?.clientName || event.description?.replace("Owed by ", "") || null;
                const dueDate = event.payload?.dueDate || null;

                return (
                  <div
                    key={event.eventId || event.id}
                    className="p-4 sm:p-4.5 rounded-2xl border transition-all hover:border-[#635BFF]/40 hover:shadow-md flex items-center justify-between gap-4 group"
                    style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                  >
                    {/* Left: Icon Badge & Details */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Icon Circle */}
                      <div
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-lg sm:text-xl flex-shrink-0 shadow-sm transition-transform group-hover:scale-105 border"
                        style={{
                          backgroundColor: `${meta.dot}15`,
                          borderColor: `${meta.dot}30`,
                        }}
                      >
                        <span>{meta.icon}</span>
                      </div>

                      {/* Text & Badges */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm sm:text-base truncate" style={{ color: "var(--foreground)" }}>
                            {event.category || meta.label}
                          </span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase font-mono"
                            style={{
                              backgroundColor: `${meta.dot}12`,
                              color: meta.dot === "#94a3b8" ? "var(--muted-foreground)" : meta.dot,
                            }}
                          >
                            {meta.label}
                          </span>
                        </div>

                        {/* Polymorphic Details Row */}
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {rawType.includes("TRANSFER") || rawType.includes("SAVINGS") ? (
                            <span className="font-semibold flex items-center gap-1.5" style={{ color: "var(--muted-foreground)" }}>
                              <span>🏦 {fromAcc}</span>
                              <span className="text-amber-500 font-bold">→</span>
                              <span>🎯 {toAcc}</span>
                            </span>
                          ) : rawType.includes("RECEIVABLE") && debtor ? (
                            <span className="font-semibold text-[#8b5cf6] flex items-center gap-1.5">
                              <span>👤 Owed by: <strong>{debtor}</strong></span>
                              {dueDate && <span>• Due: {formatDate(dueDate)}</span>}
                            </span>
                          ) : (
                            <span className="font-medium" style={{ color: "var(--muted-foreground)" }}>
                              🏦 {event.accountName || "Cash Wallet"}
                            </span>
                          )}

                          {event.description && (
                            <span className="italic truncate max-w-xs sm:max-w-md text-muted-foreground/80">
                              • "{event.description}"
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount, Date & Actions */}
                    <div className="text-right flex-shrink-0 flex flex-col items-end justify-between">
                      <p
                        className="font-black text-base sm:text-lg tracking-tight leading-none"
                        style={{ color: meta.color }}
                      >
                        {prefix} {formatCurrency(event.amount)}
                      </p>
                      <time className="text-[11px] font-semibold text-muted-foreground mt-1 block">
                        {formatDate(event.timestamp)}
                      </time>

                      {/* Quick Hover Actions */}
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                        <button
                          type="button"
                          onClick={() => setEditingEvent(event)}
                          title="Edit transaction"
                          className="px-2 py-1 rounded-lg bg-muted hover:bg-[#635BFF]/15 text-[11px] font-bold text-[#635BFF] transition-colors flex items-center gap-1 border border-border"
                        >
                          <span>✏️ Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Delete transaction "${event.category || event.description || "item"}" (${formatCurrency(event.amount)})?`)) {
                              await deleteEvent(event.id || event.eventId || "");
                            }
                          }}
                          title="Delete transaction"
                          className="px-2 py-1 rounded-lg bg-muted hover:bg-red-500/15 text-[11px] font-bold text-red-500 transition-colors flex items-center gap-1 border border-border"
                        >
                          <span>🗑️</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Clean, Compact Analytical Breakdown (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
          {/* Top Spending Categories Card (`Streamlined Doughnut Chart`) */}
          <div
            className="p-5 sm:p-6 rounded-3xl border shadow-sm space-y-5"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider" style={{ color: "var(--foreground)" }}>
                    Top Spending Categories
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#635BFF]/10 text-[#635BFF]">
                    {topCategories.length} Categories
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Where your money went this month</p>
              </div>
            </div>

            {topCategories.length === 0 ? (
              <div className="py-8 text-center text-xs font-medium text-muted-foreground border border-dashed rounded-2xl">
                No expenses recorded for this month yet.
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                <div className="h-56 w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topCategories.slice(0, 6).map(([cat, amt], idx) => {
                          const colors = ["#635BFF", "#0EA5E9", "#F59E0B", "#F43F5E", "#10B981", "#8B5CF6"];
                          const share = cycleOutflow > 0 ? Math.round((amt / cycleOutflow) * 100) : 0;
                          return {
                            name: cat,
                            value: amt,
                            color: colors[idx % colors.length],
                            share,
                          };
                        })}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={82}
                        paddingAngle={3.5}
                        stroke="transparent"
                      >
                        {topCategories.slice(0, 6).map(([cat, amt], idx) => {
                          const colors = ["#635BFF", "#0EA5E9", "#F59E0B", "#F43F5E", "#10B981", "#8B5CF6"];
                          return <Cell key={cat} fill={colors[idx % colors.length]} />;
                        })}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div
                                className="p-3 rounded-2xl border shadow-2xl backdrop-blur-md text-xs space-y-1.5 z-50 min-w-[150px]"
                                style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                              >
                                <div className="flex items-center gap-2 font-extrabold" style={{ color: "var(--foreground)" }}>
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                                  {data.name}
                                </div>
                                <div className="flex items-center justify-between gap-4 font-bold">
                                  <span className="text-muted-foreground">Amount:</span>
                                  <span style={{ color: "var(--foreground)" }}>{formatCurrency(data.value)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 font-bold">
                                  <span className="text-muted-foreground">Share:</span>
                                  <span className="font-extrabold text-[#635BFF]">{data.share}%</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Doughnut Center Summary Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                      Total Spent
                    </span>
                    <span className="text-xs sm:text-sm font-black tracking-tight" style={{ color: "var(--foreground)" }}>
                      {formatCurrency(cycleOutflow)}
                    </span>
                  </div>
                </div>

                {/* Color-Coded Analytical Legend / Breakdown */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                  {topCategories.slice(0, 6).map(([cat, amt], idx) => {
                    const colors = ["#635BFF", "#0EA5E9", "#F59E0B", "#F43F5E", "#10B981", "#8B5CF6"];
                    const color = colors[idx % colors.length];
                    const share = cycleOutflow > 0 ? Math.min(100, Math.round((amt / cycleOutflow) * 100)) : 0;
                    return (
                      <div key={cat} className="flex items-center justify-between p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="truncate font-bold" style={{ color: "var(--foreground)" }}>
                            {cat}
                          </span>
                        </div>
                        <span className="font-extrabold flex-shrink-0 text-right ml-1" style={{ color: "var(--foreground)" }}>
                          {share}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Shortcuts & Navigation Card */}
          <div
            className="p-5 sm:p-6 rounded-3xl border shadow-sm space-y-4"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#635BFF]/15 flex items-center justify-center text-[#635BFF] text-base font-bold">
                ⚡
              </div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider" style={{ color: "var(--foreground)" }}>
                Quick Shortcuts
              </h3>
            </div>

            <div className="space-y-2 text-xs font-semibold">
              <Link
                href="/dashboard"
                className="w-full p-3 rounded-2xl border transition-all hover:border-[#635BFF]/40 flex items-center justify-between group bg-muted/40 hover:bg-muted"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📊</span>
                  <span>View Financial Overview</span>
                </div>
                <span className="text-[#635BFF] transition-transform group-hover:translate-x-1">→</span>
              </Link>

              <Link
                href="/accounts"
                className="w-full p-3 rounded-2xl border transition-all hover:border-[#635BFF]/40 flex items-center justify-between group bg-muted/40 hover:bg-muted"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🏦</span>
                  <span>Manage Connected Accounts ({accounts.length})</span>
                </div>
                <span className="text-[#635BFF] transition-transform group-hover:translate-x-1">→</span>
              </Link>

              <Link
                href="/budget"
                className="w-full p-3 rounded-2xl border transition-all hover:border-[#635BFF]/40 flex items-center justify-between group bg-muted/40 hover:bg-muted"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🎯</span>
                  <span>Adjust Monthly Spending Targets ({budgets.length})</span>
                </div>
                <span className="text-[#635BFF] transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
