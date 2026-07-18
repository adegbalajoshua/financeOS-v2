import { RAW_DAILY_LOG, BASELINE_ACCOUNTS, BASELINE_BUDGETS } from "./src/lib/baselineData";

console.log("=== ANALYZING OLD DASHBOARD NUMBERS ===");

// Let's check all transactions
console.log(`Total transactions in baselineData: ${RAW_DAILY_LOG.length}`);

// Let's check what reduces Zenith opening balance (719,803.97) down to 27,188.23
// 719,803.97 - 27,188.23 = 692,615.74 net outflow from Zenith.
let zenithRunning = 719803.97;
RAW_DAILY_LOG.forEach((row: any, idx) => {
  const [date, type, category, desc, fromAcc, toAcc, amount, id] = row;
  if (fromAcc === "Zenith") {
    zenithRunning -= amount;
  } else if (toAcc === "Zenith") {
    zenithRunning += amount;
  }
});
console.log(`If ALL rows where fromAcc='Zenith' debit Zenith and toAcc='Zenith' credit Zenith without skipping Receivables:`);
console.log(`Zenith balance = ${zenithRunning.toFixed(2)}`);

// Let's check why 26,938.23 vs 27,188.23 (+250 difference)
// Let's search if any row has 250 amount or what rows involve Zenith around 250
RAW_DAILY_LOG.forEach((row: any) => {
  const [date, type, category, desc, fromAcc, toAcc, amount, id] = row;
  if (amount === 250) {
    console.log(`Found amount 250:`, row);
  }
});

// Let's check what category spending sums to Total Spent: 392,994.14
// In screenshot 2 & 1 breakdown:
// Food & Household: 94,480.00
// Transport: 67,100.00
// Tithe: 65,601.94
// Internet: 30,000.00
// Pet Care: 20,000.00
// Subscriptions: 8,252.20
// Discretionary: let's check discretionary!
// Sum of Food + Transport + Tithe + Internet + Pet Care + Subscriptions = 94480 + 67100 + 65601.94 + 30000 + 20000 + 8252.20 = 285,434.14!
// If Total Spent is 392,994.14, then Discretionary in the breakdown is:
// 392,994.14 - 285,434.14 = 107,560.00!
console.log(`\nLet's verify spending breakdown sum:`);
console.log(`Food (94480) + Transport (67100) + Tithe (65601.94) + Internet (30000) + Pet Care (20000) + Subscriptions (8252.20) + Discretionary (107560) = ${(94480 + 67100 + 65601.94 + 30000 + 20000 + 8252.20 + 107560).toFixed(2)}`);

// Why did our previous engine show Discretionary spent as 111,160.00 instead of 107,560.00?
// 111,160.00 - 107,560.00 = 3,600.00!
// Let's check all Discretionary rows in RAW_DAILY_LOG to see where 3,600 difference comes from!
console.log(`\nAll Discretionary rows in RAW_DAILY_LOG:`);
RAW_DAILY_LOG.forEach((row: any) => {
  if (row[2] === "Discretionary" || row[1] === "Discretionary") {
    console.log(`  ${row[0]} | ${row[1].padEnd(12)} | ${row[2].padEnd(15)} | ${row[3].padEnd(30)} | From: ${row[4]} | To: ${row[5]} | Amt: ${row[6]}`);
  }
});
