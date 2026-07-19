"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAppData } from "@/lib/appContext";
import { logger } from "@/lib/logger";
import { useSession, signOut } from "next-auth/react";
import { User, LogOut, Settings, CheckCircle2, Search, Plus, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { generateBudgetReport } from "@/domain/financeEngine/engine";

function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(kobo / 100);
}

export function TopHeader() {
  const { syncToSupabase, isSyncing, rejectedSyncCount, events, accounts, budgets, activeCycleId, setIsComposerOpen, setEditingEventId } = useAppData();
  const [syncFailed, setSyncFailed] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const { data: session } = useSession();
  const pathname = usePathname();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── 1. Global Search State ──
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return { events: [], accounts: [] };
    const q = debouncedQuery.toLowerCase();
    
    const matchedEvents = events
      .filter(e => !e.deleted_at && (
        (e.description || "").toLowerCase().includes(q) ||
        (e.category || "").toLowerCase().includes(q) ||
        (e.payload?.debtorName || "").toLowerCase().includes(q)
      ))
      .slice(0, 5);
      
    const matchedAccounts = accounts
      .filter(a => !a.deleted_at && (a.name || "").toLowerCase().includes(q))
      .slice(0, 3);

    return { events: matchedEvents, accounts: matchedAccounts };
  }, [debouncedQuery, events, accounts]);

  useEffect(() => {
    const handleClickOutsideSearch = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideSearch);
    return () => document.removeEventListener("mousedown", handleClickOutsideSearch);
  }, []);

  // ── 3. Notifications Bell State ──
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const notifications = useMemo(() => {
    const alerts: { id: string; title: string; description: string; type: "error" | "warning" }[] = [];
    
    if (rejectedSyncCount > 0) {
      alerts.push({
        id: "sync-fail",
        title: "Sync Error",
        description: `${rejectedSyncCount} changes couldn't be saved to the cloud.`,
        type: "error"
      });
    }

    const budgetReport = generateBudgetReport(events as any, activeCycleId, budgets as any);
    budgetReport.items.forEach(item => {
      if (item.spent > item.planned && item.planned > 0) {
        const overspend = item.spent - item.planned;
        alerts.push({
          id: `budget-${item.category}`,
          title: "Budget Exceeded",
          description: `${item.category} budget exceeded by ${formatNaira(overspend)}.`,
          type: "warning"
        });
      }
    });

    return alerts;
  }, [rejectedSyncCount, events, activeCycleId, budgets]);

  useEffect(() => {
    const handleClickOutsideNotif = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideNotif);
    return () => document.removeEventListener("mousedown", handleClickOutsideNotif);
  }, []);

  // ── 4. Breadcrumb Mapping ──
  const getBreadcrumb = () => {
    if (pathname === "/") return "Overview";
    if (pathname.startsWith("/activity")) return "Activity";
    if (pathname.startsWith("/accounts")) return "Accounts";
    if (pathname.startsWith("/budgets")) return "Budgets";
    if (pathname.startsWith("/settings")) return "Settings";
    if (pathname.startsWith("/backup")) return "Backup & Export";
    return "Dashboard";
  };
  const pageName = getBreadcrumb();

  // Expose manual sync for user action and tests
  const handleSync = async () => {
    try {
      const result = await syncToSupabase();
      if (result.success) {
        setSyncFailed(false);
      } else if (result.errorType === 'NETWORK_ERROR') {
        logger.warn("Manual sync failed", { error: result.message });
        setSyncFailed(true);
      } else if (result.errorType === 'SERVER_REJECTION') {
        logger.warn("Manual sync rejected by server", { error: result.message });
      }
    } catch (err: any) {
      logger.error("Manual sync crashed", { error: err.message });
      setSyncFailed(true);
    }
  };

  useEffect(() => {
    setIsOnline(typeof window !== "undefined" ? window.navigator.onLine : true);

    const handleOnline = async () => {
      setIsOnline(true);
      try {
        const result = await syncToSupabase();
        if (result.success) {
          setSyncFailed(false);
        } else if (result.errorType === 'NETWORK_ERROR') {
          logger.warn("Background sync after online recovery failed", { error: result.message });
          setSyncFailed(true);
        } else if (result.errorType === 'SERVER_REJECTION') {
          logger.warn("Background sync after online recovery rejected by server", { error: result.message });
        }
      } catch (err: any) {
        logger.error("Background sync after online recovery crashed", { error: err.message });
        setSyncFailed(true);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncFailed(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncToSupabase]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = () => {
    const name = session?.user?.name;
    if (!name) return null;
    const parts = name.split(" ").filter(Boolean);
    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials();

  return (
    <header className="sticky top-0 z-30 w-full py-3 bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 backdrop-blur-md transition-all shadow-sm px-4 sm:px-6">
      
      {/* ── 4. Breadcrumb ── */}
      <div className="flex items-center gap-2 font-bold text-lg tracking-tight text-zinc-900 dark:text-white hidden sm:block">
        {pageName}
      </div>

      {/* ── 1. Global Search ── */}
      <div className="flex-1 max-w-md mx-auto relative" ref={searchRef}>
        <div className="relative flex items-center w-full">
          <Search className="absolute left-3 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search transactions, accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            className="w-full pl-9 pr-4 py-1.5 text-sm rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-transparent focus:bg-white dark:focus:bg-zinc-900 focus:border-[#635BFF]/40 focus:ring-2 focus:ring-[#635BFF]/20 transition-all outline-none"
          />
        </div>
        
        {/* Search Results Dropdown */}
        {isSearchFocused && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-xl py-2 overflow-hidden z-50">
            {!searchQuery.trim() ? (
              <p className="text-xs text-center py-4 text-zinc-500">Start typing to search your finances...</p>
            ) : searchResults.events.length === 0 && searchResults.accounts.length === 0 ? (
              <p className="text-xs text-center py-4 text-zinc-500">No results found.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {searchResults.accounts.length > 0 && (
                  <div className="mb-2">
                    <p className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Accounts</p>
                    {searchResults.accounts.map(acc => (
                      <Link 
                        key={acc.id} 
                        href="/accounts" 
                        onClick={() => { setIsSearchFocused(false); setSearchQuery(""); }}
                        className="flex items-center justify-between px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                      >
                        <span className="text-sm font-semibold">{acc.name}</span>
                        <span className="text-xs text-zinc-500">{formatNaira(acc.balance || 0)}</span>
                      </Link>
                    ))}
                  </div>
                )}
                {searchResults.events.length > 0 && (
                  <div>
                    <p className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Transactions</p>
                    {searchResults.events.map(ev => (
                      <div 
                        key={ev.id} 
                        onClick={() => { setIsSearchFocused(false); setSearchQuery(""); setEditingEventId(ev.id); }}
                        className="flex items-center justify-between px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold truncate max-w-[200px]">{ev.description || "Unnamed"}</span>
                          <span className="text-[10px] text-zinc-500">{new Date(ev.timestamp).toLocaleDateString()} &bull; {ev.category}</span>
                        </div>
                        <span className="text-sm font-bold">{formatNaira(ev.amount || 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Right-Side Actions ── */}
      <div className="flex items-center gap-3 sm:gap-4">
        
        {/* ── 2. Quick-add Transaction ── */}
        <button
          onClick={() => setIsComposerOpen(true)}
          className="h-8 w-8 sm:w-auto sm:px-3 rounded-full sm:rounded-xl bg-[#635BFF] text-white flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#635BFF]/90 transition-all focus:ring-2 focus:ring-[#635BFF]/50"
        >
          <Plus className="w-4 h-4" />
          <span className="text-xs font-bold hidden sm:block">Add</span>
        </button>

        {/* ── 3. Notifications Bell ── */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <Bell className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-zinc-950">
                {notifications.length}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl py-2 z-50 overflow-hidden">
              <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
                <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Notifications</p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-center py-6 text-zinc-500">You're all caught up!</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="px-4 py-3 border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <p className={`text-xs font-bold mb-0.5 ${n.type === "error" ? "text-rose-500" : "text-amber-500"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {n.description}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sync Status Indicators */}
        <div className="flex items-center gap-2">
          {syncFailed ? (
            <button onClick={handleSync} disabled={isSyncing} className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-bold uppercase tracking-wider transition-all duration-300" aria-label="Sync">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              Sync Failed
            </button>
          ) : rejectedSyncCount > 0 ? (
            <button onClick={handleSync} disabled={isSyncing} className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-wider transition-all duration-300" aria-label="Sync">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {rejectedSyncCount} failed
            </button>
          ) : isSyncing ? (
            <button disabled className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-zinc-500 dark:text-zinc-400 text-xs font-medium" aria-label="Syncing">
               <div className="w-3.5 h-3.5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
            </button>
          ) : (
            <button onClick={handleSync} className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors" aria-label="Sync">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center text-sm font-semibold shadow-inner hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#635BFF] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
          >
            {initials ? initials : <User className="w-5 h-5 text-white/90" />}
          </button>
          
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg py-1 z-50 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
                  {session?.user?.email || "Signed in"}
                </p>
                <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                  {session?.user?.name || "User"}
                </p>
              </div>
              <Link href="/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors w-full text-left">
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <button onClick={() => { setDropdownOpen(false); signOut(); }} className="flex items-center gap-2 px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors w-full text-left">
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}