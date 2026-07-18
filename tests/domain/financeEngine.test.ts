import { expect, test, describe } from "vitest";
import { calculateNetWorth, calculateBudgetCycleSummary, projectAccountBalance } from "../../src/domain/financeEngine/engine";
import { Account, FinancialEvent } from "../../src/domain/entities/types";

describe("Finance Engine", () => {
  describe("calculateNetWorth", () => {
    test("calculates net worth correctly from assets and liabilities", () => {
      const accounts: Account[] = [
        { id: "1", userId: "u1", name: "Checking", type: "CHECKING", status: "OPEN", balance: 500000, currency: "NGN" },
        { id: "2", userId: "u1", name: "Savings", type: "SAVINGS", status: "OPEN", balance: 1000000, currency: "NGN" },
        { id: "3", userId: "u1", name: "Credit Card", type: "CREDIT", status: "OPEN", balance: 250000, currency: "NGN" },
      ];
      // 5000.00 + 10000.00 - 2500.00 = 12500.00 => 1250000 kobo
      const netWorth = calculateNetWorth(accounts);
      expect(netWorth).toBe(1250000);
    });
  });

  describe("calculateBudgetCycleSummary", () => {
    test("calculates total income and expenses", () => {
      const events: FinancialEvent[] = [
        { id: "e1", userId: "u1", budgetCycleId: "b1", accountId: "a1", type: "INCOME_RECEIVED", amount: 400000, timestamp: "2026-07-01T00:00:00Z" },
        { id: "e2", userId: "u1", budgetCycleId: "b1", accountId: "a1", type: "EXPENSE_RECORDED", amount: 50000, timestamp: "2026-07-05T00:00:00Z" },
        { id: "e3", userId: "u1", budgetCycleId: "b1", accountId: "a1", type: "EXPENSE_RECORDED", amount: 15000, timestamp: "2026-07-10T00:00:00Z" },
      ];
      const summary = calculateBudgetCycleSummary(events);
      expect(summary.income).toBe(400000);
      expect(summary.expenses).toBe(65000);
    });
  });

  describe("projectAccountBalance", () => {
    test("projects balance correctly after applying events chronologically", () => {
      const account: Account = { id: "a1", userId: "u1", name: "Cash Wallet", type: "CASH", status: "OPEN", balance: 100000, currency: "NGN" };
      const events: FinancialEvent[] = [
        { id: "e1", userId: "u1", budgetCycleId: "b1", accountId: "a1", type: "INCOME_RECEIVED", amount: 200000, timestamp: "2026-07-01T00:00:00Z" },
        { id: "e2", userId: "u1", budgetCycleId: "b1", accountId: "a1", type: "EXPENSE_RECORDED", amount: 50000, timestamp: "2026-07-05T00:00:00Z" },
        { id: "e3", userId: "u1", budgetCycleId: "b1", accountId: "a2", type: "EXPENSE_RECORDED", amount: 999999, timestamp: "2026-07-06T00:00:00Z" }, // Different account, should be ignored
        { id: "e4", userId: "u1", budgetCycleId: "b1", accountId: "a1", type: "TRANSFER_COMPLETED", amount: 50000, timestamp: "2026-07-10T00:00:00Z", payload: { direction: "OUTBOUND" } },
      ];
      
      const projected = projectAccountBalance(account, events);
      // Start: 100000
      // + Income: 200000 = 300000
      // - Expense: 50000 = 250000
      // - Transfer: 50000 = 200000
      expect(projected).toBe(200000);
    });
  });
});
