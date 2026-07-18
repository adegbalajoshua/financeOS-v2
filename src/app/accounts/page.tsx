"use client";

import React, { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useAppData } from "@/lib/appContext";
import { calculateNetWorth } from "@/domain/financeEngine/engine";

type AccountType = "CASH" | "SAVINGS" | "INVESTMENT" | "CREDIT" | "LOAN" | "BANK" | "MOBILE" | string;

const TYPE_META: Record<string, { label: string; color: string; bgLight: string; icon: string }> = {
  CASH:       { label: "Cash",       color: "#f59e0b", bgLight: "rgba(245,158,11,0.1)",  icon: "💵" },
  SAVINGS:    { label: "Savings",    color: "#0ea5e9", bgLight: "rgba(14,165,233,0.1)",   icon: "🏦" },
  INVESTMENT: { label: "Investment", color: "#635BFF", bgLight: "rgba(99,91,255,0.1)",    icon: "📈" },
  CREDIT:     { label: "Credit",     color: "#f43f5e", bgLight: "rgba(244,63,94,0.1)",    icon: "💳" },
  LOAN:       { label: "Loan",       color: "#f97316", bgLight: "rgba(249,115,22,0.1)",   icon: "🏠" },
  BANK:       { label: "Bank Account", color: "#0ea5e9", bgLight: "rgba(14,165,233,0.1)", icon: "🏦" },
  MOBILE:     { label: "Mobile Money", color: "#10b981", bgLight: "rgba(16,185,129,0.1)", icon: "📱" },
};

function fmt(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(kobo / 100);
}

