"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  saveEventsToLocalDb,
  getEventsFromLocalDb,
  saveAccountsToLocalDb,
  getAccountsFromLocalDb,
  saveBudgetsToLocalDb,
  getBudgetsFromLocalDb,
  clearLocalDb,
} from "@/infrastructure/local-db/db";
import { reconcileAccount, generateBudgetReport } from "@/domain/financeEngine/engine";
import { FinancialEvent } from "@/domain/entities/types";

export interface EventRecord {
  id: string;
  type: string;
  amount: number;
  category: string;
  timestamp: string;
  accountName: string;
  description?: string;
  eventId?: string;
  eventType?: string;
  budgetCycleId?: string;
  payload?: any;
  updated_at?: string;
  deleted_at?: string;
}

export interface AccountRecord {
  id: string;
  name: string;
  type: string;
  balance: number;
  openingBalance?: number;
  institution?: string;
  status?: string;
  currency?: string;
  isActive?: boolean;
  updated_at?: string;
  deleted_at?: string;
}

export interface BudgetRecord {
  id: string;
  category: string;
  planned: number;
  spent: number;
  name?: string;
  cycleId?: string;
  type?: string;
  budgetCycleId?: string;
  updated_at?: string;
  deleted_at?: string;
}

interface AppContextType {
  spreadsheetId: string;
  setSpreadsheetId: (id: string) => void;
  syncProvider: "supabase" | "google-sheets";
  setSyncProvider: (provider: "supabase" | "google-sheets") => void;
  supabaseCreds: { url: string; key: string };
  setSupabaseCreds: (url: string, key: string) => Promise<boolean>;
  syncToSupabase: () => Promise<{ success: boolean; message: string; counts?: any; errorType?: 'NETWORK_ERROR' | 'SERVER_REJECTION' }>;
  isConnected: boolean;
  isSyncing: boolean;
  rejectedSyncCount: number;
  activeCycleId: string;
  setActiveCycleId: (cycle: string) => void;
  availableCycles: string[];
  events: EventRecord[];
  accounts: AccountRecord[];
  budgets: BudgetRecord[];
  recordEvent: (event: Omit<EventRecord, "id" | "timestamp">) => Promise<boolean>;
  updateEvent: (id: string, updatedFields: Partial<EventRecord>) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;
  addAccount: (account: Omit<AccountRecord, "id">) => Promise<boolean>;
  updateAccount: (id: string, updatedFields: Partial<AccountRecord>) => Promise<boolean>;
  deleteAccount: (id: string) => Promise<boolean>;
  addBudget: (budget: Omit<BudgetRecord, "id">) => Promise<boolean>;
  deleteBudget: (id: string) => Promise<boolean>;
  initSpreadsheet: (id: string) => Promise<{ success: boolean; message: string; title?: string }>;
  runSpooler: () => Promise<{ success: boolean; message: string; count?: number; diagnostic?: any }>;
  runPurge: (target?: "local" | "sample" | "events" | "accounts" | "budgets" | "all") => Promise<{ success: boolean; message: string }>;
  refreshData: () => Promise<any>;
  forceCloneToSheet: (targetSpreadsheetId?: string) => Promise<{ success: boolean; expired?: boolean; message: string }>;
  importCsvData: (newEvents: EventRecord[]) => Promise<{ success: boolean; count?: number; error?: string }>;
  batchSetupWorkspace: (args: { newAccounts: Omit<AccountRecord, "id">[]; newBudgets: Omit<BudgetRecord, "id">[] }) => Promise<boolean>;
  logoutAndClearCache: () => Promise<void>;
}

const AVAILABLE_CYCLES = ["Jul-26", "Aug-26", "Sep-26", "Oct-26", "Nov-26", "Dec-26", "Jan-27"];

import { BASELINE_EVENTS, BASELINE_ACCOUNTS, BASELINE_BUDGETS } from "@/lib/baselineData";
const INITIAL_ACCOUNTS: AccountRecord[] = BASELINE_ACCOUNTS as AccountRecord[];
const INITIAL_EVENTS: EventRecord[] = BASELINE_EVENTS as EventRecord[];
const INITIAL_BUDGETS: BudgetRecord[] = BASELINE_BUDGETS as BudgetRecord[];

