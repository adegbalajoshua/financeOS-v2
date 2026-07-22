"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { useSession, signIn, signOut } from "next-auth/react";
import { OnboardingBanner } from "./OnboardingBanner";
import { TopHeader } from "./TopHeader";
import { CommandCenterTourModal } from "./CommandCenterTourModal";
import { EventComposer } from "./EventComposer";
import { EventEditModal } from "./EventEditModal";
import { useAppData } from "@/lib/appContext";
import { Tooltip } from "@/components/ui/tooltip";

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

function ChevronLeftIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggle, mounted } = useTheme();
  const isDark = mounted && theme === "dark";
  const { data: session, status } = useSession();
  const { logoutAndClearCache, runPurge, events, isComposerOpen, setIsComposerOpen, editingEventId, setEditingEventId } = useAppData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem("financeos_sidebar_collapsed");
    if (stored === "true") setIsCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("financeos_sidebar_collapsed", next.toString());
  };

  // Redirect to login if unauthenticated and not on a public route
  useEffect(() => {
    const isPublic = pathname === "/login" || pathname?.startsWith("/login") || pathname?.startsWith("/auth/resolve");
    if (status === "unauthenticated" && !isPublic) {
      router.push("/login");
    }
  }, [status, pathname, router]);

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
        className={`hidden md:flex flex-col fixed h-full z-20 border-r py-5 transition-all duration-300 ease-in-out select-none ${isCollapsed ? "w-20" : "w-56"}`}
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        {/* Collapse Toggle */}
        <Tooltip content={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"} placement="right">
          <button
            onClick={toggleCollapse}
            className="absolute -right-3 top-7 w-6 h-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white shadow-sm z-50 transition-transform"
          >
            {isCollapsed ? <ChevronRightIcon className="w-3.5 h-3.5"/> : <ChevronLeftIcon className="w-3.5 h-3.5" />}
          </button>
        </Tooltip>

        {/* Brand Logo */}
        <div className={`flex items-center mb-6 ${isCollapsed ? "justify-center px-0" : "justify-between px-3"}`}>
          <Tooltip content={isCollapsed ? "FinanceOS" : undefined} placement="right">
            <Link href="/" className={`flex items-center gap-2.5 group ${isCollapsed ? "justify-center" : ""}`}>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#635BFF] to-[#8079FF] flex items-center justify-center shadow-md shadow-[#635BFF]/25 group-hover:scale-105 transition-transform flex-shrink-0">
                <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 5v6M6 7h3.5a1.5 1.5 0 0 1 0 3H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm tracking-tight leading-none" style={{ color: "var(--foreground)" }}>
                    FinanceOS
                  </span>
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase mt-0.5 text-[#635BFF]">
                    Personal Space
                  </span>
                </div>
              )}
            </Link>
          </Tooltip>
        </div>

        {/* Main Navigation Items */}
        <div className="flex-1 overflow-y-auto space-y-5">
          <div>
            {!isCollapsed && (
              <p className="px-6 pb-2 text-[10px] font-extrabold tracking-wider uppercase text-muted-foreground/60">
                Main View
              </p>
            )}
            <nav className="flex flex-col space-y-1">
              {NAV_ITEMS.slice(0, 4).map((item) => {
                const isActive = item.href === "/" ? (pathname === "/" || pathname === "/dashboard") : pathname === item.href;
                return (
                  <Tooltip key={item.href} content={isCollapsed ? item.label : undefined} placement="right" className="w-full">
                    <Link
                      href={item.href}
                      className={`w-full flex items-center ${isCollapsed ? "justify-center" : "px-6"} py-2.5 text-xs font-semibold transition-all group ${
                        isActive
                          ? "bg-[#635BFF]/10 text-[#635BFF] border-l-[3px] border-[#635BFF]"
                          : "text-muted-foreground border-l-[3px] border-transparent hover:text-foreground hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className={`transition-transform group-hover:scale-110 flex-shrink-0 ${isActive ? "text-[#635BFF]" : ""}`}>
                        {item.icon}
                      </span>
                      {!isCollapsed && <span className="ml-3">{item.label}</span>}
                    </Link>
                  </Tooltip>
                );
              })}
            </nav>
          </div>

          <div>
            {!isCollapsed && (
              <p className="px-6 pb-2 text-[10px] font-extrabold tracking-wider uppercase text-muted-foreground/60">
                Data & Settings
              </p>
            )}
            <nav className="flex flex-col space-y-1">
              {NAV_ITEMS.slice(4).map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Tooltip key={item.href} content={isCollapsed ? item.label : undefined} placement="right" className="w-full">
                    <Link
                      href={item.href}
                      className={`w-full flex items-center ${isCollapsed ? "justify-center" : "px-6"} py-2.5 text-xs font-semibold transition-all group ${
                        isActive
                          ? "bg-[#635BFF]/10 text-[#635BFF] border-l-[3px] border-[#635BFF]"
                          : "text-muted-foreground border-l-[3px] border-transparent hover:text-foreground hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className={`transition-transform group-hover:scale-110 flex-shrink-0 ${isActive ? "text-[#635BFF]" : ""}`}>
                        {item.icon}
                      </span>
                      {!isCollapsed && <span className="ml-3">{item.label}</span>}
                    </Link>
                  </Tooltip>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Decluttered Streamlined Footer */}
        <div className={`mt-auto pt-3 border-t flex flex-col space-y-2 ${isCollapsed ? "" : "px-2"}`} style={{ borderColor: "var(--border)" }}>
          {/* Single clean Quick Help / Tour Trigger */}
          <Tooltip content={isCollapsed ? "Quick-Start Guide" : undefined} placement="right" className="w-full">
            <button
              onClick={() => {
                localStorage.setItem("financeos_show_quickstart_tour", "true");
                window.location.reload();
              }}
              type="button"
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-0" : "justify-between px-3"} py-2 rounded-xl text-xs font-semibold transition-all hover:bg-[#635BFF]/10 text-muted-foreground hover:text-[#635BFF] border border-transparent hover:border-[#635BFF]/20 group`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm">❓</span>
                {!isCollapsed && <span>Quick-Start Guide</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#635BFF]/10 text-[#635BFF] opacity-0 group-hover:opacity-100 transition-opacity">
                  Tour
                </span>
              )}
            </button>
          </Tooltip>

          {/* Theme switcher pill */}
          <Tooltip content={isCollapsed ? (isDark ? "Light Mode" : "Dark Mode") : undefined} placement="right" className="w-full">
            <button
              onClick={toggle}
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-0" : "justify-between px-3"} py-2 rounded-xl text-xs font-semibold transition-all border hover:border-[#635BFF]/40`}
              style={{ backgroundColor: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <div className="flex items-center gap-2.5">
                {isDark ? <SunIcon /> : <MoonIcon />}
                {!isCollapsed && <span>{isDark ? "Light Mode" : "Dark Mode"}</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-bold text-muted-foreground">
                  {isDark ? "☀️" : "🌙"}
                </span>
              )}
            </button>
          </Tooltip>

          {/* User Session Info */}
          {status === "authenticated" && session?.user ? (
            <Tooltip content={isCollapsed ? "View account preferences" : "View account preferences and data settings"} placement="right" className="w-full">
              <Link
                href="/settings"
                className={`w-full flex items-center ${isCollapsed ? "justify-center px-0" : "gap-2.5 px-3"} py-2 rounded-xl transition-all hover:bg-white/[0.04] group border border-transparent hover:border-border`}
              >
                <div className="w-7 h-7 rounded-full bg-[#635BFF]/20 border border-[#635BFF]/40 flex items-center justify-center flex-shrink-0 text-[#635BFF] font-bold text-[11px]">
                  {(() => {
                    const name = session.user.name || session.user.email || "";
                    if (!name || name === "Demo Account User") return "DA";
                    return name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
                  })()}
                </div>
                {!isCollapsed && (
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
                )}
              </Link>
            </Tooltip>
          ) : (
            <Tooltip content={isCollapsed ? "Sign In" : undefined} placement="right" className="w-full">
              <Link
                href="/login"
                className={`w-full flex items-center justify-center gap-2 ${isCollapsed ? "px-0" : "px-3"} py-2 rounded-xl text-xs font-bold bg-[#635BFF] text-white hover:opacity-90 active:scale-95 transition-all shadow-sm`}
              >
                {isCollapsed ? "In" : "Sign In"}
              </Link>
            </Tooltip>
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
                <div className="flex items-center gap-2">
                  <Link
                    href="/settings"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all hover:bg-white/[0.04] group border border-transparent hover:border-border"
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
                  <button
                    onClick={async () => {
                      setMobileOpen(false);
                      await logoutAndClearCache();
                      signOut({ callbackUrl: "/login" });
                    }}
                    className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    title="Sign out"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-[#635BFF] text-white active:scale-95 shadow-sm transition-all"
                >
                  Sign In
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <main className={`flex-1 min-h-screen w-full flex flex-col transition-all duration-300 ease-in-out ${isClient ? (isCollapsed ? "md:ml-20" : "md:ml-56") : "md:ml-56"}`}>
        <TopHeader />
        <div className="w-full px-4 sm:px-6 py-8 mt-14 md:mt-0 flex-1">
          <OnboardingBanner />
          <CommandCenterTourModal />
          {children}
        </div>
      </main>

      {/* ── Global Modals ── */}
      {isComposerOpen && (
        <EventComposer onClose={() => setIsComposerOpen(false)} />
      )}
      {editingEventId && (
        <EventEditModal
          event={events.find(e => e.id === editingEventId) as any}
          onClose={() => setEditingEventId(null)}
        />
      )}
    </div>
  );
}
