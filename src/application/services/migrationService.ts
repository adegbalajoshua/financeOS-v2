import { FinancialEvent } from "../../domain/entities/types";

/**
 * Migration Service
 * Translates legacy Apps Script/Google Sheets row data into V3 Financial Events.
 */
export class MigrationService {
  /**
   * Converts a legacy flat row (e.g. from the old Apps Script 'Transactions' sheet)
   * into a proper event-sourced FinancialEvent.
   */
  /**
   * Converts a legacy flat row (e.g. from the old Apps Script 'Transactions' or 'Daily Log' sheet)
   * into a proper event-sourced FinancialEvent.
   * Expected columns: Date | Budget Cycle | Type | Category | Description | From Account | To Account | Amount | Notes | Transaction ID
   */
  translateLegacyRowToEvent(legacyRow: Record<string, any>): FinancialEvent {
    const rawType = String(legacyRow.Type || legacyRow.type || "").trim();
    const isIncome = rawType.toLowerCase().includes("income");
    const isTransfer = rawType.toLowerCase().includes("transfer");
    const isSaving = rawType.toLowerCase().includes("saving");
    const isBankCharge = rawType.toLowerCase().includes("charge");

    let eventType = "EXPENSE_RECORDED";
    if (isIncome) eventType = "INCOME_RECEIVED";
    else if (isTransfer) eventType = "TRANSFER_COMPLETED";
    else if (isSaving) eventType = "SAVINGS_CONTRIBUTION";
    else if (isBankCharge) eventType = "EXPENSE_RECORDED";

    const amountInKobo = Math.round(Number(legacyRow.Amount || legacyRow.amount || 0) * 100);
    const dateStr = legacyRow.Date || legacyRow.timestamp || new Date().toISOString();
    let timestampIso = new Date().toISOString();
    try {
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        timestampIso = parsedDate.toISOString();
      }
    } catch {
      timestampIso = new Date().toISOString();
    }

    const id = String(legacyRow["Transaction ID"] || legacyRow.id || legacyRow.legacyTxId || crypto.randomUUID());
    const fromAcc = String(legacyRow["From Account"] || legacyRow.fromAccount || legacyRow.Account || "Zenith").trim();
    const toAcc = String(legacyRow["To Account"] || legacyRow.toAccount || "").trim();
    const cycleId = String(legacyRow["Budget Cycle"] || legacyRow.budgetCycleId || this.inferBudgetCycle(dateStr)).trim();

    let payloadObj: Record<string, any> = {
      migrated: true,
      legacyRowId: id,
      notes: legacyRow.Notes || "",
    };

    let primaryAccount = fromAcc;
    if (isTransfer || isSaving) {
      payloadObj.fromAccountId = fromAcc;
      payloadObj.toAccountId = toAcc || "CP Compass (Emergency Fund)";
      payloadObj.amount = amountInKobo;
      primaryAccount = fromAcc;
    } else if (isIncome) {
      payloadObj.toAccountId = fromAcc || toAcc;
      primaryAccount = fromAcc || toAcc;
    }

    return {
      id,
      eventId: id,
      userId: "MIGRATED_USER",
      budgetCycleId: cycleId,
      accountId: primaryAccount,
      type: eventType,
      eventType: eventType as any,
      amount: amountInKobo,
      timestamp: timestampIso,
      category: String(legacyRow.Category || legacyRow.category || "General").trim(),
      description: String(legacyRow.Description || legacyRow.description || legacyRow.Notes || "").trim(),
      payload: payloadObj,
    };
  }

  /**
   * Translates a legacy Accounts Sheet row:
   * Account Name | Account Type | Opening Balance | Status
   */
  translateLegacyAccountToRecord(legacyRow: Record<string, any>) {
    const name = String(legacyRow["Account Name"] || legacyRow.name || "Wallet").trim();
    const type = String(legacyRow["Account Type"] || legacyRow.type || "Bank").trim();
    const balanceInKobo = Math.round(Number(legacyRow["Opening Balance"] || legacyRow.openingBalance || 0) * 100);
    const status = String(legacyRow.Status || legacyRow.status || "Active").trim();

    return {
      id: `acc-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name,
      type,
      balance: balanceInKobo,
      openingBalance: balanceInKobo,
      institution: name.includes("CP Compass") ? "CP Compass" : name,
      status,
    };
  }

  /**
   * Translates a legacy Budget Setup Sheet row:
   * Budget Cycle | Type | Category | Budget Amount
   */
  translateLegacyBudgetToRecord(legacyRow: Record<string, any>) {
    const category = String(legacyRow.Category || legacyRow.category || "General").trim();
    const amountInKobo = Math.round(Number(legacyRow["Budget Amount"] || legacyRow.planned || 0) * 100);
    const cycleId = String(legacyRow["Budget Cycle"] || legacyRow.cycleId || "Jul-26").trim();

    return {
      id: `b-${category.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: category,
      category,
      planned: amountInKobo,
      spent: 0,
      color: "#635BFF",
      cycleId,
    };
  }

  private inferBudgetCycle(dateString: string): string {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Jul-26";
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear().toString().slice(-2);
      return `${month}-${year}`;
    } catch {
      return "Jul-26";
    }
  }

  private mapAccountNameToId(accountName: string): string {
    return accountName.trim() || "Zenith";
  }
}
