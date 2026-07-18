import { RAW_DAILY_LOG, BASELINE_ACCOUNTS, BASELINE_BUDGETS } from "./src/lib/baselineData";

console.log("=== EXACT MATCH FOR OLD DASHBOARD METRICS ===");

// 1. Check Accounts & Liquid Cash exactly as in V1
// In V1: Receivables DO debit Zenith when From Account = Zenith!
// Let's check account balances when we process every row chronologically.
let balances: Record<string, number> = {
  "Zenith": 719803.97,
  "Opay": 1373.30,
  "Cash": 0.00,
  "Wema": 0.00,
  "Mainstreet Flexi": 6999.06,
  "CP Compass (Emergency Fund)": 0.00,
  "CP Compass (Clothing Fund)": 0.00,
  "CP Compass (New Place Fund)": 0.00,
};

// Let's check which exact rows produce 27,188.23 for Zenith:
RAW_DAILY_LOG.forEach((row) => {
  const [date, type, category, desc, fromAcc, toAcc, amount, id] = row;
  if (fromAcc && balances[fromAcc] !== undefined) {
    balances[fromAcc] -= amount;
  }
  if (toAcc && balances[toAcc] !== undefined) {
    balances[toAcc] += amount;
  }
});

console.log("=== ACCOUNT BALANCES WHEN ALL OUTFLOWS DEBIT (Including Receivable) ===");
Object.entries(balances).forEach(([acc, bal]) => {
  console.log(`  ${acc.padEnd(30)} ₦${bal.toFixed(2)}`);
});

// Let's check why 26,938.23 vs 27,188.23 (difference = exactly 250).
// If row 6c85574c (POS Charge 250 on 2026-07-02) was not yet recorded when user took screenshot:
// 26,938.23 + 250 = 27,188.23 exactly!

// 2. Let's check the top cards on Screenshot 1:
// Income: ₦380.9K
// Spent: ₦551.6K
// Liquid Cash: ₦34.2K
// Receivables: ₦100.0K
// Bank Charges: ₦4.5K

let totalIncome = 0;
let topCardSpent = 0;
let bankCharges = 0;

RAW_DAILY_LOG.forEach((row) => {
  const [date, type, category, desc, fromAcc, toAcc, amount, id] = row;
  if (type === "Income") {
    totalIncome += amount;
  }
  if (type === "Expense" || type === "Bank Charge") {
    topCardSpent += amount;
  }
  if (type === "Bank Charge" || category === "Bank Charge") {
    bankCharges += amount;
  }
});

console.log("\n=== TOP CARD CHECK ===");
console.log(`Income sum (type='Income'): ₦${totalIncome.toFixed(2)} (${(totalIncome/1000).toFixed(1)}K)`);
console.log(`Top Card Spent sum (type='Expense' or 'Bank Charge'): ₦${topCardSpent.toFixed(2)} (${(topCardSpent/1000).toFixed(1)}K)`);
console.log(`Bank Charges sum: ₦${bankCharges.toFixed(2)} (${(bankCharges/1000).toFixed(1)}K)`);

// 3. Let's check Spending Breakdown (Circle = Total Spent: ₦392,994.14)
// Why is Top Card Spent = 551,600.00 while Spending Breakdown Circle = 392,994.14?
// Let's check: 551,600.00 - 392,994.14 = 158,605.86!
// What rows make up 158,605.86?
// Let's check: Clothes (115,000) + Bonus (40,000) + Bank Charge (3,605.86)?
// 115,000 + 40,000 + 3,605.86 = 158,605.86 exactly!!
// That means the Spending Breakdown Circle ONLY includes the 7 Planned Budget Categories (Food, Transport, Tithe, Internet, Pet Care, Subscriptions, Discretionary)!
console.log("\n=== SPENDING BREAKDOWN EXACT SUM ===");
const budgetCategories = ["Food & Household", "Transport", "Tithe", "Internet", "Pet Care", "Subscriptions", "Discretionary"];
let circleSpent = 0;
RAW_DAILY_LOG.forEach((row) => {
  const [date, type, category, desc, fromAcc, toAcc, amount, id] = row;
  if (budgetCategories.includes(category) && (type === "Expense" || type === "Bank Charge" || type === "Transfer")) {
    // Let's check what rows were included per category
  }
});

// Let's check Discretionary exactly:
let discSum = 0;
RAW_DAILY_LOG.forEach((row) => {
  const [date, type, category, desc, fromAcc, toAcc, amount, id] = row;
  if (category === "Discretionary" && type === "Expense") {
    discSum += amount;
  }
});
console.log(`Discretionary (type='Expense' only): ₦${discSum.toFixed(2)}`);
