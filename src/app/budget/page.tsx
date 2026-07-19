"use client";

import React, { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useAppData } from "@/lib/appContext";
import { formatCycleLabel } from "@/lib/formatCycle";

const CATEGORY_COLORS = ["#635BFF", "#0ea5e9", "#f59e0b", "#10b981", "#6366f1", "#ec4899", "#14b8a6"];

function fmt(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(kobo / 100);
}

function ProgressBar({ spent, planned, color }: { spent: number; planned: number; color: string }) {
  const pct = planned > 0 ? Math.min((spent / planned) * 100, 100) : 0;
  const isOver = spent > planned;
  return (
    <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: "var(--muted)" }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: isOver ? "#f43f5e" : color }}
      />
    </div>
  );
}

export default function BudgetPage() {
  const { budgets, addBudget, deleteBudget, activeCycleId } = useAppData();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [plannedNaira, setPlannedNaira] = useState<number | string>("");
  const [newCategoryType, setNewCategoryType] = useState<"Expense" | "Saving">("Expense");
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Helper to determine if a budget item is a Savings/Investment Goal vs Operating Expense
  const isGoalItem = (b: any) => {
    const t = String(b.type || "").trim().toLowerCase();
    const n = String(b.name || b.category || "").trim().toLowerCase();
    return t === "saving" || t === "savings" || t === "investment" || t === "transfer" ||
      ["emergency fund", "clothing fund", "new place fund (cp compass)", "investment"].includes(n);
  };

  const operatingBudgets = budgets.filter((b) => !isGoalItem(b));
  const savingsBudgets = budgets.filter((b) => isGoalItem(b));

  // Operating Budget Totals (EXCLUDES Savings & Investment Goals)
  const operatingPlanned = operatingBudgets.reduce((s, c) => s + (Number(c.planned) || 0), 0);
  const operatingSpent = operatingBudgets.reduce((s, c) => s + (Number(c.spent) || 0), 0);
  const operatingRemaining = operatingPlanned - operatingSpent;
  const operatingPct = operatingPlanned > 0 ? Math.round((operatingSpent / operatingPlanned) * 100) : 0;

  // Savings & Goal Totals
  const savingsPlanned = savingsBudgets.reduce((s, c) => s + (Number(c.planned) || 0), 0);
  const savingsAllocated = savingsBudgets.reduce((s, c) => s + (Number(c.spent) || 0), 0);
  const savingsPct = savingsPlanned > 0 ? Math.round((savingsAllocated / savingsPlanned) * 100) : 0;

  // Filter categories with actual spending for analytical ranking (Operating expenses only)
  const activeSpending = operatingBudgets
    .filter((b) => (Number(b.spent) || 0) > 0)
    .sort((a, b) => Number(b.spent) - Number(a.spent));

  const overBudgetCats = operatingBudgets.filter((b) => (Number(b.spent) || 0) > (Number(b.planned) || 0) && Number(b.planned) > 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !plannedNaira || Number(plannedNaira) <= 0) return;

    setIsSaving(true);
    await addBudget({
      name: name.trim(),
      planned: Math.round(Number(plannedNaira) * 100), // Convert NGN to Kobo
      spent: 0,
      color: selectedColor,
      category: name.trim(),
      type: newCategoryType,
      cycleId: activeCycleId || "Jul-26",
    });
    setIsSaving(false);
    setShowForm(false);
    setName("");
    setPlannedNaira("");
    setNewCategoryType("Expense");
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: "var(--muted)",
    border: "1px solid var(--border)",
    color: "var(--foreground)",
    borderRadius: "0.75rem",
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    outline: "none",
    width: "100%",
  };

  return (
    <div className="max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Summary Rows & Category Cards (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
                Budget & Goals ({formatCycleLabel(activeCycleId || "Jul-26")})
              </h1>
              <p className="text-sm font-medium mt-1" style={{ color: "var(--muted-foreground)" }}>
                {formatCycleLabel(activeCycleId || "Jul-26")} — Monthly spending targets & savings goals.
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2.5 bg-[#635BFF] hover:bg-[#5851e5] text-white rounded-xl text-sm font-semibold transition-all shadow-[0_4px_12px_rgba(99,91,255,0.3)] active:scale-95"
            >
              {showForm ? "✕ Cancel" : "+ Add Category"}
            </button>
          </div>

          {/* Add Category Form */}
          {showForm && (
            <form
              onSubmit={handleCreate}
              className="p-6 rounded-2xl border space-y-4 animate-in fade-in duration-200 shadow-sm"
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
            >
              <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>
                New Budget / Goal Category
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                    Category Name
                  </label>
                  <input
                    placeholder="e.g. Groceries or Emergency Fund"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                    Planned Amount (₦)
                  </label>
                  <input
                    type="number"
                    placeholder="50,000"
                    value={plannedNaira}
                    onChange={(e) => setPlannedNaira(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                    Category Type
                  </label>
                  <select
                    value={newCategoryType}
                    onChange={(e) => setNewCategoryType(e.target.value as "Expense" | "Saving")}
                    style={{ ...inputStyle, padding: "0.5rem 0.75rem" }}
                  >
                    <option value="Expense">💸 Spending Category</option>
                    <option value="Saving">🌱 Savings Goal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--muted-foreground)" }}>
                  Color Theme
                </label>
                <div className="flex gap-2">
                  {CATEGORY_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setSelectedColor(col)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        selectedColor === col ? "scale-110 border-white shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-semibold transition-colors"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#635BFF] hover:bg-[#5851e5] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
                >
                  {isSaving ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          )}

          {/* Operating Summary Row */}
          <div className="grid grid-cols-3 gap-3.5 sm:gap-4">
            {[
              { label: "Monthly Spending Target", value: operatingPlanned, color: "var(--foreground)" },
              { label: "Total Spent", value: operatingSpent, color: "var(--foreground)" },
              { label: "Remaining to Spend", value: operatingRemaining, color: operatingRemaining >= 0 ? "#10b981" : "#f43f5e" },
            ].map((item) => (
              <div
                key={item.label}
                className="p-4 sm:p-5 rounded-2xl border transition-all hover:shadow-sm"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
              >
                <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5 truncate" style={{ color: "var(--muted-foreground)" }}>
                  {item.label}
                </p>
                <p className="text-base sm:text-xl font-extrabold tracking-tight truncate" style={{ color: item.color }}>
                  {fmt(item.value)}
                </p>
              </div>
            ))}
          </div>

          {/* Operating Progress */}
          <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                Monthly Spending Progress
              </span>
              <span className="text-sm font-extrabold" style={{ color: "var(--foreground)" }}>
                {operatingPct}% used
              </span>
            </div>
            <ProgressBar spent={operatingSpent} planned={operatingPlanned} color="#635BFF" />
          </div>

          {/* Section 1: Operating Expense Budgets */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pt-2">
              <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                <span>💸</span>
                <span>Monthly Spending Categories</span>
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#635BFF]/10 text-[#635BFF]">
                {operatingBudgets.length} Categories
              </span>
            </div>

            {operatingBudgets.length === 0 ? (
              <div className="p-8 rounded-2xl border text-center" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>No spending categories created yet.</p>
              </div>
            ) : (
              operatingBudgets.map((c) => {
                const spent = Number(c.spent) || 0;
                const planned = Number(c.planned) || 0;
                const pct = planned > 0 ? Math.round((spent / planned) * 100) : 0;
                const isOver = spent > planned;
                const isDeleting = deletingId === c.id;

                return (
                  <div
                    key={c.id}
                    className="p-5 rounded-2xl border transition-all hover:shadow-md hover:border-[#635BFF]/30"
                    style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color || "#635BFF" }} />
                        <span className="font-bold text-base truncate" style={{ color: "var(--foreground)" }}>
                          {c.name}
                        </span>
                        {isOver && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 flex-shrink-0">
                            Over Budget
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                            {fmt(spent)}
                          </span>
                          <span className="text-xs font-medium ml-1" style={{ color: "var(--muted-foreground)" }}>
                            / {fmt(planned)}
                          </span>
                        </div>
                        <button
                          disabled={isDeleting}
                          onClick={async () => {
                            setDeletingId(c.id);
                            await deleteBudget(c.id);
                            setDeletingId(null);
                          }}
                          className="text-xs font-bold px-2.5 py-1 rounded-lg border hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                          style={{ color: "#f43f5e", borderColor: "rgba(244,63,94,0.3)" }}
                        >
                          {isDeleting ? "..." : "Delete"}
                        </button>
                      </div>
                    </div>

                    <ProgressBar spent={spent} planned={planned} color={c.color || "#635BFF"} />

                    <div className="flex justify-between items-center mt-2 text-xs">
                      <span className="font-medium" style={{ color: "var(--muted-foreground)" }}>
                        {pct}% of budget used
                      </span>
                      <span className="font-semibold" style={{ color: isOver ? "#f43f5e" : "var(--muted-foreground)" }}>
                        {isOver ? `+${fmt(spent - planned)} over` : `${fmt(planned - spent)} left`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Section 2: Savings & Investment Allocation Goals */}
          <div className="space-y-3.5 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                  <span>🌱</span>
                  <span>Savings & Asset Building Goals</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Money set aside for these goals builds your savings without counting as regular monthly expenses.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {savingsBudgets.length} Goal Targets
              </span>
            </div>

            {savingsBudgets.length === 0 ? (
              <div className="p-8 rounded-2xl border text-center" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>No savings or investment goals defined yet.</p>
              </div>
            ) : (
              savingsBudgets.map((c) => {
                const allocated = Number(c.spent) || 0;
                const target = Number(c.planned) || 0;
                const pct = target > 0 ? Math.round((allocated / target) * 100) : 0;
                const isMet = allocated >= target && target > 0;
                const isDeleting = deletingId === c.id;

                return (
                  <div
                    key={c.id}
                    className="p-5 rounded-2xl border transition-all hover:shadow-md hover:border-emerald-500/30"
                    style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-3 h-3 rounded-full flex-shrink-0 bg-emerald-500" style={{ backgroundColor: c.color || "#10b981" }} />
                        <span className="font-bold text-base truncate" style={{ color: "var(--foreground)" }}>
                          {c.name}
                        </span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                          {isMet ? "Goal Met 🎉" : "Savings Goal"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                            {fmt(allocated)}
                          </span>
                          <span className="text-xs font-medium ml-1" style={{ color: "var(--muted-foreground)" }}>
                            / {fmt(target)} target
                          </span>
                        </div>
                        <button
                          disabled={isDeleting}
                          onClick={async () => {
                            setDeletingId(c.id);
                            await deleteBudget(c.id);
                            setDeletingId(null);
                          }}
                          className="text-xs font-bold px-2.5 py-1 rounded-lg border hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                          style={{ color: "#f43f5e", borderColor: "rgba(244,63,94,0.3)" }}
                        >
                          {isDeleting ? "..." : "Delete"}
                        </button>
                      </div>
                    </div>

                    <ProgressBar spent={allocated} planned={target} color={c.color || "#10b981"} />

                    <div className="flex justify-between items-center mt-2 text-xs">
                      <span className="font-medium" style={{ color: "var(--muted-foreground)" }}>
                        {pct}% of target reached
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {target - allocated > 0 ? `${fmt(target - allocated)} remaining to reach` : `Goal fully reached (${fmt(allocated)})`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Spending Analytics & Velocity Insights (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
          
          {/* Burn Rate & Velocity Card (Operating Only) */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1E1E2E] to-[#2D2D44] text-white border border-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.3)] relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-[#635BFF]/20 blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-white/70">Monthly Spending Rate</span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#635BFF]/30 text-[#A5A1FF] border border-[#635BFF]/30">
                {formatCycleLabel(activeCycleId || "Jul-26")}
              </span>
            </div>
            <p className="text-3xl font-extrabold tracking-tight mb-1">{operatingPct}% <span className="text-sm font-normal text-white/60">Used</span></p>
            <p className="text-xs text-white/70 mb-5">You have spent {fmt(operatingSpent)} out of your {fmt(operatingPlanned)} monthly budget.</p>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#635BFF]/20 flex items-center justify-center text-lg flex-shrink-0">
                🎯
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white">On Track with Budget</p>
                <p className="text-[11px] text-white/60 truncate">Remaining buffer: {fmt(operatingRemaining)} left to spend.</p>
              </div>
            </div>
          </div>

          {/* Wealth Allocation Summary Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-500/20 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Savings & Asset Progress</span>
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                {savingsPct}% Reached
              </span>
            </div>

            <div>
              <p className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--foreground)" }}>{fmt(savingsAllocated)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total saved toward your {fmt(savingsPlanned)} savings goals.</p>
            </div>

            <div className="w-full h-2 rounded-full overflow-hidden bg-emerald-500/10">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${savingsPct}%` }} />
            </div>
          </div>

          {/* Spending Share by Category (Operating Only) */}
          <div className="p-6 rounded-3xl border shadow-sm space-y-5" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Spending Breakdown by Category</h3>
                <p className="text-xs font-medium mt-0.5" style={{ color: "var(--muted-foreground)" }}>Where your money went this month</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#635BFF]/10 text-[#635BFF]">
                {activeSpending.length} Active
              </span>
            </div>

            {activeSpending.length === 0 ? (
              <div className="py-8 text-center text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                No active category spending recorded yet.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Donut Chart Container */}
                <div className="h-56 w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={activeSpending.slice(0, 6).map((c, idx) => {
                          const s = Number(c.spent) || 0;
                          return {
                            name: c.name,
                            value: s,
                            color: c.color || ["#635BFF", "#0ea5e9", "#f59e0b", "#10b981", "#6366f1", "#ec4899"][idx % 6],
                            share: operatingSpent > 0 ? Math.round((s / operatingSpent) * 100) : 0
                          };
                        })}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        stroke="transparent"
                      >
                        {activeSpending.slice(0, 6).map((c, idx) => {
                          const col = c.color || ["#635BFF", "#0ea5e9", "#f59e0b", "#10b981", "#6366f1", "#ec4899"][idx % 6];
                          return <Cell key={c.id || c.name} fill={col} />;
                        })}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="p-3 rounded-xl border shadow-xl backdrop-blur-md text-xs space-y-1"
                                style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                                <div className="flex items-center gap-2 font-bold" style={{ color: "var(--foreground)" }}>
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                                  {data.name}
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span style={{ color: "var(--muted-foreground)" }}>Spent:</span>
                                  <span className="font-extrabold" style={{ color: "var(--foreground)" }}>{fmt(data.value)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span style={{ color: "var(--muted-foreground)" }}>Share:</span>
                                  <span className="font-bold text-[#635BFF]">{data.share}%</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center Stats Overlay inside Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Spent</span>
                    <span className="text-sm font-extrabold tracking-tight" style={{ color: "var(--foreground)" }}>
                      {fmt(operatingSpent).replace(/\.\d\d$/, "")}
                    </span>
                  </div>
                </div>

                {/* Legend & Breakdown Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                  {activeSpending.slice(0, 6).map((c, idx) => {
                    const s = Number(c.spent) || 0;
                    const share = operatingSpent > 0 ? Math.round((s / operatingSpent) * 100) : 0;
                    const col = c.color || ["#635BFF", "#0ea5e9", "#f59e0b", "#10b981", "#6366f1", "#ec4899"][idx % 6];

                    return (
                      <div
                        key={c.id || c.name}
                        className="p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-colors hover:bg-muted/50"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: col }} />
                          <span className="font-semibold text-xs truncate" style={{ color: "var(--foreground)" }} title={c.name}>
                            {c.name}
                          </span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="font-bold text-xs block" style={{ color: "var(--foreground)" }}>{fmt(s)}</span>
                          <span className="text-[10px] font-medium" style={{ color: "var(--muted-foreground)" }}>{share}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Watchlist Alerts */}
          <div className="p-6 rounded-3xl border shadow-sm space-y-3" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-base">
                ⚠️
              </div>
              <h3 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Operating Watchlist</h3>
            </div>
            {overBudgetCats.length === 0 ? (
              <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                All operating categories are within planned limits. Great discipline!
              </p>
            ) : (
              <div className="space-y-2 pt-1">
                <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  You have <strong style={{ color: "#f43f5e" }}>{overBudgetCats.length} expense categories</strong> (`{overBudgetCats.map(c => c.name).join(", ")}`) operating over budget.
                </p>
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-medium leading-relaxed">
                  💡 Note: Because your savings and wealth goals (`Emergency Fund`, `Clothing Fund`, `New Place Fund`) are isolated in Section 2 above, they do not inflate this operating watchlist!
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
