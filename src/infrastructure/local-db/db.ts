/**
 * ==============================================================================
 * FinanceOS Keyed Offline Snapshot Buffer (Replaces Dexie & Global Local Cache)
 * 100% Cloud-Primary (Supabase) + Strictly Tenant-Keyed Snapshot for Offline Grace
 * ==============================================================================
 */

import { Account, FinancialEvent } from "@/domain/entities/types";

export interface SyncMetaRecord {
  key: string;
  value: string;
  updatedAt: string;
}

export interface BudgetRecord {
  id: string;
  category: string;
  amount: number;
  cycleId: string;
  type?: string;
  name?: string;
  planned?: number;
  spent?: number;
  color?: string;
}

function getCurrentUserKey(): string {
  if (typeof window === "undefined") return "server_context";
  return localStorage.getItem("financeos_last_logged_in_user") || "guest_demo_user";
}

/**
 * Saves a batch of events into the current user's isolated offline snapshot.
 * Only read if the user goes offline or needs a rapid fallback during poor network conditions.
 */
export async function saveEventsToLocalDb(events: FinancialEvent[]): Promise<void> {
  if (typeof window === "undefined" || !events.length) return;
  const userKey = getCurrentUserKey();
  if (userKey === "guest_demo_user" && events.length === 0) return;

  try {
    localStorage.setItem(`financeos_snapshot_events_${userKey}`, JSON.stringify(events));
  } catch (e) {
    console.error("Failed to update offline snapshot buffer:", e);
  }
}

/**
 * Retrieves events strictly belonging to the currently logged in user's snapshot.
 */
export async function getEventsFromLocalDb(): Promise<FinancialEvent[]> {
  if (typeof window === "undefined") return [];
  const userKey = getCurrentUserKey();
  try {
    const data = localStorage.getItem(`financeos_snapshot_events_${userKey}`);
    if (!data) return [];
    const events: FinancialEvent[] = JSON.parse(data);
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (e) {
    return [];
  }
}

/**
 * Saves accounts into the user's isolated offline snapshot.
 */
export async function saveAccountsToLocalDb(accounts: Account[]): Promise<void> {
  if (typeof window === "undefined" || !accounts.length) return;
  const userKey = getCurrentUserKey();
  try {
    localStorage.setItem(`financeos_snapshot_accounts_${userKey}`, JSON.stringify(accounts));
  } catch (e) {
    console.error("Failed to save accounts snapshot:", e);
  }
}

/**
 * Retrieves accounts strictly from the user's isolated offline snapshot.
 */
export async function getAccountsFromLocalDb(): Promise<Account[]> {
  if (typeof window === "undefined") return [];
  const userKey = getCurrentUserKey();
  try {
    const data = localStorage.getItem(`financeos_snapshot_accounts_${userKey}`);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

/**
 * Saves budgets into the user's isolated offline snapshot.
 */
export async function saveBudgetsToLocalDb(budgets: BudgetRecord[]): Promise<void> {
  if (typeof window === "undefined" || !budgets.length) return;
  const userKey = getCurrentUserKey();
  try {
    localStorage.setItem(`financeos_snapshot_budgets_${userKey}`, JSON.stringify(budgets));
  } catch (e) {
    console.error("Failed to save budgets snapshot:", e);
  }
}

/**
 * Retrieves budgets strictly from the user's isolated offline snapshot.
 */
export async function getBudgetsFromLocalDb(): Promise<BudgetRecord[]> {
  if (typeof window === "undefined") return [];
  const userKey = getCurrentUserKey();
  try {
    const data = localStorage.getItem(`financeos_snapshot_budgets_${userKey}`);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

/**
 * Gets the last sync ISO timestamp cursor for a given spreadsheet ID.
 */
export async function getLastSyncTimestamp(spreadsheetId: string): Promise<string | null> {
  if (typeof window === "undefined" || !spreadsheetId) return null;
  return localStorage.getItem(`financeos_sync_meta_${spreadsheetId}`);
}

/**
 * Sets the last sync ISO timestamp cursor for a given spreadsheet ID.
 */
export async function setLastSyncTimestamp(spreadsheetId: string, timestamp: string): Promise<void> {
  if (typeof window === "undefined" || !spreadsheetId) return;
  localStorage.setItem(`financeos_sync_meta_${spreadsheetId}`, timestamp);
}

/**
 * Wipes all offline snapshots and local buffers when switching users, logging out, or purging.
 */
export async function clearLocalDb(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("financeos_snapshot_") || key.startsWith("financeos_local_") || key.startsWith("financeos_sync_meta_"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    console.log(`[Offline Buffer Cleared] Purged ${keysToRemove.length} tenant snapshots from local device.`);
  } catch (e) {
    console.error("Error clearing local snapshots:", e);
  }
}