export default function AccountsPage() {
  const { accounts, addAccount, updateAccount, deleteAccount } = useAppData();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<{ id: string; name: string; openingBalanceNaira: number } | null>(null);
  const [newName, setNewName] = useState("");
  const [newInstitution, setNewInstitution] = useState("");
  const [newBalance, setNewBalance] = useState(0);
  const [newType, setNewType] = useState<AccountType>("SAVINGS");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalNetWorth = calculateNetWorth(accounts as any);

  // Group calculations for right panel insights
  let totalLiquid = 0;
  let totalInvestment = 0;
  let totalLiabilities = 0;
  const institutionMap = new Map<string, number>();

  accounts.forEach((acc) => {
    const bal = Number(acc.balance || 0);
    const t = String(acc.type || "BANK").toUpperCase();
    const inst = (acc.institution || "Personal").trim();

    if (["CREDIT", "LOAN"].includes(t)) {
      totalLiabilities += Math.abs(bal);
    } else if (["INVESTMENT", "SAVINGS"].includes(t)) {
      totalInvestment += bal;
    } else {
      totalLiquid += bal;
    }

    institutionMap.set(inst, (institutionMap.get(inst) || 0) + bal);
  });

  const totalAssets = totalLiquid + totalInvestment;
  const liquidPct = totalAssets > 0 ? Math.max(0, Math.min(100, Math.round((totalLiquid / totalAssets) * 100))) : 0;
  const investPct = totalAssets > 0 ? Math.max(0, Math.min(100, 100 - liquidPct)) : 0;

  const sortedInstitutions = Array.from(institutionMap.entries())
    .sort((a, b) => b[1] - a[1]);

  const inputStyle: React.CSSProperties = {
    backgroundColor: "var(--muted)", border: "1px solid var(--border)",
    color: "var(--foreground)", borderRadius: "0.75rem", padding: "0.5rem 1rem",
    fontSize: "0.875rem", fontWeight: 500, outline: "none", width: "100%",
  };

  return (
    <div className="max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Account List & Management (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>Accounts</h1>
              <p className="text-sm font-medium mt-1" style={{ color: "var(--muted-foreground)" }}>Manage your financial accounts and balances.</p>
            </div>
            <button onClick={() => setShowForm(true)}
              className="px-4 py-2.5 bg-[#635BFF] hover:bg-[#5851e5] text-white rounded-xl text-sm font-semibold transition-all shadow-[0_4px_12px_rgba(99,91,255,0.3)] active:scale-95">
              + Add Account
            </button>
          </div>

          {/* Add Account Form */}
          {showForm && (
            <div className="p-6 rounded-2xl border shadow-sm transition-all" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
              <h2 className="text-sm font-bold mb-5" style={{ color: "var(--foreground)" }}>New Account</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted-foreground)" }}>Name</label>
                  <input placeholder="e.g. GTBank Savings" value={newName} onChange={e => setNewName(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted-foreground)" }}>Type</label>
                  <select value={newType} onChange={e => setNewType(e.target.value as AccountType)} style={{ ...inputStyle, appearance: "none" }}>
                    {(Object.keys(TYPE_META) as AccountType[]).map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted-foreground)" }}>Institution</label>
                  <input placeholder="e.g. GTBank" value={newInstitution} onChange={e => setNewInstitution(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted-foreground)" }}>Opening Balance (₦ Naira)</label>
                  <input type="number" step="any" placeholder="0.00" value={newBalance} onChange={e => setNewBalance(Number(e.target.value))} style={inputStyle} />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold transition-colors" style={{ color: "var(--muted-foreground)" }}>Cancel</button>
                <button
                  disabled={isSaving}
                  onClick={async () => {
                    if (!newName.trim()) return;
                    setIsSaving(true);
                    const balKobo = Math.round(newBalance * 100);
                    await addAccount({
                      name: newName.trim(),
                      type: newType,
                      balance: balKobo,
                      openingBalance: balKobo,
                      institution: newInstitution.trim() || "Personal",
                    });
                    setIsSaving(false);
                    setShowForm(false);
                    setNewName("");
                    setNewInstitution("");
                    setNewBalance(0);
                    setNewType("SAVINGS");
                  }}
                  className="px-4 py-2 bg-[#635BFF] hover:bg-[#5851e5] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all"
                >
                  {isSaving ? "Saving Account..." : "Save Account"}
                </button>
              </div>
            </div>
          )}

          {editingAccount && (
            <div className="p-6 rounded-3xl border shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-200"
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border)" }}>
                <h2 className="font-extrabold text-base tracking-tight" style={{ color: "var(--foreground)" }}>
                  ✏️ Edit Starting Balance for <span className="text-[#635BFF]">{editingAccount.name}</span>
                </h2>
                <button onClick={() => setEditingAccount(null)} className="text-sm font-bold opacity-60 hover:opacity-100">✕</button>
              </div>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                Update the starting amount for this account. Any transactions linked to this account will automatically add or subtract from this starting balance.
              </p>
              <div className="max-w-xs">
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted-foreground)" }}>Starting Balance (₦ Naira)</label>
                <input
                  type="number" step="any"
                  value={editingAccount.openingBalanceNaira}
                  onChange={e => setEditingAccount({ ...editingAccount, openingBalanceNaira: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setEditingAccount(null)} className="px-4 py-2 text-sm font-semibold transition-colors" style={{ color: "var(--muted-foreground)" }}>Cancel</button>
                <button
                  disabled={isSaving}
                  onClick={async () => {
                    setIsSaving(true);
                    const balKobo = Math.round(editingAccount.openingBalanceNaira * 100);
                    await updateAccount(editingAccount.id, { openingBalance: balKobo });
                    setIsSaving(false);
                    setEditingAccount(null);
                  }}
                  className="px-4 py-2 bg-[#635BFF] hover:bg-[#5851e5] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95"
                >
                  {isSaving ? "Saving..." : "Save Starting Balance"}
                </button>
              </div>
            </div>
          )}

          {/* List */}
          <div className="space-y-3.5">
            {accounts.length === 0 ? (
              <div className="p-8 rounded-2xl border text-center" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>No accounts found.</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>Click "+ Add Account" above to create your first account.</p>
              </div>
            ) : (
              accounts.map(account => {
                const m = TYPE_META[String(account.type || "SAVINGS").toUpperCase()] || TYPE_META.SAVINGS;
                const isDeleting = deletingId === account.id;
                return (
                  <div key={account.id} className="p-5 rounded-2xl border flex items-center justify-between transition-all hover:shadow-md hover:border-[#635BFF]/30"
                    style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ backgroundColor: m.bgLight }}>
                        {m.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-base truncate" style={{ color: "var(--foreground)" }}>{account.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: m.bgLight, color: m.color }}>
                            {m.label}
                          </span>
                          <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>{account.institution}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-extrabold text-lg sm:text-xl tracking-tight" style={{ color: "var(--foreground)" }}>{fmt(account.balance)}</p>
                        <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                          Current balance (Baseline: {fmt(Number(account.openingBalance !== undefined ? account.openingBalance : account.balance))})
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const currentAnchor = Number(account.openingBalance !== undefined ? account.openingBalance : account.balance) / 100;
                            setEditingAccount({ id: account.id, name: account.name, openingBalanceNaira: currentAnchor });
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border hover:bg-[#635BFF]/10 text-[#635BFF]"
                          style={{ borderColor: "rgba(99,91,255,0.3)" }}
                        >
                          ✏️ Edit Baseline
                        </button>
                        <button
                          disabled={isDeleting}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setDeletingId(account.id);
                            await deleteAccount(account.id);
                            setDeletingId(null);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border hover:bg-red-500/10 disabled:opacity-50"
                          style={{ color: "#f43f5e", borderColor: "rgba(244,63,94,0.3)" }}
                        >
                          {isDeleting ? "..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Analytics, Asset Allocation & Portfolio Breakdown (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
          
          {/* Net Worth Banner Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#635BFF] to-[#4B45E6] text-white shadow-[0_12px_30px_rgba(99,91,255,0.35)] relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <p className="text-xs font-bold uppercase tracking-wider text-white/80 mb-1">Total Net Worth</p>
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6">{fmt(totalNetWorth)}</p>

            <div className="pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-white/70 font-medium">Liquid Bank & Cash</p>
                <p className="text-base font-bold mt-0.5">{fmt(totalLiquid)} <span className="text-[11px] font-normal text-white/80">({liquidPct}%)</span></p>
              </div>
              <div>
                <p className="text-white/70 font-medium">Investments & Funds</p>
                <p className="text-base font-bold mt-0.5">{fmt(totalInvestment)} <span className="text-[11px] font-normal text-white/80">({investPct}%)</span></p>
              </div>
            </div>

            {/* Allocation Bar */}
            <div className="w-full h-2.5 bg-black/20 rounded-full mt-4 overflow-hidden flex">
              <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${liquidPct}%` }} title={`Liquid Cash: ${liquidPct}%`} />
              <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${investPct}%` }} title={`Investments: ${investPct}%`} />
            </div>
          </div>

          {/* Institution Breakdown Card */}
          <div className="p-6 rounded-3xl border shadow-sm space-y-5" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Portfolio by Institution</h3>
                <p className="text-xs font-medium mt-0.5" style={{ color: "var(--muted-foreground)" }}>Distribution of assets across financial vaults</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#635BFF]/10 text-[#635BFF]">
                {sortedInstitutions.length} Institutions
              </span>
            </div>

            {sortedInstitutions.length === 0 ? (
              <div className="py-8 text-center text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                No active accounts or institutions found.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Donut Chart Container */}
                <div className="h-56 w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sortedInstitutions.slice(0, 6).map(([inst, bal], idx) => ({
                          name: inst,
                          value: bal,
                          color: ["#635BFF", "#10B981", "#0EA5E9", "#F59E0B", "#EC4899", "#8B5CF6"][idx % 6],
                          share: totalAssets > 0 ? Math.round((bal / totalAssets) * 100) : 0
                        }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        stroke="transparent"
                      >
                        {sortedInstitutions.slice(0, 6).map(([inst], idx) => {
                          const colors = ["#635BFF", "#10B981", "#0EA5E9", "#F59E0B", "#EC4899", "#8B5CF6"];
                          return <Cell key={inst} fill={colors[idx % colors.length]} />;
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
                                  <span style={{ color: "var(--muted-foreground)" }}>Balance:</span>
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
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Total Assets</span>
                    <span className="text-sm font-extrabold tracking-tight" style={{ color: "var(--foreground)" }}>
                      {fmt(totalAssets).replace(/\.\d\d$/, "")}
                    </span>
                  </div>
                </div>

                {/* Legend & Breakdown Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                  {sortedInstitutions.slice(0, 6).map(([inst, bal], idx) => {
                    const share = totalAssets > 0 ? Math.round((bal / totalAssets) * 100) : 0;
                    const colors = ["#635BFF", "#10B981", "#0EA5E9", "#F59E0B", "#EC4899", "#8B5CF6"];
                    const color = colors[idx % colors.length];

                    return (
                      <div
                        key={inst}
                        className="p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-colors hover:bg-muted/50"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-semibold text-xs truncate" style={{ color: "var(--foreground)" }} title={inst}>
                            {inst}
                          </span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="font-bold text-xs block" style={{ color: "var(--foreground)" }}>{fmt(bal)}</span>
                          <span className="text-[10px] font-medium" style={{ color: "var(--muted-foreground)" }}>{share}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Health & Guidance Card */}
          <div className="p-6 rounded-3xl border shadow-sm space-y-3" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-base">
                ⚡
              </div>
              <h3 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Liquidity & Health Insights</h3>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              <strong style={{ color: "var(--foreground)" }}>Strong Asset Protection:</strong> Over <strong>{investPct}%</strong> of your funds (`{fmt(totalInvestment)}`) are allocated inside high-yield reserves (`CP Compass` & `Mainstreet Flexi`).
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              <strong style={{ color: "var(--foreground)" }}>Operational Cash:</strong> Your liquid bank and cash accounts hold `{fmt(totalLiquid)}`, ensuring instant readiness for scheduled spending or quick transfers without touching your core reserves.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
