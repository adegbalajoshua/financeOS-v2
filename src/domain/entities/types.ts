import type { AccountRecord, BudgetCycleRecord, FinancialEventRecord, NetWorthSnapshotRecord } from "@/domain/events/schemas";

export type { AccountRecord };
export type BudgetRecord = Record<string, any>;

export type Account = AccountRecord & {
  // Legacy or application compatibility aliases
  type: string | "Bank" | "Mobile" | "Cash" | "Savings" | "Credit" | "Investment" | "Loan" | "CASH" | "SAVINGS" | "CREDIT" | any;
  status?: string | "Active" | "Inactive" | "OPEN" | "CLOSED" | "Closed" | any;
  openingBalance?: number;
  isActive?: boolean;
  currency?: string;
};

export type BudgetCycle = BudgetCycleRecord;

export type FinancialEvent = FinancialEventRecord & {
  // Aliases for UI or legacy event structures during migration
  id?: string;
  userId?: string;
  type?: string;
  accountId?: string;
  amount?: number;
  category?: string;
  description?: string;
  payload?: Record<string, any>;
  updated_at?: string;
  deleted_at?: string;
};

export type NetWorthSnapshot = NetWorthSnapshotRecord;

export interface User {
  id: string;
  email: string;
  name?: string;
  settings?: Record<string, unknown>;
}

export interface BudgetReportItem {
  category: string;
  planned: number;
  spent: number;
  remaining: number;
  progressPercent: number;
}

export interface BudgetReport {
  cycleId: string;
  totalPlanned: number;
  totalSpent: number;
  totalRemaining: number;
  items: BudgetReportItem[];
}
