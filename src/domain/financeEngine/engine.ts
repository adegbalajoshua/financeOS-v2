import { Account, FinancialEvent, BudgetReport, BudgetReportItem } from "@/domain/entities/types";

/**
 * Resolves which account IDs are debited (fromAccountId) or credited (toAccountId)
 * based on the exact EventType or legacy transaction structure.
 */
export function resolveAccountColumns(event: FinancialEvent): {
  fromAccountId: string | null;
  toAccountId: string | null;
  amount: number;
} {
  const eventType = (event.eventType || event.type || "").toUpperCase();
  const rawAmount = Number(event.amount || event.payload?.amount || 0);
  const amount = Math.round(rawAmount);

  const fromId = String(
    event.payload?.fromAccountId || (event as any).accountName || event.accountId || event.payload?.fromAccount || ""
  ).trim() || null;

  const toId = String(
    event.payload?.toAccountId || event.payload?.toGoalId || event.payload?.toAccount || ""
  ).trim() || null;

  switch (eventType) {
    case "EXPENSERECORDED":
    case "EXPENSE_RECORDED":
    case "BANKCHARGERECORDED":
    case "BANK_CHARGE":
    case "EXPENSE":
      return { fromAccountId: fromId, toAccountId: null, amount };

    case "INCOMERECEIVED":
    case "INCOME_RECEIVED":
    case "SALARYRECEIVED":
    case "INCOME":
      // For income, the target account receiving the funds is either explicitly toAccountId or fallback to accountId
      return { fromAccountId: null, toAccountId: toId || fromId, amount };

    case "TRANSFERCOMPLETED":
    case "TRANSFER_COMPLETED":
    case "TRANSFER":
      return { fromAccountId: fromId, toAccountId: toId, amount };

    case "SAVINGSCONTRIBUTION":
    case "SAVINGS_CONTRIBUTION":
    case "SAVING":
    case "SAVINGS":
      return { fromAccountId: fromId, toAccountId: toId, amount };

    case "RECEIVABLERECORDED":
    case "RECEIVABLE":
      // Receivable records an outstanding debt from a third party. If cash left a bank account (fromId), record it as the source.
      return { fromAccountId: fromId, toAccountId: toId || "Outstanding Receivables", amount };

    default:
      return { fromAccountId: fromId, toAccountId: toId, amount };
  }
}

/**
 * Reconciles a single account balance chronologically against a sequence of events.
 * Handles both Account entities and simple summary objects.
 */
export function reconcileAccount(
  events: FinancialEvent[],
  account: Account | { id: string; name?: string; type?: string; openingBalance?: number; balance?: number }
): number {
  const rawOpening = Number(account.openingBalance !== undefined ? account.openingBalance : (account.balance ?? 0));
  const openingBal = Math.round(rawOpening);
  const accId = String(account.id).trim().toLowerCase();
  const accName = String(account.name || "").trim().toLowerCase();
  const accType = String(account.type || "Bank").toUpperCase();
  const isLiquidAccount = ["BANK", "MOBILE", "CASH"].includes(accType);

  return events.reduce((currentBalance, event) => {
    const eventType = (event.eventType || event.type || "").toUpperCase();
    const { fromAccountId, toAccountId, amount } = resolveAccountColumns(event);
    const cleanFrom = String(fromAccountId || "").trim().toLowerCase();
    const cleanTo = String(toAccountId || "").trim().toLowerCase();

    // If this is a liquid account ('Bank', 'Mobile', 'Cash'), do not let 'Receivable' events inflate/credit its balance!
    if (isLiquidAccount && (eventType.includes("RECEIVABLE") || eventType === "RECEIVABLERECORDED")) {
      // If money left this liquid account as a loan/receivable out, it MUST debit the account!
      if (cleanFrom && (cleanFrom === accId || (accName && cleanFrom === accName))) {
        return currentBalance - amount;
      }
      return currentBalance;
    }

    let nextBal = currentBalance;
    if (cleanFrom && (cleanFrom === accId || (accName && cleanFrom === accName))) {
      nextBal -= amount;
    }
    if (cleanTo && (cleanTo === accId || (accName && cleanTo === accName))) {
      nextBal += amount;
    }

    return nextBal;
  }, openingBal);
}

/**
 * Calculates the total net worth from a list of accounts.
 * Assumes account balances are in base units (e.g. kobo) and uniform currency.
 */
export function calculateNetWorth(accounts: Account[]): number {
  return accounts.reduce((total, account) => {
    const accStatus = String(account.status || "Active").toUpperCase();
    if (accStatus === "INACTIVE" || accStatus === "CLOSED") return total;

    const accType = String(account.type || "Bank").toUpperCase();
    const isAsset = ["BANK", "CHECKING", "MOBILE", "CASH", "SAVINGS", "INVESTMENT", "CASH_WALLET"].includes(accType);
    const isLiability = ["CREDIT", "LOAN"].includes(accType);

    const bal = Number(account.balance ?? account.openingBalance ?? 0);

    if (isAsset) return total + bal;
    if (isLiability) return total - bal;

    return total;
  }, 0);
}

