"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppData } from "@/lib/appContext";

interface CustomAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  institution: string;
}

interface CustomBudget {
  category: string;
  amount: number;
  color: string;
}

const BUDGET_COLORS = [
  "#635BFF", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6",
  "#06B6D4", "#F43F5E", "#14B8A6", "#3B82F6", "#A855F7",
  "#0EA5E9", "#6366F1", "#EF4444", "#84CC16",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { runPurge, activeCycleId, setActiveCycleId, batchSetupWorkspace, syncToSupabase } = useAppData();

  // Step 1: Path Choice | Step 2: Accounts | Step 3: Budgets | Step 4: Final Launch
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState(activeCycleId || "Jul-26");

  // State for Step 2: Custom Bank Accounts (start empty for fresh setup)
  const [customAccounts, setCustomAccounts] = useState<CustomAccount[]>([]);
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState("checking");
  const [newAccBalance, setNewAccBalance] = useState("");
  const [newAccInst, setNewAccInst] = useState("");

  // State for Step 3: Smart Budget Recommender vs Custom
  const [budgetMode, setBudgetMode] = useState<"smart" | "custom">("smart");
  const [incomeInput, setIncomeInput] = useState<number>(80000000); // default 800,000 NGN in kobo
  const [selectedRoute, setSelectedRoute] = useState<"50-30-20" | "wealth-builder" | "lean-saver">("50-30-20");

  // Custom budget categories state
  const [customBudgets, setCustomBudgets] = useState<CustomBudget[]>([]);
  const [newBudgetName, setNewBudgetName] = useState("");
  const [newBudgetAmount, setNewBudgetAmount] = useState("");
  const [newBudgetColor, setNewBudgetColor] = useState(BUDGET_COLORS[0]);

  function fmt(kobo: number) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(kobo / 100);
  }

  const handleAddCustomAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim() || !newAccBalance) return;
    const balanceKobo = Math.round(parseFloat(newAccBalance.replace(/,/g, "")) * 100);
    if (isNaN(balanceKobo)) return;

    setCustomAccounts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: newAccName.trim(),
        type: newAccType,
        balance: balanceKobo,
        institution: newAccInst.trim() || "Personal",
      },
    ]);
    setNewAccName("");
    setNewAccBalance("");
    setNewAccInst("");
  };

  const handleRemoveAccount = (id: string) => {
    setCustomAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddCustomBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudgetName.trim() || !newBudgetAmount) return;
    const amountKobo = Math.round(parseFloat(newBudgetAmount.replace(/,/g, "")) * 100);
    if (isNaN(amountKobo) || amountKobo <= 0) return;

    // Pick next available color
    const usedColors = customBudgets.map((b) => b.color);
    const nextColor = BUDGET_COLORS.find((c) => !usedColors.includes(c)) || BUDGET_COLORS[customBudgets.length % BUDGET_COLORS.length];

    setCustomBudgets((prev) => [
      ...prev,
      { category: newBudgetName.trim(), amount: amountKobo, color: nextColor },
    ]);
    setNewBudgetName("");
    setNewBudgetAmount("");
  };

  const handleRemoveCustomBudget = (idx: number) => {
    setCustomBudgets((prev) => prev.filter((_, i) => i !== idx));
  };

  const calculateRecommendedBudgets = (): CustomBudget[] => {
    const income = incomeInput || 0;
    if (selectedRoute === "50-30-20") {
      return [
        { category: "Housing & Rent", amount: Math.round(income * 0.25), color: "#635BFF" },
        { category: "Groceries & Supermarket", amount: Math.round(income * 0.15), color: "#10B981" },
        { category: "Utilities & Bills", amount: Math.round(income * 0.10), color: "#F59E0B" },
        { category: "Dining & Entertainment", amount: Math.round(income * 0.20), color: "#EC4899" },
        { category: "Subscriptions & Personal", amount: Math.round(income * 0.10), color: "#8B5CF6" },
        { category: "Savings & Investments", amount: Math.round(income * 0.20), color: "#06B6D4" },
      ];
    } else if (selectedRoute === "wealth-builder") {
      return [
        { category: "Core Living Needs", amount: Math.round(income * 0.35), color: "#635BFF" },
        { category: "Transport & Utilities", amount: Math.round(income * 0.10), color: "#F59E0B" },
        { category: "Discretionary Spending", amount: Math.round(income * 0.15), color: "#EC4899" },
        { category: "Aggressive Wealth Building", amount: Math.round(income * 0.40), color: "#10B981" },
      ];
    } else {
      return [
        { category: "Fixed Housing & Obligations", amount: Math.round(income * 0.45), color: "#635BFF" },
        { category: "Essential Groceries & Bills", amount: Math.round(income * 0.25), color: "#F59E0B" },
        { category: "Flexible Spending", amount: Math.round(income * 0.20), color: "#EC4899" },
        { category: "Emergency Reserve", amount: Math.round(income * 0.10), color: "#10B981" },
      ];
    }
  };

  // The final list of budgets to enroll depends on mode
  const activeBudgetsList = budgetMode === "smart" ? calculateRecommendedBudgets() : customBudgets;

  const handleLoadBaselineDemo = async () => {
    setIsProcessing(true);
    await runPurge("sample");
    localStorage.setItem("financeos_onboarding_completed", "true");
    localStorage.setItem("financeos_show_quickstart_tour", "true");
    localStorage.setItem("financeos_first_name", "Demo User");
    localStorage.setItem("financeos_display_name", "Demo Account User");
    localStorage.setItem("financeos_user_email", "demo@financeos.com");
    localStorage.setItem("financeos_username", "demo_user");
    try {
      await fetch("/api/auth/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_onboarding_complete" }),
      });
    } catch (_) {}
    setIsProcessing(false);
    router.push("/");
  };

  const handleFinishCustomOnboarding = async () => {
    setIsProcessing(true);
    await runPurge("all");
    localStorage.removeItem("financeos_practice_mode");
    setActiveCycleId(selectedCycle);

    // Enroll configured bank accounts and budget categories atomically
    await batchSetupWorkspace({
      newAccounts: customAccounts.map((acc) => ({
        name: acc.name,
        type: acc.type,
        balance: acc.balance,
        status: "active",
        institution: acc.institution || acc.name,
      })),
      newBudgets: activeBudgetsList.map((b) => ({
        name: b.category,
        category: b.category,
        planned: b.amount,
        spent: 0,
        cycleId: selectedCycle,
        type: "Expense",
        color: b.color,
      } as any)),
    });

    localStorage.setItem("financeos_onboarding_completed", "true");
    localStorage.setItem("financeos_show_quickstart_tour", "true");
    try {
      await fetch("/api/auth/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_onboarding_complete" }),
      });
    } catch (_) {}

    setIsProcessing(false);
    router.push("/");
  };

  const totalStartingBalance = customAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalBudgeted = activeBudgetsList.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded-3xl border shadow-2xl bg-card overflow-hidden" style={{ borderColor: "var(--border)" }}>
        
        {/* Top Header */}
        <div className="p-6 md:p-8 border-b bg-muted/30 flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ borderColor: "var(--border)" }}>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#635BFF]/10 text-[#635BFF] text-xs font-bold uppercase tracking-wider mb-2">
              Step {step} of 4: {step === 1 ? "Choose Setup Path" : step === 2 ? "Bank & Wallet Setup" : step === 3 ? "Budget Advisor" : "Launch & Handshake"}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: "var(--foreground)" }}>
              Welcome to Your Command Center
            </h1>
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                onClick={() => {
                  if (step > 1 && s > 1) setStep(s as any);
                }}
                className={`flex items-center justify-center w-9 h-9 rounded-full font-bold text-xs transition-all ${
                  step === s
                    ? "bg-[#635BFF] text-white shadow-lg scale-110"
                    : step > s
                    ? "bg-emerald-500 text-white cursor-pointer"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                {step > s ? "✓" : s}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content Area */}
        <div className="p-6 md:p-10 space-y-8">
          
          {/* STEP 1: CHOOSE PATH */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-2">
                <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
                  How would you like to initialize your private financial workspace?
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your data is cryptographically protected and strictly isolated. Choose whether to explore right away with demonstration data or tailor your accounts and budgets from scratch.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Option A: Demo */}
                <div className="p-6 md:p-7 rounded-3xl border bg-gradient-to-br from-[#1E1E2E] to-[#2D2D44] text-white space-y-4 border-white/10 shadow-lg flex flex-col justify-between hover:scale-[1.01] transition-transform">
                  <div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white block w-fit mb-3">
                      ⚡ Instant Exploration
                    </span>
                    <h3 className="font-extrabold text-xl text-white">Load Demonstration Data</h3>
                    <p className="text-xs text-white/80 mt-2 leading-relaxed">
                      Pre-populates your workspace with ~170 realistic Nigerian transactions across 7 bank accounts (GTBank, Zenith, Kuda, OPay, PiggyVest, Cowrywise) and 11 category budgets. You can always reset later.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadBaselineDemo}
                    disabled={isProcessing}
                    className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-all shadow-md active:scale-95 text-center mt-6"
                  >
                    {isProcessing ? "Launching Demo Workspace..." : "Practice with Sample Data →"}
                  </button>
                </div>

                {/* Option B: Tailored Setup */}
                <div className="p-6 md:p-7 rounded-3xl border space-y-4 flex flex-col justify-between hover:scale-[1.01] transition-transform" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                  <div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#635BFF]/15 text-[#635BFF] block w-fit mb-3">
                      ✨ Recommended for Real Use
                    </span>
                    <h3 className="font-extrabold text-xl" style={{ color: "var(--foreground)" }}>Personalize My Setup</h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      We will guide you through adding your real starting bank account balances and generating a smart budget tailored to your monthly income — or build fully custom category limits.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full py-3.5 rounded-xl bg-[#635BFF] hover:bg-[#5851e5] text-white text-xs font-bold transition-all shadow-md active:scale-95 text-center mt-6"
                  >
                    Start Interactive Setup →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: BANK & WALLET SETUP */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#635BFF]/5 border border-[#635BFF]/20">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                  Setup Starting Bank & Wallet Balances
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add the accounts where your liquid cash, salaries, or wealth reserves currently live.
                  </p>
                </div>
                <div className="text-right bg-card px-4 py-2 rounded-xl border">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">Starting Net Worth</span>
                  <span className="text-lg font-extrabold text-emerald-500">{fmt(totalStartingBalance)}</span>
                </div>
              </div>

              {/* Existing Account Cards */}
              {customAccounts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                  {customAccounts.map((acc) => (
                    <div key={acc.id} className="p-4 rounded-2xl border bg-card flex justify-between items-center shadow-sm" style={{ borderColor: "var(--border)" }}>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                          {acc.type} • {acc.institution}
                        </span>
                        <span className="text-sm font-bold block" style={{ color: "var(--foreground)" }}>
                          {acc.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-extrabold" style={{ color: "var(--foreground)" }}>
                          {fmt(acc.balance)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAccount(acc.id)}
                          className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {customAccounts.length === 0 && (
                <div className="p-8 rounded-2xl border-2 border-dashed text-center" style={{ borderColor: "var(--border)" }}>
                  <p className="text-sm font-bold text-muted-foreground">No accounts added yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Use the form below to add your first bank account or wallet.</p>
                </div>
              )}

              {/* Add Account Quick Form */}
              <form onSubmit={handleAddCustomAccount} className="p-5 rounded-2xl border bg-muted/20 space-y-4" style={{ borderColor: "var(--border)" }}>
                <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: "var(--foreground)" }}>
                  + Add Bank or Wallet Account
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder="Account Name (e.g. GTBank Salary)"
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    className="sm:col-span-1 px-3.5 py-2 rounded-xl border text-xs font-medium outline-none bg-card text-foreground"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <select
                    value={newAccType}
                    onChange={(e) => setNewAccType(e.target.value)}
                    className="sm:col-span-1 px-3.5 py-2 rounded-xl border text-xs font-medium outline-none bg-card text-foreground"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <option value="checking">Checking / Salary</option>
                    <option value="savings">Savings / Reserve</option>
                    <option value="mobile wallet">Mobile Money Wallet</option>
                    <option value="credit card">Credit Card</option>
                    <option value="investment">Investment / Brokerage</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Institution (e.g. GTBank)"
                    value={newAccInst}
                    onChange={(e) => setNewAccInst(e.target.value)}
                    className="sm:col-span-1 px-3.5 py-2 rounded-xl border text-xs font-medium outline-none bg-card text-foreground"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Current Balance (₦)"
                    value={newAccBalance}
                    onChange={(e) => setNewAccBalance(e.target.value)}
                    className="sm:col-span-1 px-3.5 py-2 rounded-xl border text-xs font-medium outline-none bg-card text-foreground"
                    style={{ borderColor: "var(--border)" }}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!newAccName.trim() || !newAccBalance}
                    className="px-5 py-2 rounded-xl bg-[#635BFF] hover:bg-[#5851e5] text-white text-xs font-bold transition-all disabled:opacity-40"
                  >
                    Add Account
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: BUDGET ADVISOR (Smart Recommender + Custom) */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-2">
                <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                  Setup Your Monthly Budget Categories
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Use our smart financial advisor to auto-generate balanced categories, or create your own custom budget from scratch.
                </p>
              </div>

              {/* Mode Tabs */}
              <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                <button
                  type="button"
                  onClick={() => setBudgetMode("smart")}
                  className={`flex-1 px-4 py-3 text-xs font-bold transition-all ${
                    budgetMode === "smart"
                      ? "bg-[#635BFF] text-white"
                      : "bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🏆 Smart Budget Recommender
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetMode("custom")}
                  className={`flex-1 px-4 py-3 text-xs font-bold transition-all ${
                    budgetMode === "custom"
                      ? "bg-[#635BFF] text-white"
                      : "bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ✏️ Create My Own Categories
                </button>
              </div>

              {/* SMART MODE */}
              {budgetMode === "smart" && (
                <div className="space-y-5">
                  {/* Income Input */}
                  <div className="p-5 rounded-2xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: "var(--border)" }}>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                        Expected Monthly Net Income
                      </label>
                      <span className="text-xs text-muted-foreground">Used to calculate your optimal category breakdown</span>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-muted-foreground">₦</span>
                      <input
                        type="number"
                        value={incomeInput / 100}
                        onChange={(e) => setIncomeInput(Math.round(parseFloat(e.target.value || "0") * 100))}
                        className="w-full pl-8 pr-4 py-2 rounded-xl border text-sm font-bold outline-none bg-muted/20 text-foreground"
                        style={{ borderColor: "var(--border)" }}
                      />
                    </div>
                  </div>

                  {/* Route Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: "50-30-20", title: "🏆 The 50/30/20 Rule", desc: "50% Needs, 30% Wants, 20% Wealth & Savings. The gold standard for balanced financial health." },
                      { id: "wealth-builder", title: "📈 Aggressive Wealth", desc: "40% Needs, 20% Wants, 40% Aggressive Investments. For maximizing rapid capital growth." },
                      { id: "lean-saver", title: "🛡️ Lean Essentials", desc: "70% Needs, 20% Wants, 10% Reserve. Ideal when focusing on fixed bills and obligations." },
                    ].map((route) => {
                      const isSelected = selectedRoute === route.id;
                      return (
                        <div
                          key={route.id}
                          onClick={() => setSelectedRoute(route.id as any)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? "bg-[#635BFF]/10 border-[#635BFF] shadow-md ring-2 ring-[#635BFF]/20"
                              : "bg-card border-border hover:border-foreground/30"
                          }`}
                        >
                          <span className="text-xs font-extrabold block mb-1" style={{ color: isSelected ? "#635BFF" : "var(--foreground)" }}>
                            {route.title}
                          </span>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{route.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CUSTOM MODE */}
              {budgetMode === "custom" && (
                <div className="space-y-5">
                  {/* Existing custom budgets */}
                  {customBudgets.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {customBudgets.map((b, idx) => (
                        <div key={idx} className="p-3 rounded-xl border bg-card flex justify-between items-center text-xs font-bold" style={{ borderColor: "var(--border)" }}>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                            <span>{b.category}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-500">{fmt(b.amount)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomBudget(idx)}
                              className="text-red-500 hover:bg-red-500/10 p-1 rounded text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {customBudgets.length === 0 && (
                    <div className="p-8 rounded-2xl border-2 border-dashed text-center" style={{ borderColor: "var(--border)" }}>
                      <p className="text-sm font-bold text-muted-foreground">No custom budget categories yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Add your own spending categories with monthly limits below.</p>
                    </div>
                  )}

                  {/* Add custom budget form */}
                  <form onSubmit={handleAddCustomBudget} className="p-5 rounded-2xl border bg-muted/20 space-y-4" style={{ borderColor: "var(--border)" }}>
                    <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: "var(--foreground)" }}>
                      + Add Budget Category
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Category Name (e.g. Food & Groceries)"
                        value={newBudgetName}
                        onChange={(e) => setNewBudgetName(e.target.value)}
                        className="sm:col-span-1 px-3.5 py-2 rounded-xl border text-xs font-medium outline-none bg-card text-foreground"
                        style={{ borderColor: "var(--border)" }}
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Monthly Limit (₦)"
                        value={newBudgetAmount}
                        onChange={(e) => setNewBudgetAmount(e.target.value)}
                        className="sm:col-span-1 px-3.5 py-2 rounded-xl border text-xs font-medium outline-none bg-card text-foreground"
                        style={{ borderColor: "var(--border)" }}
                      />
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5 flex-wrap flex-1">
                          {BUDGET_COLORS.slice(0, 8).map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setNewBudgetColor(c)}
                              className={`w-5 h-5 rounded-full border-2 transition-all ${
                                newBudgetColor === c ? "scale-125 border-white shadow-md" : "border-transparent"
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!newBudgetName.trim() || !newBudgetAmount}
                        className="px-5 py-2 rounded-xl bg-[#635BFF] hover:bg-[#5851e5] text-white text-xs font-bold transition-all disabled:opacity-40"
                      >
                        Add Category
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Budget Summary (shared by both modes) */}
              <div className="p-5 rounded-2xl border bg-muted/20 space-y-3" style={{ borderColor: "var(--border)" }}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--foreground)" }}>
                    {budgetMode === "smart" ? "Recommended Category Targets" : "Your Custom Categories"}
                  </span>
                  <span className="text-xs font-extrabold text-[#635BFF]">
                    Total: {fmt(totalBudgeted)} / Mo
                  </span>
                </div>
                {activeBudgetsList.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeBudgetsList.map((b, idx) => (
                      <div key={idx} className="p-3 rounded-xl border bg-card flex justify-between items-center text-xs font-bold" style={{ borderColor: "var(--border)" }}>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                          <span>{b.category}</span>
                        </div>
                        <span className="text-emerald-500">{fmt(b.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No categories configured yet.</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: LAUNCH & HANDSHAKE */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-2">
                <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                  Confirm Active Cycle & Launch Command Center
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Select the active monthly billing cycle you want your charts and budget tracking to follow.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {["Jul-26", "Aug-26", "Sep-26", "Oct-26"].map((cycle) => {
                  const isSelected = selectedCycle === cycle;
                  return (
                    <button
                      key={cycle}
                      type="button"
                      onClick={() => setSelectedCycle(cycle)}
                      className={`p-4 rounded-2xl border font-bold text-sm transition-all flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? "bg-[#635BFF] text-white border-[#635BFF] shadow-lg scale-105"
                          : "bg-muted text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      <span className="text-lg">📅</span>
                      <span>{cycle}</span>
                      {isSelected && <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full mt-1">Active Cycle</span>}
                    </button>
                  );
                })}
              </div>

              {/* Summary Card */}
              <div className="p-6 rounded-2xl border bg-card space-y-4" style={{ borderColor: "var(--border)" }}>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground">Setup Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                  <div>
                    <span className="text-xs text-muted-foreground block">Connected Accounts</span>
                    <span className="text-base font-bold" style={{ color: "var(--foreground)" }}>{customAccounts.length} Active Accounts</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Starting Net Worth</span>
                    <span className="text-base font-extrabold text-emerald-500">{fmt(totalStartingBalance)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Budget Categories</span>
                    <span className="text-base font-bold text-[#635BFF]">{activeBudgetsList.length} Limits ({budgetMode === "smart" ? "Smart" : "Custom"})</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Controls */}
          {step > 1 && (
            <div className="pt-6 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                disabled={isProcessing}
                className="px-6 py-3 rounded-xl border text-xs font-bold transition-all disabled:opacity-30"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                ← Back
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s + 1) as any)}
                  className="px-6 py-3 rounded-xl bg-[#635BFF] hover:bg-[#5851e5] text-white text-xs font-bold shadow-md transition-all"
                >
                  Next Step →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinishCustomOnboarding}
                  disabled={isProcessing}
                  className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                >
                  <span>{isProcessing ? "Provisioning Workspace..." : "🚀 Launch Command Center & Tour"}</span>
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}