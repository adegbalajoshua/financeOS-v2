import { z } from "zod";

export const AccountTypeSchema = z.enum(["Bank", "Mobile", "Cash", "Savings", "Credit", "Investment", "Loan", "Checking", "CHECKING", "SAVINGS", "CREDIT", "CASH", "INVESTMENT", "BANK", "MOBILE"]);

export const AccountStatusSchema = z.enum(["Active", "Inactive", "CLOSED", "OPEN", "Closed", "Active"]);

export const AccountSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  name: z.string().min(1),
  type: AccountTypeSchema,
  status: AccountStatusSchema.optional().default("Active"),
  openingBalance: z.number().optional().default(0), // In Kobo / Base integer units
  balance: z.number().default(0),        // Live calculated balance in Kobo
  institution: z.string().optional(),
  currency: z.string().optional().default("NGN"),
  isActive: z.boolean().optional().default(true),
  updated_at: z.string().optional(),
  deleted_at: z.string().optional(),
});

export const BudgetCycleStatusSchema = z.enum(["PLANNED", "ACTIVE", "CLOSED"]);

export const BudgetCycleSchema = z.object({
  id: z.string(),
  name: z.string().min(1), // e.g., "July 2026" or "Jul-26"
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: BudgetCycleStatusSchema.default("ACTIVE"),
});

export const EventTypeSchema = z.enum([
  "ExpenseRecorded",
  "IncomeReceived",
  "TransferCompleted",
  "SavingsContribution",
  "BankChargeRecorded",
  "ReceivableRecorded",
  // Legacy / Spooled fallbacks for compatibility
  "EXPENSE_RECORDED",
  "INCOME_RECEIVED",
  "TRANSFER_COMPLETED",
  "SAVINGS_CONTRIBUTION",
]);

export const ExpensePayloadSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1),
  description: z.string().optional(),
  fromAccountId: z.string().min(1),
});

export const IncomePayloadSchema = z.object({
  amount: z.number().positive(),
  category: z.string().optional(),
  description: z.string().optional(),
  toAccountId: z.string().min(1),
});

export const TransferPayloadSchema = z.object({
  amount: z.number().positive(),
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  description: z.string().optional(),
});

export const SavingsPayloadSchema = z.object({
  amount: z.number().positive(),
  fromAccountId: z.string().min(1),
  toGoalId: z.string().min(1),
  description: z.string().optional(),
});

export const BankChargePayloadSchema = z.object({
  amount: z.number().positive(),
  fromAccountId: z.string().min(1),
  description: z.string().optional(),
});

export const ReceivablePayloadSchema = z.object({
  amount: z.number().positive(),
  debtorName: z.string().min(1),
  dueDate: z.string().optional(),
  description: z.string().optional(),
  toAccountId: z.string().optional(), // Optional target account when collected
});

export const BaseFinancialEventSchema = z.object({
  eventId: z.string().optional(),
  id: z.string().optional(),
  userId: z.string().optional(),
  timestamp: z.string(),
  eventType: z.union([EventTypeSchema, z.string()]).optional(),
  type: z.string().optional(),
  budgetCycleId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
  metadata: z.object({
    source: z.enum(["MANUAL", "MIGRATION_SPOOL", "API_WEBHOOK", "AUTOMATION"]).default("MANUAL"),
    importedAt: z.string().optional(),
    legacyTxId: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  amount: z.number().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  accountName: z.string().optional(),
  updated_at: z.string().optional(),
  deleted_at: z.string().optional(),
});

export const NetWorthSnapshotSchema = z.object({
  timestamp: z.string(),
  totalAssets: z.number(),
  totalLiabilities: z.number(),
  netWorth: z.number(),
});

export type AccountType = z.infer<typeof AccountTypeSchema>;
export type AccountStatus = z.infer<typeof AccountStatusSchema>;
export type AccountRecord = z.input<typeof AccountSchema>;
export type BudgetCycleRecord = z.infer<typeof BudgetCycleSchema>;
export type EventType = z.infer<typeof EventTypeSchema>;
export type FinancialEventRecord = z.infer<typeof BaseFinancialEventSchema>;
export type NetWorthSnapshotRecord = z.infer<typeof NetWorthSnapshotSchema>;
