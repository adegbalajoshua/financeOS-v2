import { BASELINE_EVENTS, BASELINE_ACCOUNTS, BASELINE_BUDGETS } from "./src/lib/baselineData";
import { reconcileAccount, generateBudgetReport, calculateNetWorth } from "./src/domain/financeEngine/engine";

console.log("=== ENGINE.TS RECONCILIATION TEST ===");

const reconciledAccounts = BASELINE_ACCOUNTS.map((acc: any) => {
  const liveBal = reconcileAccount(BASELINE_EVENTS as any, acc);
  return { ...acc, balance: liveBal };
});

console.log("\nRECONCILED ACCOUNTS FROM ENGINE.TS (in Kobo & Naira):");
reconciledAccounts.forEach((acc) => {
  const naira = acc.balance / 100;
  console.log(`  ${acc.name.padEnd(32)} Kobo: ${String(acc.balance).padStart(12)}  -> Naira: ₦${naira.toFixed(2)}`);
});

const netWorthKobo = calculateNetWorth(reconciledAccounts as any);
console.log(`\nTOTAL NET WORTH: Kobo: ${netWorthKobo}  -> Naira: ₦${(netWorthKobo / 100).toFixed(2)}`);

const budgetReport = generateBudgetReport(
  BASELINE_EVENTS as any,
  "Jul-26",
  BASELINE_BUDGETS.map((b: any) => ({ category: b.category || b.name, planned: b.planned }))
);

console.log("\nBUDGET REPORT FROM ENGINE.TS (in Naira):");
budgetReport.items.forEach((item) => {
  console.log(`  ${item.category.padEnd(32)} Planned: ₦${(item.planned/100).toFixed(2).padStart(10)}  Spent: ₦${(item.spent/100).toFixed(2).padStart(10)}  Remaining: ₦${(item.remaining/100).toFixed(2).padStart(10)} (${item.progressPercent}%)`);
});
