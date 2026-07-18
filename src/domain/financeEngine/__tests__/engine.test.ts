import { describe, it, expect } from "vitest";
import {
  resolveAccountColumns,
  reconcileAccount,
  calculateNetWorth,
  generateBudgetReport,
} from "../engine";
import { Account, FinancialEvent } from "@/domain/entities/types";

describe("Finance Engine Reducers (Phase 1: Domain & Engine Core)", () => {
  describe("resolveAccountColumns", () => {
    it("correctly maps ExpenseRecorded to debit fromAccountId and null toAccountId", () => {
      const event: FinancialEvent = {
        eventId: "evt-1",
        timestamp: "2026-07-01T10:00:00Z",
        eventType: "ExpenseRecorded",
        budgetCycleId: "Jul-26",
        payload: {
          amount: 1405000, // ₦14,050.00 in Kobo
          fromAccountId: "acc-zenith",
          category: "Groceries",
        },
      };

      const result = resolveAccountColumns(event);
      expect(result.fromAccountId).toBe("acc-zenith");
      expect(result.toAccountId).toBeNull();
      expect(result.amount).toBe(1405000);
    });

    it("correctly maps IncomeReceived to credit toAccountId and null fromAccountId", () => {
      const event: FinancialEvent = {
        eventId: "evt-2",
        timestamp: "2026-07-01T12:00:00Z",
        eventType: "IncomeReceived",
        budgetCycleId: "Jul-26",
        payload: {
          amount: 50000000, // ₦500,000.00
          toAccountId: "acc-zenith",
          category: "Salary",
        },
      };

      const result = resolveAccountColumns(event);
      expect(result.fromAccountId).toBeNull();
      expect(result.toAccountId).toBe("acc-zenith");
      expect(result.amount).toBe(50000000);
    });

    it("correctly maps TransferCompleted to debit fromAccountId and credit toAccountId", () => {
      const event: FinancialEvent = {
        eventId: "evt-3",
        timestamp: "2026-07-02T10:00:00Z",
        eventType: "TransferCompleted",
        budgetCycleId: "Jul-26",
        payload: {
          amount: 1000000, // ₦10,000.00
          fromAccountId: "acc-zenith",
          toAccountId: "acc-cash",
        },
      };

      const result = resolveAccountColumns(event);
      expect(result.fromAccountId).toBe("acc-zenith");
      expect(result.toAccountId).toBe("acc-cash");
      expect(result.amount).toBe(1000000);
    });

    it("correctly maps SavingsContribution to debit fromAccountId and credit target goal", () => {
      const event: FinancialEvent = {
        eventId: "evt-4",
        timestamp: "2026-07-02T15:00:00Z",
        eventType: "SavingsContribution",
        budgetCycleId: "Jul-26",
        payload: {
          amount: 4000000, // ₦40,000.00
          fromAccountId: "acc-zenith",
          toGoalId: "goal-ef",
        },
      };

      const result = resolveAccountColumns(event);
      expect(result.fromAccountId).toBe("acc-zenith");
      expect(result.toAccountId).toBe("goal-ef");
      expect(result.amount).toBe(4000000);
    });
  });

  describe("reconcileAccount & Receivable Liquid Cash Protection", () => {
    it("reconciles account balance across income, expense, and transfers", () => {
      const account: Account = {
        id: "acc-zenith",
        name: "Zenith Bank",
        type: "Bank",
        openingBalance: 10000000, // ₦100,000.00 opening balance
        balance: 10000000,
        currency: "NGN",
      };

      const events: FinancialEvent[] = [
        {
          eventId: "1",
          timestamp: "2026-07-01T08:00:00Z",
          eventType: "ExpenseRecorded",
          budgetCycleId: "Jul-26",
          payload: { amount: 2000000, fromAccountId: "acc-zenith" }, // -₦20,000
        },
        {
          eventId: "2",
          timestamp: "2026-07-02T08:00:00Z",
          eventType: "IncomeReceived",
          budgetCycleId: "Jul-26",
          payload: { amount: 5000000, toAccountId: "acc-zenith" }, // +₦50,000
        },
        {
          eventId: "3",
          timestamp: "2026-07-03T08:00:00Z",
          eventType: "TransferCompleted",
          budgetCycleId: "Jul-26",
          payload: { amount: 1000000, fromAccountId: "acc-zenith", toAccountId: "acc-cash" }, // -₦10,000
        },
      ];

      const balance = reconcileAccount(events, account);
      // 100,000 - 20,000 + 50,000 - 10,000 = 120,000 (12,000,000 Kobo)
      expect(balance).toBe(12000000);
    });

    it("prevents ReceivableRecorded events from inflating Liquid Cash ('Bank', 'Mobile', 'Cash') balances", () => {
      const liquidBank: Account = {
        id: "acc-zenith",
        name: "Zenith Bank",
        type: "Bank",
        openingBalance: 5000000, // ₦50,000.00
        balance: 5000000,
        currency: "NGN",
      };

      const receivableEvent: FinancialEvent = {
        eventId: "rec-1",
        timestamp: "2026-07-04T10:00:00Z",
        eventType: "ReceivableRecorded",
        budgetCycleId: "Jul-26",
        payload: {
          amount: 3000000, // ₦30,000.00 receivable debt owed by a third party
          debtorName: "Client ABC",
          toAccountId: "acc-zenith", // Even if legacy/mistakenly tagged to a bank account
        },
      };

      const reconciledBalance = reconcileAccount([receivableEvent], liquidBank);
      // Because account is Liquid ('Bank'), ReceivableRecorded must NOT credit its balance before collection!
      expect(reconciledBalance).toBe(5000000);
    });

    it("treats inputs safely as exact Kobo values without implicit decimal multiplication", () => {
      const account: Account = {
        id: "acc-test",
        name: "Test Bank",
        type: "Bank",
        openingBalance: 50, // 50 Kobo (half a Naira), NOT 5000
        balance: 50,
        currency: "NGN",
      };

      const event: FinancialEvent = {
        eventId: "evt-kobo",
        timestamp: "2026-07-04T10:00:00Z",
        eventType: "IncomeReceived",
        budgetCycleId: "Jul-26",
        payload: {
          amount: 50, // 50 Kobo, NOT 5000
          toAccountId: "acc-test",
        },
      };

      const reconciledBalance = reconcileAccount([event], account);
      // 50 + 50 = 100
      expect(reconciledBalance).toBe(100);
    });

    it("safely handles floating-point amounts by rounding them to whole kobo integers", () => {
      const account: Account = {
        id: "acc-test",
        name: "Test Bank",
        type: "Bank",
        openingBalance: 50,
        balance: 50,
        currency: "NGN",
      };

      const floatEvent: FinancialEvent = {
        eventId: "evt-float",
        timestamp: "2026-07-04T11:00:00Z",
        eventType: "IncomeReceived",
        budgetCycleId: "Jul-26",
        payload: {
          amount: 50.7, // Should be rounded to 51
          toAccountId: "acc-test",
        },
      };

      const reconciledBalance = reconcileAccount([floatEvent], account);
      // 50 + round(50.7) = 101
      expect(reconciledBalance).toBe(101);
    });
  });

  describe("calculateNetWorth", () => {
    it("correctly calculates Net Worth by summing assets and subtracting liabilities", () => {
      const accounts: Account[] = [
        { id: "1", name: "Zenith Bank", type: "Bank", balance: 15000000, currency: "NGN" }, // +₦150,000
        { id: "2", name: "Cash Wallet", type: "Cash", balance: 2000000, currency: "NGN" },  // +₦20,000
        { id: "3", name: "Emergency Fund", type: "Savings", balance: 50000000, currency: "NGN" }, // +₦500,000
        { id: "4", name: "Credit Card", type: "Credit", balance: 8000000, currency: "NGN" }, // -₦80,000 liability
        { id: "5", name: "Old Closed Bank", type: "Bank", status: "Closed", balance: 9999999, currency: "NGN" }, // Ignored
      ];

      const netWorth = calculateNetWorth(accounts);
      // 15,000,000 + 2,000,000 + 50,000,000 - 8,000,000 = 59,000,000 Kobo (₦590,000.00)
      expect(netWorth).toBe(59000000);
    });
  });

  describe("generateBudgetReport", () => {
    it("aggregates expenses per category and calculates progress percent", () => {
      const events: FinancialEvent[] = [
        {
          eventId: "1",
          timestamp: "2026-07-01T10:00:00Z",
          eventType: "ExpenseRecorded",
          budgetCycleId: "Jul-26",
          payload: { amount: 2000000, category: "Groceries", fromAccountId: "acc-zenith" },
        },
        {
          eventId: "2",
          timestamp: "2026-07-05T10:00:00Z",
          eventType: "ExpenseRecorded",
          budgetCycleId: "Jul-26",
          payload: { amount: 1500000, category: "Groceries", fromAccountId: "acc-zenith" },
        },
        {
          eventId: "3",
          timestamp: "2026-07-10T10:00:00Z",
          eventType: "ExpenseRecorded",
          budgetCycleId: "Jul-26",
          payload: { amount: 3000000, category: "Transport", fromAccountId: "acc-zenith" },
        },
      ];

      const plannedBudgets = [
        { category: "Groceries", planned: 5000000 }, // ₦50,000 planned
        { category: "Transport", planned: 3000000 }, // ₦30,000 planned
      ];

      const report = generateBudgetReport(events, "Jul-26", plannedBudgets);

      expect(report.totalPlanned).toBe(8000000);
      expect(report.totalSpent).toBe(6500000); // 3,500,000 Groceries + 3,000,000 Transport
      expect(report.totalRemaining).toBe(1500000);

      const groceriesItem = report.items.find((i) => i.category === "Groceries");
      expect(groceriesItem?.spent).toBe(3500000);
      expect(groceriesItem?.progressPercent).toBe(70); // 3.5M / 5M = 70%

      const transportItem = report.items.find((i) => i.category === "Transport");
      expect(transportItem?.spent).toBe(3000000);
      expect(transportItem?.progressPercent).toBe(100); // 3M / 3M = 100%
    });
  });
});
