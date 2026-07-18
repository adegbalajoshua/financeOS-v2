import { z } from "zod";

export const AccountTypeSchema = z.enum(["CASH", "SAVINGS", "CREDIT", "INVESTMENT", "LOAN"]);
export const EventTypeSchema = z.enum([
  "INCOME_RECEIVED",
  "EXPENSE_RECORDED",
  "TRANSFER_COMPLETED",
  "SAVINGS_CONTRIBUTION",
  "INVESTMENT_PURCHASED",
  "DIVIDEND_RECEIVED",
  "INTEREST_EARNED",
]);

export const BudgetCycleStatusSchema = z.enum(["PLANNED", "ACTIVE", "CLOSED"]);

export const AccountSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  name: z.string().min(1),
  type: AccountTypeSchema,
  status: z.enum(["OPEN", "CLOSED"]),
  balance: z.number(), // Tracked in base units (e.g., kobo for NGN) to avoid floating point issues
  currency: z.string().length(3).default("NGN"),
});

export const BudgetCycleSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  name: z.string().min(1), // e.g. "July 2026"
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: BudgetCycleStatusSchema,
});

export const FinancialEventSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  budgetCycleId: z.string().uuid(),
  accountId: z.string().uuid(),
  type: EventTypeSchema,
  amount: z.number().positive(), // Absolute amount, semantics depend on EventType
  timestamp: z.string().datetime(),
  description: z.string().optional(),
  category: z.string().optional(), // Used for expenses/income classification
  payload: z.record(z.string(), z.unknown()).optional(), // Extensible metadata
});

export type Account = z.infer<typeof AccountSchema>;
export type BudgetCycle = z.infer<typeof BudgetCycleSchema>;
export type FinancialEvent = z.infer<typeof FinancialEventSchema>;