function reconcileAllState(
  eventList: EventRecord[],
  accountList: AccountRecord[],
  budgetList: BudgetRecord[],
  cycleId: string = "Jul-26"
): { reconciledAccounts: AccountRecord[]; reconciledBudgets: BudgetRecord[] } {
  const activeEvents = eventList.filter(e => !e.deleted_at);
  const activeAccounts = accountList.filter(a => !a.deleted_at);

  // 1. Reconcile Accounts against immutable opening balances
  const reconciledAccounts = activeAccounts.map((acc) => {
    const cleanId = String(acc.id || "").toLowerCase().replace(/^acc-/, "").trim();
    const cleanName = String(acc.name || "").toLowerCase().trim();

    const baselineMatch = INITIAL_ACCOUNTS.find((b) => {
      const bId = String(b.id || "").toLowerCase().replace(/^acc-/, "").trim();
      const bName = String(b.name || "").toLowerCase().trim();
      return (cleanId && bId === cleanId) || (cleanName && bName === cleanName);
    });

    const isRealOrCustom = String(acc.id || "").startsWith("acc-") || (acc as any).isCustomBaseline === true;
    const rawOpeningBal = Number(
      (!isRealOrCustom && baselineMatch && baselineMatch.openingBalance !== undefined)
        ? baselineMatch.openingBalance
        : (acc.openingBalance !== undefined ? acc.openingBalance : (acc.balance ?? 0))
    );
    const fixedOpeningBal = Math.abs(rawOpeningBal % 1) > 0.001 ? Math.round(rawOpeningBal * 100) : rawOpeningBal;

    const accWithAnchor = { ...acc, openingBalance: fixedOpeningBal, isCustomBaseline: (acc as any).isCustomBaseline || isRealOrCustom };
    const liveBal = reconcileAccount(activeEvents as any, accWithAnchor as any);
    return { ...accWithAnchor, balance: liveBal };
  });

  // 2. Reconcile Budgets (spent vs planned for the active cycle)
  const activeBudgets = budgetList.filter(b => !b.deleted_at);
  const budgetReport = generateBudgetReport(
    activeEvents as any,
    cycleId,
    activeBudgets.map((b) => ({ category: b.category || b.name, planned: b.planned }))
  );
  const reconciledBudgets = activeBudgets.map((b) => {
    const item = budgetReport.items.find(
      (i) => i.category.toLowerCase() === (b.category || b.name).toLowerCase()
    );
    return { ...b, spent: item ? item.spent : 0 };
  });

  return { reconciledAccounts, reconciledBudgets };
}

