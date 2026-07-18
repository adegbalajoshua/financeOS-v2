"use client";

import React, { useState, useEffect } from "react";

export function CommandCenterTourModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [slide, setSlide] = useState(1);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const showTour = localStorage.getItem("financeos_show_quickstart_tour");
      if (showTour === "true") {
        setIsOpen(true);
      }
    }
  }, []);

  const handleClose = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("financeos_show_quickstart_tour");
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className="w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col justify-between min-h-[460px]"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
      >
        {/* Top Header */}
        <div className="p-6 md:p-8 border-b bg-muted/20 flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#635BFF]/15 text-[#635BFF]">
              Command Center Quick-Start
            </span>
            <span className="text-xs font-bold text-muted-foreground">Slide {slide} of 4</span>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Slide Content */}
        <div className="p-6 md:p-10 flex-1 flex flex-col justify-center space-y-6">
          {slide === 1 && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center text-2xl font-extrabold shadow-sm">
                💰
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">1. Your Live Net Worth Command Center</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Right here at the top of your dashboard is your live, real-time aggregated balance across all the bank, wallet, or savings accounts you just configured in your setup wizard.
              </p>
              <div className="p-4 rounded-2xl bg-muted/30 border text-xs leading-relaxed font-medium" style={{ borderColor: "var(--border)" }}>
                💡 <strong>Pro Tip:</strong> Every time you log an expense or deposit, your Net Worth updates instantly with smooth 60FPS visual animations!
              </div>
            </div>
          )}

          {slide === 2 && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-[#635BFF]/15 text-[#635BFF] flex items-center justify-center text-2xl font-extrabold shadow-sm">
                ✍️
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">2. Recording Transactions & Handshakes</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Use the prominent floating action button or input composer (`+ Record Event`) anytime to log an income handshake, daily grocery run, or fund transfer between your accounts.
              </p>
              <div className="p-4 rounded-2xl bg-muted/30 border text-xs leading-relaxed font-medium" style={{ borderColor: "var(--border)" }}>
                ⚡ <strong>Instant Reconciliation:</strong> Transactions automatically debit your source account balance and categorize your spending in real time.
              </div>
            </div>
          )}

          {slide === 3 && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-pink-500/15 text-pink-500 flex items-center justify-center text-2xl font-extrabold shadow-sm">
                🛡️
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">3. Real-Time 50/30/20 Budget Protection</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The smart category budgets you just enrolled (`Needs, Wants, & Savings`) track every single expenditure dynamically under the <strong>Active Budgets</strong> tab.
              </p>
              <div className="p-4 rounded-2xl bg-muted/30 border text-xs leading-relaxed font-medium" style={{ borderColor: "var(--border)" }}>
                🚨 <strong>Early Warning System:</strong> Health progress bars turn amber when approaching 80% and red when over budget, keeping you strictly in control.
              </div>
            </div>
          )}

          {slide === 4 && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center text-2xl font-extrabold shadow-sm">
                🚀
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">4. You Are In Total Command!</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your private workspace is provisioned, multi-tenant isolated, and ready for action. You can re-launch this tour or adjust your settings anytime from the top navigation.
              </p>
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs leading-relaxed font-bold text-emerald-600 dark:text-emerald-400">
                🎉 Congratulations! Let&apos;s achieve your financial goals and build lasting wealth.
              </div>
            </div>
          )}
        </div>

        {/* Navigation Controls */}
        <div className="p-6 md:p-8 border-t bg-muted/20 flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => {
              if (slide > 1) setSlide(slide - 1);
            }}
            disabled={slide === 1}
            className="px-5 py-2.5 rounded-xl border text-xs font-bold transition-all disabled:opacity-30"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            ← Previous
          </button>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  slide === s ? "w-6 bg-[#635BFF]" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          {slide < 4 ? (
            <button
              onClick={() => setSlide(slide + 1)}
              className="px-6 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5851e5] text-white text-xs font-bold shadow-md transition-all"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-lg transition-transform active:scale-95"
            >
              Let&apos;s Build Wealth! 🚀
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
