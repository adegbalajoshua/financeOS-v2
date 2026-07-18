"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { useSession, signIn, signOut } from "next-auth/react";
import { OnboardingBanner } from "./OnboardingBanner";
import { TopHeader } from "./TopHeader";
import { CommandCenterTourModal } from "./CommandCenterTourModal";
import { useAppData } from "@/lib/appContext";

const NAV_ITEMS = [
  {
    label: "Overview",
    href: "/",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.25"/>
        <rect x="9.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.25"/>
        <rect x="1.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.25"/>
        <rect x="9.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.25"/>
      </svg>
    ),
  },
  {
    label: "Activity",
    href: "/activity",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.25"/>
        <circle cx="8" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M8 4.5v7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
        <path d="M3 8h3.5M9.5 8H13" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Accounts",
    href: "/accounts",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M4.5 10h2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Budgets",
    href: "/budget",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M8 5v6M6 7h3.5a1.5 1.5 0 0 1 0 3H6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Backup & Export",
    href: "/migration",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <path d="M2 8h9M8 5l3 3-3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M13.5 3v10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
];

function SunIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
      <path d="M13.5 10A6 6 0 1 1 6 2.5a4.5 4.5 0 0 0 7.5 7.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggle, mounted } = useTheme();
  const isDark = mounted && theme === "dark";
  const { data: session, status } = useSession();
  const { logoutAndClearCache, runPurge } = useAppData();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSafeGoogleSignIn = () => {
    if (typeof window !== "undefined" && window.location.hostname === "0.0.0.0") {
      const port = window.location.port || "3000";
      window.location.href = `http://localhost:${port}/login?auto_google=true`;
      return;
    }
    signIn("google", { callbackUrl: "/auth/resolve" });
  };

  if (pathname === "/login" || pathname?.startsWith("/login") || pathname?.startsWith("/auth/resolve")) {
    return (
      <div className="min-h-screen w-full relative overflow-x-hidden selection:bg-[#635BFF] selection:text-white" style={{ backgroundColor: "#06060A", color: "#FFFFFF" }}>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--background)" }}>
      {/* ── Sidebar ── */}
      <aside
        className="hidden md:flex flex-col w-56 fixed h-full z-20 border-r py-5 px-3 transition-all select-none"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        {/* Brand Logo */}
        <div className="flex items-center justify-between px-3 mb-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#635BFF] to-[#8079FF] flex items-center justify-center shadow-md shadow-[#635BFF]/25 group-hover:scale-105 transition-transform">
              <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5v6M6 7h3.5a1.5 1.5 0 0 1 0 3H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight leading-none" style={{ color: "var(--foreground)" }}>
                FinanceOS
              </span>
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase mt-0.5 text-[#635BFF]">
                Personal Space
              </span>
            </div>
          </Link>
        </div>

        {/* Main Navigation Items */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          <div>
            <p className="px-3 pb-2 text-[10px] font-extrabold tracking-wider uppercase text-muted-foreground/60">
              Main View
            </p>
            <nav className="space-y-1">
              {NAV_ITEMS.slice(0, 4).map((item) => {
                const isActive = item.href === "/" ? (pathname === "/" || pathname === "/dashboard") : pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? "bg-[#635BFF]/15 text-[#635BFF] shadow-sm border-l-[3px] border-[#635BFF] pl-2.5"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className={`transition-transform group-hover:scale-110 ${isActive ? "text-[#635BFF]" : ""}`}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div>
            <p className="px-3 pb-2 text-[10px] font-extrabold tracking-wider uppercase text-muted-foreground/60">
              Data & Settings
            </p>
            <nav className="space-y-1">
              {NAV_ITEMS.slice(4).map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? "bg-[#635BFF]/15 text-[#635BFF] shadow-sm border-l-[3px] border-[#635BFF] pl-2.5"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className={`transition-transform group-hover:scale-110 ${isActive ? "text-[#635BFF]" : ""}`}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Decluttered Streamlined Footer */}
        <div className="mt-auto pt-3 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
          {/* Single clean Quick Help / Tour Trigger */}
          <button
            onClick={() => {
              localStorage.setItem("financeos_show_quickstart_tour", "true");
              window.location.reload();
            }}
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-[#635BFF]/10 text-muted-foreground hover:text-[#635BFF] border border-transparent hover:border-[#635BFF]/20 group"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm">❓</span>
              <span>Quick-Start Guide</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#635BFF]/10 text-[#635BFF] opacity-0 group-hover:opacity-100 transition-opacity">
              Tour
            </span>
          </button>

          {/* Theme switcher pill */}
          <button
            onClick={toggle}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all border hover:border-[#635BFF]/40"
            style={{ backgroundColor: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            <div className="flex items-center gap-2.5">
              {isDark ? <SunIcon /> : <MoonIcon />}
              <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-bold text-muted-foreground">
              {isDark ? "☀️" : "🌙"}
            </span>
          </button>

          {/* User Session Info / Google Auth */}
          {status === "authenticated" && session?.user ? (
            <Link
              href="/settings"
              title="View account preferences and data settings"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all hover:bg-white/[0.04] group border border-transparent hover:border-border"
            >
              <div className="w-7 h-7 rounded-full bg-[#635BFF]/20 border border-[#635BFF]/40 flex items-center justify-center flex-shrink-0 text-[#635BFF] font-bold text-[11px]">
                {(() => {
                  const name = session.user.name || session.user.email || "";
                  if (!name || name === "Demo Account User") return "DA";
                  return name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
                })()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate group-hover:text-[#635BFF] transition-colors" style={{ color: "var(--foreground)" }}>
                  {(session.user.email === "demo@financeos.com" || session.user.name === "Demo Account User")
                    ? "Demo Account"
                    : session.user.name || session.user.email?.split("@")[0] || "My Profile"}
                </p>
                <p className="text-[10px] truncate text-emerald-500 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Auto-Saved</span>
                </p>
              </div>
            </Link>
          ) : (
            <button
              onClick={handleSafeGoogleSignIn}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-[#635BFF] text-white hover:opacity-90 active:scale-95 transition-all shadow-sm"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Sign In with Google
            </button>
          )}
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 border-b px-4 h-14 flex items-center justify-between shadow-sm"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#635BFF] flex items-center justify-center shadow-[0_2px_8px_rgba(99,91,255,0.4)]">
            <span className="text-white font-bold text-xs">F</span>
          </div>
          <span className="font-bold tracking-tight" style={{ color: "var(--foreground)" }}>FinanceOS</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggle}
            type="button"
            aria-label="Toggle dark mode"
            className="w-10 h-10 rounded-lg flex items-center justify-center active:scale-95 transition-all hover:bg-[#635BFF]/10"
            style={{ color: "var(--muted-foreground)" }}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            type="button"
            aria-label="Toggle navigation menu"
            className="w-10 h-10 rounded-lg flex items-center justify-center active:scale-95 transition-all hover:bg-[#635BFF]/10"
            style={{ color: "var(--muted-foreground)" }}
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ── Mobile Menu Backdrop & Drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <aside
            className="relative w-64 max-w-[80vw] h-full flex flex-col py-5 px-4 shadow-2xl z-50 animate-slide-right"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            {/* Header / Brand */}
            <div className="flex items-center justify-between pb-5 mb-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#635BFF] to-[#8079FF] flex items-center justify-center shadow-md shadow-[#635BFF]/25">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 5v6M6 7h3.5a1.5 1.5 0 0 1 0 3H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm tracking-tight leading-none" style={{ color: "var(--foreground)" }}>
                    FinanceOS
                  </span>
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase mt-0.5 text-[#635BFF]">
                    Pro Workspace
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-95 transition-colors hover:bg-white/[0.06] text-muted-foreground hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Nav Links */}
            <div className="flex-1 space-y-5 overflow-y-auto pr-1">
              <div>
                <p className="px-3 pb-2 text-[10px] font-extrabold tracking-wider uppercase text-muted-foreground/60">
                  Main View
                </p>
                <nav className="space-y-1">
                  {NAV_ITEMS.slice(0, 4).map((item) => {
                    const isActive = item.href === "/" ? (pathname === "/" || pathname === "/dashboard") : pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-[#635BFF]/15 text-[#635BFF] shadow-sm border-l-[3px] border-[#635BFF] pl-2.5"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div>
                <p className="px-3 pb-2 text-[10px] font-extrabold tracking-wider uppercase text-muted-foreground/60">
                  Tools & Data
                </p>
                <nav className="space-y-1">
                  {NAV_ITEMS.slice(4).map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-[#635BFF]/15 text-[#635BFF] shadow-sm border-l-[3px] border-[#635BFF] pl-2.5"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Footer / Theme & User */}
            <div className="mt-auto pt-3 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
              {/* Single clean Quick Help / Tour Trigger */}
              <button
                onClick={() => {
                  localStorage.setItem("financeos_show_quickstart_tour", "true");
                  window.location.reload();
                }}
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-[#635BFF]/10 text-muted-foreground hover:text-[#635BFF] border border-transparent hover:border-[#635BFF]/20 group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">❓</span>
                  <span>Quick-Start Guide</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#635BFF]/10 text-[#635BFF]">
                  Tour
                </span>
              </button>

              {/* Theme toggle button inside drawer */}
              <button
                onClick={() => {
                  toggle();
                }}
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all border hover:border-[#635BFF]/40"
                style={{ backgroundColor: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                <div className="flex items-center gap-2.5">
                  {isDark ? <SunIcon /> : <MoonIcon />}
                  <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-bold text-muted-foreground">
                  {isDark ? "☀️" : "🌙"}
                </span>
              </button>

              {/* User session info */}
              {status === "authenticated" && session?.user ? (
                <Link
                  href="/settings"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all hover:bg-white/[0.04] group border border-transparent hover:border-border"
                >
                  <div className="w-7 h-7 rounded-full bg-[#635BFF]/20 border border-[#635BFF]/40 flex items-center justify-center flex-shrink-0 text-[#635BFF] font-bold text-[11px]">
                    {session.user.name?.slice(0, 2).toUpperCase() || "JA"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate group-hover:text-[#635BFF] transition-colors" style={{ color: "var(--foreground)" }}>
                      {session.user.name || "My Profile"}
                    </p>
                    <p className="text-[10px] truncate text-emerald-500 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Auto-Saved</span>
                    </p>
                  </div>
                </Link>
              ) : (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    handleSafeGoogleSignIn();
                  }}
                  type="button"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-[#635BFF] text-white active:scale-95 shadow-sm transition-all"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Sign In with Google
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 min-h-screen w-full md:ml-56 flex flex-col">
        <TopHeader />
        <div className="w-full px-4 sm:px-6 py-8 mt-14 md:mt-0 flex-1">
          <OnboardingBanner />
          <CommandCenterTourModal />
          {children}
        </div>
      </main>
    </div>
  );
}