/**
 * Generates an analytical budget report by comparing spent vs planned budgets for a given cycle.
 */
export function generateBudgetReport(
  events: FinancialEvent[],
  cycleId: string,
  plannedBudgets: { category: string; planned: number }[] = []
): BudgetReport {
  const cycleEvents = events.filter((e) => {
    const eCycle = String(e.budgetCycleId || e.payload?.budgetCycle || "").trim().toLowerCase();
    return !cycleId || eCycle === String(cycleId).trim().toLowerCase();
  });

  const spentByCategory: Record<string, number> = {};

  cycleEvents.forEach((event) => {
    const eventType = (event.eventType || event.type || "").toUpperCase();
    const cat = String(event.payload?.category || event.category || "General").trim();
    const { amount } = resolveAccountColumns(event);

    // Count expenses and bank charges towards operating consumption
    if (
      eventType.includes("EXPENSE") ||
      eventType.includes("BANK_CHARGE") ||
      eventType.includes("BANKCHARGE")
    ) {
      spentByCategory[cat] = (spentByCategory[cat] || 0) + amount;
    }
    // For savings contributions and categorized transfers to reserve/goal accounts, credit goal allocation progress
    else if (
      eventType.includes("SAVING") ||
      eventType.includes("TRANSFER")
    ) {
      // Check if this category is explicitly tracked as a budget/goal category
      const isGoalCategory = plannedBudgets.some((p) => p.category.trim().toLowerCase() === cat.toLowerCase()) ||
        ["emergency fund", "clothing fund", "new place fund (cp compass)", "investment"].includes(cat.toLowerCase());
      if (isGoalCategory) {
        spentByCategory[cat] = (spentByCategory[cat] || 0) + amount;
      }
    }
  });

  const allCategories = new Set([
    ...plannedBudgets.map((p) => p.category.trim()),
    ...Object.keys(spentByCategory),
  ]);

  const items: BudgetReportItem[] = Array.from(allCategories).map((cat) => {
    const plannedObj = plannedBudgets.find((p) => p.category.trim().toLowerCase() === cat.toLowerCase());
    const planned = plannedObj ? Number(plannedObj.planned) : 0;
    const spent = spentByCategory[cat] || 0;
    const remaining = planned - spent;
    const progressPercent = planned > 0 ? Math.min(100, Math.round((spent / planned) * 100)) : spent > 0 ? 100 : 0;

    return {
      category: cat,
      planned,
      spent,
      remaining,
      progressPercent,
    };
  });

  const totalPlanned = items.reduce((sum, idx) => sum + idx.planned, 0);
  const totalSpent = items.reduce((sum, idx) => sum + idx.spent, 0);
  const totalRemaining = totalPlanned - totalSpent;

  return {
    cycleId,
    totalPlanned,
    totalSpent,
    totalRemaining,
    items,
  };
}

/**
 * Calculates total income and expenses across a list of events.
 */
export function calculateBudgetCycleSummary(events: FinancialEvent[]): { income: number; expenses: number } {
  return events.reduce(
    (summary, event) => {
      const eventType = (event.eventType || event.type || "").toUpperCase();
      const { amount } = resolveAccountColumns(event);

      if (eventType.includes("INCOME") || eventType.includes("SALARY")) {
        summary.income += amount;
      } else if (eventType.includes("EXPENSE") || eventType.includes("BANK_CHARGE") || eventType.includes("BANKCHARGE")) {
        summary.expenses += amount;
      }
      return summary;
    },
    { income: 0, expenses: 0 }
  );
}

/**
 * Projects an account's future balance by applying a series of events chronologically to its current balance.
 */
export function projectAccountBalance(account: Account, events: FinancialEvent[]): number {
  let projectedBalance = Number(account.balance ?? account.openingBalance ?? 0);
  const accId = String(account.id).trim();

  const accountEvents = events
    .filter((e) => {
      const { fromAccountId, toAccountId } = resolveAccountColumns(e);
      return fromAccountId === accId || toAccountId === accId || e.accountId === accId;
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  accountEvents.forEach((event) => {
    const { fromAccountId, toAccountId, amount } = resolveAccountColumns(event);
    if (fromAccountId && fromAccountId === accId) {
      projectedBalance -= amount;
    }
    if (toAccountId && toAccountId === accId) {
      projectedBalance += amount;
    }
    // Check legacy transfer payloads where neither from/to ID matched explicitly
    if (!fromAccountId && !toAccountId && event.accountId === accId) {
      if (event.type === "INCOME_RECEIVED") projectedBalance += amount;
      if (event.type === "EXPENSE_RECORDED") projectedBalance -= amount;
      if (event.type === "TRANSFER_COMPLETED") {
        if (event.payload?.direction === "OUTBOUND") projectedBalance -= amount;
        if (event.payload?.direction === "INBOUND") projectedBalance += amount;
      }
    }
  });

  return projectedBalance;
}
