import { describe, it, expect } from "vitest";
import { validateEventPayload } from "../validation";

describe("Event Payload Validation (Client-Side)", () => {
  it("rejects an Expense payload with an empty fromAccountId (missing account name)", () => {
    // This payload mimics what the old manual checks allowed through
    // if accountName was empty but amount and category were present.
    const badExpensePayload = {
      amount: 50000,
      category: "Groceries",
      fromAccountId: "", // Empty string!
    };

    const result = validateEventPayload("EXPENSE_RECORDED", badExpensePayload);
    expect(result.success).toBe(false);
    
    if (!result.success) {
      expect(result.error).toMatch(/Too small: expected string to have >=1 characters/i);
    }
  });

  it("rejects an Income payload with an empty toAccountId", () => {
    const badIncomePayload = {
      amount: 100000,
      category: "Salary",
      toAccountId: "", 
    };

    const result = validateEventPayload("INCOME_RECEIVED", badIncomePayload);
    expect(result.success).toBe(false);
    
    if (!result.success) {
      expect(result.error).toMatch(/Too small: expected string to have >=1 characters/i);
    }
  });

  it("allows a valid Expense payload", () => {
    const validExpense = {
      amount: 50000,
      category: "Groceries",
      fromAccountId: "acc-zenith",
    };

    const result = validateEventPayload("EXPENSE_RECORDED", validExpense);
    expect(result.success).toBe(true);
  });

  it("rejects a Transfer payload using the old from_account/to_account keys instead of fromAccountId/toAccountId", () => {
    // The old manual validation in EventComposer built this exact wrong payload for TRANSFER/SAVINGS
    const oldTransferPayload = {
      amount: 10000,
      description: "Rent portion",
      from_account: "acc-zenith",
      to_account: "acc-savings",
    };

    const result = validateEventPayload("TRANSFER_COMPLETED", oldTransferPayload);
    expect(result.success).toBe(false);
    
    if (!result.success) {
      // It should complain that fromAccountId is missing (Required)
      expect(result.error).toMatch(/from account/i);
    }
  });
});