const AppContext = createContext<AppContextType | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [spreadsheetId, setSpreadsheetIdState] = useState<string>("");
  const [events, setEvents] = useState<EventRecord[]>(INITIAL_EVENTS);
  const [accounts, setAccounts] = useState<AccountRecord[]>(INITIAL_ACCOUNTS);
  const [budgets, setBudgets] = useState<BudgetRecord[]>(INITIAL_BUDGETS);
  const accountsRef = useRef<AccountRecord[]>(INITIAL_ACCOUNTS);
  const budgetsRef = useRef<BudgetRecord[]>(INITIAL_BUDGETS);
  const eventsRef = useRef<EventRecord[]>(INITIAL_EVENTS);

  useEffect(() => { accountsRef.current = accounts; }, [accounts]);
  useEffect(() => { budgetsRef.current = budgets; }, [budgets]);
  useEffect(() => { eventsRef.current = events; }, [events]);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [rejectedSyncCount, setRejectedSyncCount] = useState<number>(0);
  const [activeCycleId, setActiveCycleIdState] = useState<string>("Jul-26");

  const handleSyncAfterMutation = () => {
    syncToSupabase().then(res => {
      if (!res.success && res.errorType === "SERVER_REJECTION") {
        setRejectedSyncCount(c => c + 1);
      }
    }).catch(e => console.error("Supabase sync warning:", e));
  };

  const [syncProvider, setSyncProviderState] = useState<"supabase" | "google-sheets">("supabase");
  const [supabaseCreds, setSupabaseCredsState] = useState<{ url: string; key: string }>({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  });

  const setSyncProvider = (provider: "supabase" | "google-sheets") => {
    setSyncProviderState(provider);
    localStorage.setItem("financeos_sync_provider", provider);
  };

  const setSupabaseCreds = async (url: string, key: string): Promise<boolean> => {
    const cleanUrl = url.trim();
    const cleanKey = key.trim();
    setSupabaseCredsState({ url: cleanUrl, key: cleanKey });
    localStorage.setItem("financeos_supabase_url", cleanUrl);
    localStorage.setItem("financeos_supabase_key", cleanKey);
    return true;
  };

  useEffect(() => {
    const savedCycle = localStorage.getItem("financeos_active_cycle");
    if (savedCycle) setActiveCycleIdState(savedCycle);

    const savedProvider = localStorage.getItem("financeos_sync_provider") as any;
    if (savedProvider === "supabase" || savedProvider === "google-sheets") {
      setSyncProviderState(savedProvider);
    }
    const savedUrl = localStorage.getItem("financeos_supabase_url") || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const savedKey = localStorage.getItem("financeos_supabase_key") || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (savedUrl || savedKey) {
      setSupabaseCredsState({ url: savedUrl, key: savedKey });
    }
  }, []);

  const setActiveCycleId = (cycle: string) => {
    setActiveCycleIdState(cycle);
    localStorage.setItem("financeos_active_cycle", cycle);
    const { reconciledAccounts, reconciledBudgets } = reconcileAllState(
      events,
      accounts,
      budgets,
      cycle
    );
    setAccounts(reconciledAccounts);
    setBudgets(reconciledBudgets);
    try { saveAccountsToLocalDb(reconciledAccounts as any); } catch (_) {}
    try { saveBudgetsToLocalDb(reconciledBudgets as any); } catch (_) {}
  };

  // Boot Cloud Read-Through Cache (< 10ms) & Trigger Cloud Revalidation
  const BASELINE_VERSION = `v6-cloud-primary-${INITIAL_EVENTS.length}-${INITIAL_ACCOUNTS.length}`;

  useEffect(() => {
    async function loadReadThroughCacheAndRevalidate() {
      try {
        const isRealUserOrCloud = status === "authenticated" || localStorage.getItem("financeos_practice_mode") === "false" || (localStorage.getItem("financeos_onboarding_completed") === "true" && localStorage.getItem("financeos_practice_mode") !== "true");
        const defaultEvents = isRealUserOrCloud ? [] : INITIAL_EVENTS;
        const defaultAccounts = isRealUserOrCloud ? [] : INITIAL_ACCOUNTS;
        const defaultBudgets = isRealUserOrCloud ? [] : INITIAL_BUDGETS;

        const cachedVersion = localStorage.getItem("financeos_baseline_version");
        if (cachedVersion !== BASELINE_VERSION) {
          try { await clearLocalDb(); } catch (_) {}
          localStorage.removeItem("financeos_local_events");
          localStorage.removeItem("financeos_local_accounts");
          localStorage.removeItem("financeos_local_budgets");
          localStorage.setItem("financeos_baseline_version", BASELINE_VERSION);
        }

        const [localEvents, localAccounts, localBudgets] = await Promise.all([
          getEventsFromLocalDb(),
          getAccountsFromLocalDb(),
          getBudgetsFromLocalDb(),
        ]);

        const eventsToUse = (localEvents && localEvents.length > 0)
          ? localEvents.map((e) => ({
              id: e.eventId || e.id || crypto.randomUUID(),
              eventId: e.eventId || e.id,
              type: e.eventType || e.type || "EXPENSE_RECORDED",
              eventType: e.eventType || e.type || "ExpenseRecorded",
              amount: e.amount || 0,
              category: e.category || "General",
              timestamp: e.timestamp || new Date().toISOString(),
              accountName: (e as any).accountName || e.accountId || "Zenith",
              description: e.description || "",
              budgetCycleId: e.budgetCycleId || "Jul-26",
              payload: e.payload || {},
            }))
          : defaultEvents;

        let accountsToUse = (localAccounts && localAccounts.length > 0)
          ? localAccounts.map((a) => ({
              ...a,
              id: a.id,
              name: a.name || a.id,
              type: a.type || "Bank",
              balance: a.balance || 0,
            }))
          : defaultAccounts;

        let budgetsToUse = (localBudgets && localBudgets.length > 0)
          ? localBudgets.map((b) => ({
              ...b,
              id: b.id,
              name: b.name || b.category || "Budget",
              planned: b.planned || 0,
              spent: b.spent || 0,
            }))
          : defaultBudgets;

        const cycleToUse = localStorage.getItem("financeos_active_cycle") || "Jul-26";
        const { reconciledAccounts, reconciledBudgets } = reconcileAllState(
          eventsToUse,
          accountsToUse,
          budgetsToUse,
          cycleToUse
        );

        setEvents(eventsToUse);
        setAccounts(reconciledAccounts);
        setBudgets(reconciledBudgets);

        // Silently revalidate against live Cloud PostgreSQL master SoT
        if (status === "authenticated" || (supabaseCreds.url && supabaseCreds.key)) {
          refreshData().catch((e) => console.error("Cloud background revalidation error:", e));
        }
      } catch (err) {
        console.error("Read-through cache error during boot:", err);
      }
    }

    loadReadThroughCacheAndRevalidate();
  }, [status, supabaseCreds.url, supabaseCreds.key]);

  const saveLocalEvents = async (list: EventRecord[]) => {
    try {
      localStorage.setItem("financeos_local_events", JSON.stringify(list));
      const normalizedForDb: FinancialEvent[] = list.map((e) => ({
        eventId: e.eventId || e.id || crypto.randomUUID(),
        id: e.eventId || e.id || crypto.randomUUID(),
        timestamp: e.timestamp || new Date().toISOString(),
        eventType: (e.eventType || e.type || "ExpenseRecorded") as any,
        type: (e.eventType || e.type || "ExpenseRecorded") as any,
        budgetCycleId: e.budgetCycleId || "Jul-26",
        accountId: e.accountName || "Account",
        amount: e.amount || 0,
        category: e.category || "General",
        description: e.description || "",
        payload: e.payload || { amount: e.amount, category: e.category, description: e.description },
      }));
      await saveEventsToLocalDb(normalizedForDb);
    } catch (_) {}
  };

  const saveLocalAccounts = async (list: AccountRecord[]) => {
    try {
      localStorage.setItem("financeos_local_accounts", JSON.stringify(list));
      await saveAccountsToLocalDb(list as any);
    } catch (_) {}
  };

  const saveLocalBudgets = async (list: BudgetRecord[]) => {
    try {
      localStorage.setItem("financeos_local_budgets", JSON.stringify(list));
      await saveBudgetsToLocalDb(list as any);
    } catch (_) {}
  };

  const setSpreadsheetId = (id: string) => {
    setSpreadsheetIdState(id);
  };

  const isConnected = status === "authenticated" || !!(supabaseCreds.url && supabaseCreds.key);

  const syncToSupabase = async () => {
    if (status !== "authenticated" && (!supabaseCreds.url || !supabaseCreds.key)) {
      return { success: false, message: "Authentication session required for data persistence." };
    }
    if (typeof window !== "undefined" && localStorage.getItem("financeos_practice_mode") === "true") {
      return { success: false, message: "Workspace is currently in practice mode with sample data. To protect your real records, syncing is disabled until you reset workspace or enter your real accounts." };
    }
    const isDemoState = events === INITIAL_EVENTS || (events.length > 0 && events.some(e => String(e.id || "").startsWith("demo-") || String(e.id || "").startsWith("tx-00")));
    if (isDemoState && typeof window !== "undefined" && localStorage.getItem("financeos_practice_mode") !== "false") {
      console.log("Protected cloud database: blocked syncing demo/initial baseline entries into real finance_events table.");
      return { success: false, message: "Protected real data records from being overwritten by initial demo baseline data." };
    }
    setIsSyncing(true);
    try {
      const res = await fetch("/api/supabase/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: supabaseCreds.url || "",
          key: supabaseCreds.key || "",
          events: events.map((e) => ({
            ...e,
            payload: {
              ...(e.payload || {}),
              fromAccountId: e.payload?.fromAccountId || e.accountName || "",
            },
          })),
          accounts: accounts.map((a) => ({
            ...a,
            openingBalance: a.openingBalance !== undefined ? a.openingBalance : a.balance,
          })),
          budgets: budgets.map((b) => ({
            ...b,
            budgetCycleId: (b as any).budgetCycleId || b.cycleId || "Jul-26",
            limitAmount: (b as any).limitAmount || b.planned || 0,
            spentAmount: (b as any).spentAmount || b.spent || 0,
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          message: `Successfully synchronized ${events.length} events, ${accounts.length} accounts, and ${budgets.length} budgets.`,
          counts: data.counts,
        };
      }
      const errText = await res.text();
      return { success: false, message: `Failed to sync records: ${errText}`, errorType: "SERVER_REJECTION" };
    } catch (err: any) {
      console.error("syncToSupabase error:", err);
      return { success: false, message: `Network error saving records: ${err.message}`, errorType: "NETWORK_ERROR" };
    } finally {
      setIsSyncing(false);
    }
  };

  const refreshData = async () => {
    if (status !== "authenticated" && (!supabaseCreds.url || !supabaseCreds.key)) {
      return { success: false, hasData: false, eventsCount: 0, accountsCount: 0 };
    }
    setIsSyncing(true);
    try {
      const queryParams = (supabaseCreds.url && supabaseCreds.key)
        ? `?url=${encodeURIComponent(supabaseCreds.url)}&key=${encodeURIComponent(supabaseCreds.key)}`
        : "";
      const res = await fetch(`/api/supabase/sync${queryParams}`);
      if (res.ok) {
        const data = await res.json();

        const rawEvents = (data.events && data.events.length > 0) ? data.events : [];
        const normalizedEvents: EventRecord[] = rawEvents.map((e: any) => ({
          id: e.eventId || e.id || crypto.randomUUID(),
          eventId: e.eventId || e.id,
          type: e.eventType || e.type || "EXPENSE_RECORDED",
          eventType: e.eventType || e.type || "EXPENSE_RECORDED",
          amount: Number(e.amount || 0),
          category: e.category || e.payload?.category || "General",
          timestamp: e.timestamp || new Date().toISOString(),
          accountName: e.accountName || e.accountId || e.payload?.fromAccountId || "Zenith",
          description: e.description || e.payload?.description || "",
          budgetCycleId: e.budgetCycleId || "Jul-26",
          payload: e.payload || {},
        }));

        const isMultiTenantUser = data.userId && data.userId !== "default_user" && data.userId !== "guest_demo_user";
        const eventsToUse = normalizedEvents.length > 0 ? normalizedEvents : (isMultiTenantUser ? [] : (events.length > 0 ? events : INITIAL_EVENTS));
        const baseAccounts = (data.accounts && data.accounts.length > 0) ? data.accounts : (isMultiTenantUser ? [] : (accounts.length > 0 ? accounts : INITIAL_ACCOUNTS));
        const baseBudgets = (data.budgets && data.budgets.length > 0) ? data.budgets : (isMultiTenantUser ? [] : (budgets.length > 0 ? budgets : INITIAL_BUDGETS));

        const hasRemoteData = normalizedEvents.length > 0 || (data.accounts && data.accounts.length > 0);
        if (hasRemoteData) {
          localStorage.setItem("financeos_onboarding_completed", "true");
        }

        if (normalizedEvents.length > 0) {
          await saveEventsToLocalDb(normalizedEvents as any);
        }

        const { reconciledAccounts, reconciledBudgets } = reconcileAllState(
          eventsToUse,
          baseAccounts,
          baseBudgets,
          activeCycleId
        );

        eventsRef.current = eventsToUse;
        accountsRef.current = reconciledAccounts;
        budgetsRef.current = reconciledBudgets;
        setEvents(eventsToUse);
        setAccounts(reconciledAccounts);
        setBudgets(reconciledBudgets);
        try { await saveAccountsToLocalDb(reconciledAccounts as any); } catch (_) {}
        try { await saveBudgetsToLocalDb(reconciledBudgets as any); } catch (_) {}

        return {
          success: true,
          hasData: hasRemoteData,
          eventsCount: normalizedEvents.length,
          accountsCount: baseAccounts.length,
        };
      }
      return { success: false, hasData: false, eventsCount: 0, accountsCount: 0 };
    } catch (e) {
      console.error("Failed to refresh remote data from Supabase:", e);
      return { success: false, hasData: false, eventsCount: 0, accountsCount: 0 };
    } finally {
      setIsSyncing(false);
    }
  };

  const initSpreadsheet = async (id: string) => {
    return { success: false, message: "Spreadsheet sync is deprecated. Local data store is active." };
  };

  const forceCloneToSheet = async (targetId?: string) => {
    return { success: false, message: "Spreadsheet sync is deprecated. Local data store is active." };
  };

  useEffect(() => {
    if (isConnected) {
      refreshData().catch((e) => console.error("Auto-refresh from Supabase on connect:", e));
    }
  }, [isConnected, supabaseCreds.url, supabaseCreds.key]);

  useEffect(() => {
    async function checkUserSwitch() {
      if (status === "loading") return;
      if (status === "authenticated") {
        if (typeof window !== "undefined") localStorage.removeItem("financeos_logged_out");
      }
      // If offline or network ping failed, never assume user switched to guest demo unless explicitly logged out
      const isExplicitlyLoggedOut = typeof window !== "undefined" && localStorage.getItem("financeos_logged_out") === "true";
      if (!session?.user?.email && status !== "authenticated" && !isExplicitlyLoggedOut) {
        return;
      }

      const currentUserId = session?.user?.email || (status === "authenticated" ? "authenticated_user" : "guest_demo_user");
      const lastUserId = localStorage.getItem("financeos_last_logged_in_user");

      if (lastUserId && lastUserId !== currentUserId) {
        console.log(`User switch detected (${lastUserId} -> ${currentUserId}). Clearing Dexie local database for total privacy.`);
        try { await clearLocalDb(); } catch (_) {}
        localStorage.removeItem("financeos_local_events");
        localStorage.removeItem("financeos_local_accounts");
        localStorage.removeItem("financeos_local_budgets");
        localStorage.removeItem("financeos_onboarding_completed");
        localStorage.setItem("financeos_last_logged_in_user", currentUserId);

        if (status === "authenticated") {
          setEvents([]);
          setAccounts([]);
          setBudgets([]);
          await refreshData();
        } else {
          const { reconciledAccounts, reconciledBudgets } = reconcileAllState(
            INITIAL_EVENTS,
            INITIAL_ACCOUNTS,
            INITIAL_BUDGETS,
            activeCycleId
          );
          setEvents(INITIAL_EVENTS);
          setAccounts(reconciledAccounts);
          setBudgets(reconciledBudgets);
          try { await saveEventsToLocalDb(INITIAL_EVENTS as any); } catch (_) {}
          try { await saveAccountsToLocalDb(reconciledAccounts as any); } catch (_) {}
          try { await saveBudgetsToLocalDb(reconciledBudgets as any); } catch (_) {}
        }
      } else if (!lastUserId) {
        localStorage.setItem("financeos_last_logged_in_user", currentUserId);
      }
    }
    checkUserSwitch();
  }, [session?.user?.email, status]);

  const logoutAndClearCache = async () => {
    setIsSyncing(true);
    try {
      await clearLocalDb();
      localStorage.removeItem("financeos_local_events");
      localStorage.removeItem("financeos_local_accounts");
      localStorage.removeItem("financeos_local_budgets");
      localStorage.removeItem("financeos_onboarding_completed");
      localStorage.removeItem("financeos_last_logged_in_user");
      localStorage.setItem("financeos_logged_out", "true");
      setEvents(INITIAL_EVENTS);
      setAccounts(INITIAL_ACCOUNTS);
      setBudgets(INITIAL_BUDGETS);
    } catch (e) {
      console.error("Error clearing local cache during logout:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const runSpooler = async () => {
    await refreshData();
    return { success: true, message: "Synced data records directly." };
  };

  const runPurge = async (target: "local" | "sample" | "events" | "accounts" | "budgets" | "all" = "events") => {
    setIsSyncing(true);
    try {
      if (target === "sample") {
        let sampleEvents: EventRecord[] = INITIAL_EVENTS;
        let sampleAccounts: AccountRecord[] = INITIAL_ACCOUNTS;
        let sampleBudgets: BudgetRecord[] = INITIAL_BUDGETS;

        if (isConnected) {
          try {
            const res = await fetch(`/api/demo/seed?url=${encodeURIComponent(supabaseCreds.url)}&key=${encodeURIComponent(supabaseCreds.key)}`);
            if (res.ok) {
              const remoteDemo = await res.json();
              if (remoteDemo.events && remoteDemo.events.length > 0) {
                sampleEvents = remoteDemo.events;
                sampleAccounts = remoteDemo.accounts || sampleAccounts;
                sampleBudgets = remoteDemo.budgets || sampleBudgets;
                console.log("Loaded live demo baseline from dedicated Supabase tables (`finance_demo_*`).");
              }
            }
          } catch (err) {
            console.warn("Could not fetch dedicated demo tables from Supabase, falling back to local baseline:", err);
          }
        }

        const { reconciledAccounts, reconciledBudgets } = reconcileAllState(
          sampleEvents,
          sampleAccounts,
          sampleBudgets,
          activeCycleId
        );
        eventsRef.current = sampleEvents;
        accountsRef.current = reconciledAccounts;
        budgetsRef.current = reconciledBudgets;
        setEvents(sampleEvents);
        setAccounts(reconciledAccounts);
        setBudgets(reconciledBudgets);
        await saveEventsToLocalDb(sampleEvents as any);
        await saveAccountsToLocalDb(reconciledAccounts as any);
        await saveBudgetsToLocalDb(reconciledBudgets as any);
        localStorage.setItem("financeos_practice_mode", "true");
        return { success: true, message: "Loaded practice sample data cleanly." };
      }

      if (target === "local") {
        await saveEventsToLocalDb([]);
        await saveAccountsToLocalDb([]);
        await saveBudgetsToLocalDb([]);
        localStorage.removeItem("financeos_local_events");
        localStorage.removeItem("financeos_practice_mode");
        return { success: true, message: "Purged local cache cleanly." };
      }

      await saveEventsToLocalDb([]);
      localStorage.removeItem("financeos_local_events");
      localStorage.removeItem("financeos_practice_mode");
      const { reconciledAccounts, reconciledBudgets } = reconcileAllState([], accounts, budgets, activeCycleId);
      setEvents([]);
      setAccounts(reconciledAccounts);
      setBudgets(reconciledBudgets);
      await saveAccountsToLocalDb(reconciledAccounts as any);
      await saveBudgetsToLocalDb(reconciledBudgets as any);

      if (isConnected && (target === "all" || target === "events")) {
        await fetch("/api/events/sync", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventIds: events.map((e) => e.id) }),
        });
      }
      return { success: true, message: "Purged workspace and synced with Supabase." };
    } finally {
      setIsSyncing(false);
    }
  };

  const importCsvData = async (newEvents: EventRecord[]) => {
    setIsSyncing(true);
    try {
      const combinedEvents = [...newEvents, ...events];
      setEvents(combinedEvents);
      await saveLocalEvents(combinedEvents);

      const { reconciledAccounts, reconciledBudgets } = reconcileAllState(
        combinedEvents,
        accounts,
        budgets,
        activeCycleId
      );
      setAccounts(reconciledAccounts);
      setBudgets(reconciledBudgets);
      await saveLocalAccounts(reconciledAccounts);
      await saveLocalBudgets(reconciledBudgets);

      if (isConnected) {
        await syncToSupabase();
      }
      return { success: true, count: newEvents.length };
    } catch (err: any) {
      console.error("importCsvData error:", err);
      return { success: false, error: err.message };
    } finally {
      setIsSyncing(false);
    }
  };

  const recordEvent = async (eventInput: Omit<EventRecord, "id" | "timestamp">) => {
    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const newEvent: EventRecord = {
      ...eventInput,
      id: eventId,
      eventId,
      timestamp,
      eventType: eventInput.type,
      budgetCycleId: eventInput.budgetCycleId || "Jul-26",
      updated_at: new Date().toISOString(),
    };

    const updatedEvents = [newEvent, ...events];
    setEvents(updatedEvents);
    await saveLocalEvents(updatedEvents);

    const { reconciledAccounts, reconciledBudgets } = reconcileAllState(
      updatedEvents,
      accounts,
      budgets
    );
    setAccounts(reconciledAccounts);
    setBudgets(reconciledBudgets);
    await saveLocalAccounts(reconciledAccounts);
    await saveLocalBudgets(reconciledBudgets);

    if (isConnected) {
      handleSyncAfterMutation();
    }
    return true;
  };

  const updateEvent = async (id: string, updatedFields: Partial<EventRecord>) => {
    const targetIdx = events.findIndex((e) => e.id === id || e.eventId === id);
    if (targetIdx === -1) return false;

    const existing = events[targetIdx];
    const updated: EventRecord = {
      ...existing,
      ...updatedFields,
      id: existing.id || id,
      eventId: existing.eventId || id,
      eventType: updatedFields.type || updatedFields.eventType || existing.eventType || existing.type || "EXPENSE_RECORDED",
      type: updatedFields.type || updatedFields.eventType || existing.type || existing.eventType || "EXPENSE_RECORDED",
      updated_at: new Date().toISOString(),
    };

    const updatedEvents = [...events];
    updatedEvents[targetIdx] = updated;

    setEvents(updatedEvents);
    await saveLocalEvents(updatedEvents);

    const { reconciledAccounts, reconciledBudgets } = reconcileAllState(
      updatedEvents,
      accounts,
      budgets
    );
    setAccounts(reconciledAccounts);
    setBudgets(reconciledBudgets);
    await saveLocalAccounts(reconciledAccounts);
    await saveLocalBudgets(reconciledBudgets);

    if (isConnected) {
      handleSyncAfterMutation();
    }
    return true;
  };

  const deleteEvent = async (id: string) => {
    const updatedEvents = events.map((e) => {
      if (e.id === id || e.eventId === id) {
        return { ...e, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      }
      return e;
    });
    setEvents(updatedEvents);
    await saveLocalEvents(updatedEvents);

    const { reconciledAccounts, reconciledBudgets } = reconcileAllState(
      updatedEvents,
      accounts,
      budgets
    );
    setAccounts(reconciledAccounts);
    setBudgets(reconciledBudgets);
    await saveLocalAccounts(reconciledAccounts);
    await saveLocalBudgets(reconciledBudgets);

    if (isConnected) {
      handleSyncAfterMutation();
    }
    return true;
  };

  const addAccount = async (accInput: Omit<AccountRecord, "id">) => {
    const rawBal = Number(accInput.openingBalance !== undefined ? accInput.openingBalance : (accInput.balance ?? 0));
    const koboBal = Math.abs(rawBal % 1) > 0.001 ? Math.round(rawBal * 100) : rawBal;
    const newAccount: AccountRecord = {
      ...accInput,
      id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      balance: koboBal,
      openingBalance: koboBal,
      updated_at: new Date().toISOString(),
    };

    const updated = [...accountsRef.current, newAccount];
    accountsRef.current = updated;
    setAccounts(updated);
    await saveLocalAccounts(updated);

    if (isConnected && localStorage.getItem("financeos_practice_mode") !== "true") {
      handleSyncAfterMutation();
    }
    return true;
  };

  const updateAccount = async (id: string, updatedFields: Partial<AccountRecord>) => {
    const updated = accountsRef.current.map((a) => {
      if (String(a.id) === String(id)) {
        const merged = { ...a, ...updatedFields };
        if (updatedFields.openingBalance !== undefined) {
          merged.openingBalance = updatedFields.openingBalance;
          (merged as any).isCustomBaseline = true;
        } else if (updatedFields.balance !== undefined && updatedFields.openingBalance === undefined) {
          merged.openingBalance = updatedFields.balance;
          (merged as any).isCustomBaseline = true;
        }
        merged.updated_at = new Date().toISOString();
        return merged;
      }
      return a;
    });
    const { reconciledAccounts, reconciledBudgets } = reconcileAllState(
      eventsRef.current,
      updated,
      budgetsRef.current,
      activeCycleId
    );
    accountsRef.current = reconciledAccounts;
    budgetsRef.current = reconciledBudgets;
    setAccounts(reconciledAccounts);
    setBudgets(reconciledBudgets);
    await saveLocalAccounts(reconciledAccounts);

    if (isConnected && localStorage.getItem("financeos_practice_mode") !== "true") {
      handleSyncAfterMutation();
    }
    return true;
  };

  const deleteAccount = async (id: string) => {
    const updated = accountsRef.current.map((a) => {
      if (String(a.id) === String(id)) {
        return { ...a, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      }
      return a;
    });
    accountsRef.current = updated;
    setAccounts(updated);
    await saveLocalAccounts(updated);

    if (isConnected && localStorage.getItem("financeos_practice_mode") !== "true") {
      handleSyncAfterMutation();
    }
    return true;
  };

  const addBudget = async (budgetInput: Omit<BudgetRecord, "id">) => {
    const newBudget: BudgetRecord = {
      ...budgetInput,
      id: `bdg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      updated_at: new Date().toISOString(),
    };

    const updated = [...budgetsRef.current, newBudget];
    budgetsRef.current = updated;
    setBudgets(updated);
    await saveLocalBudgets(updated);

    if (isConnected && localStorage.getItem("financeos_practice_mode") !== "true") {
      handleSyncAfterMutation();
    }
    return true;
  };

  const deleteBudget = async (id: string) => {
    const updated = budgetsRef.current.map((b) => {
      if (String(b.id) === String(id)) {
        return { ...b, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      }
      return b;
    });
    budgetsRef.current = updated;
    setBudgets(updated);
    await saveLocalBudgets(updated);

    if (isConnected && localStorage.getItem("financeos_practice_mode") !== "true") {
      handleSyncAfterMutation();
    }
    return true;
  };

  const batchSetupWorkspace = async ({ newAccounts, newBudgets }: { newAccounts: Omit<AccountRecord, "id">[]; newBudgets: Omit<BudgetRecord, "id">[] }) => {
    const preparedAccounts: AccountRecord[] = newAccounts.map((a, idx) => {
      const rawBal = Number(a.openingBalance !== undefined ? a.openingBalance : (a.balance ?? 0));
      const koboBal = Math.abs(rawBal % 1) > 0.001 ? Math.round(rawBal * 100) : rawBal;
      return {
        ...a,
        id: `acc-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        balance: koboBal,
        openingBalance: koboBal,
      };
    });
    const preparedBudgets: BudgetRecord[] = newBudgets.map((b, idx) => ({
      ...b,
      id: `bdg-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
    }));

    accountsRef.current = preparedAccounts;
    budgetsRef.current = preparedBudgets;
    setAccounts(preparedAccounts);
    setBudgets(preparedBudgets);
    await saveLocalAccounts(preparedAccounts);
    await saveLocalBudgets(preparedBudgets);

    if (isConnected && localStorage.getItem("financeos_practice_mode") !== "true") {
      handleSyncAfterMutation();
    }
    return true;
  };

  return (
    <AppContext.Provider
      value={{
        spreadsheetId,
        setSpreadsheetId,
        syncProvider,
        setSyncProvider,
        supabaseCreds,
        setSupabaseCreds,
        syncToSupabase,
        isConnected,
        isSyncing,
        rejectedSyncCount,
        activeCycleId,
        setActiveCycleId,
        availableCycles: AVAILABLE_CYCLES,
        events: events.filter(e => !e.deleted_at),
        accounts: accounts.filter(a => !a.deleted_at),
        budgets: budgets.filter(b => !b.deleted_at),
        recordEvent,
        updateEvent,
        deleteEvent,
        addAccount,
        updateAccount,
        deleteAccount,
        addBudget,
        deleteBudget,
        initSpreadsheet,
        runSpooler,
        runPurge,
        refreshData,
        forceCloneToSheet,
        importCsvData,
        batchSetupWorkspace,
        logoutAndClearCache,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  return context;
}