/**
 * Standalone verification script — runs the exact same engine math
 * against the exact baseline data to verify account balances and budget figures.
 */

// Inline the raw data conversion (same as baselineData.ts)
const V1_TYPE_MAP: Record<string, string> = {
  "Expense":     "EXPENSE_RECORDED",
  "Bank Charge": "EXPENSE_RECORDED",
  "Income":      "INCOME_RECEIVED",
  "Transfer":    "TRANSFER_COMPLETED",
  "Saving":      "SAVINGS_CONTRIBUTION",
  "Investment":  "TRANSFER_COMPLETED",
  "Receivable":  "RECEIVABLE_RECORDED",
};

type RawRow = [string, string, string, string, string, string, number, string];

// prettier-ignore
const RAW_DAILY_LOG: RawRow[] = [
  ["2026-06-27", "Expense",     "Pet Care",          "Cat litter",                                  "Zenith", "",                            20000.00, "ab414275"],
  ["2026-06-27", "Expense",     "Food & Household",  "Groceries",                                   "Zenith", "",                            14050.00, "4fc8a50a"],
  ["2026-06-27", "Saving",      "Emergency Fund",    "EF contribution",                              "Zenith", "CP Compass (Emergency Fund)", 40000.00, "d03d968e"],
  ["2026-06-27", "Bank Charge", "Bank Charge",       "Transfer fees",                                "Zenith", "",                             1603.01, "6f297a9d"],
  ["2026-06-28", "Transfer",    "Discretionary",     "Cash Withdrawal",                              "Zenith", "Cash",                        10000.00, "fc2ed410"],
  ["2026-06-28", "Bank Charge", "Bank Charge",       "POS Charge",                                   "Zenith", "",                              200.00, "6ffb6d3d"],
  ["2026-06-28", "Bank Charge", "Bank Charge",       "Transfer fee",                                 "Zenith", "",                               50.00, "ee89294d"],
  ["2026-06-28", "Expense",     "Food & Household",  "Detergent",                                    "Cash",   "",                              500.00, "6701d9aa"],
  ["2026-06-28", "Expense",     "Food & Household",  "Mosquito Coil",                                "Cash",   "",                              200.00, "b21906ac"],
  ["2026-06-28", "Expense",     "Food & Household",  "Bag of Water",                                 "Cash",   "",                              500.00, "8ced2c07"],
  ["2026-06-29", "Expense",     "Transport",         "Transport to Sabo",                            "Cash",   "",                              500.00, "2575cc9c"],
  ["2026-06-29", "Bank Charge", "Bank Charge",       "Transfer Fee",                                 "Zenith", "",                               26.88, "8d706998"],
  ["2026-06-29", "Expense",     "Discretionary",     "Gala Sausage",                                 "Zenith", "",                             1060.00, "6d3d4541"],
  ["2026-06-29", "Expense",     "Discretionary",     "Nestle Milo Active Biscuit",                   "Zenith", "",                             2250.00, "d319c3b9"],
  ["2026-06-29", "Transfer",    "Discretionary",     "Flax Seeds (Receivable)",                      "Zenith", "",                             8340.00, "73571bb2"],
  ["2026-06-29", "Expense",     "Discretionary",     "Transfer to Seun",                             "Opay",   "",                             1000.00, "dd855954"],
  ["2026-06-29", "Expense",     "Food & Household",  "Loaf of Bread",                                "Cash",   "",                             1500.00, "46640ce6"],
  ["2026-06-29", "Bank Charge", "Bank Charge",       "Stamp Duty",                                   "Zenith", "",                               50.00, "7f921a47"],
  ["2026-06-29", "Bank Charge", "Bank Charge",       "Stamp Duty",                                   "Zenith", "",                               50.00, "2507f886"],
  ["2026-06-29", "Expense",     "Food & Household",  "Beans and Plantain",                           "Cash",   "",                             1000.00, "17d85a61"],
  ["2026-06-29", "Expense",     "Food & Household",  "Hollandia Evap Milk",                          "Cash",   "",                              600.00, "cb10a64e"],
  ["2026-06-29", "Expense",     "Food & Household",  "Mosquito Coil",                                "Cash",   "",                              200.00, "add3c31a"],
  ["2026-06-30", "Income",      "Salary",            "2nd Half of Salary",                           "",       "Zenith",                    350887.86, "8b17a6f9"],
  ["2026-06-30", "Expense",     "Tithe",             "Tithe on Salary",                              "Zenith", "",                            65601.94, "f7059c70"],
  ["2026-06-30", "Expense",     "Bonus",             "Tithe on Bonus",                               "Zenith", "",                            40000.00, "8d0b7dbf"],
  ["2026-06-30", "Bank Charge", "Bank Charge",       "Transfer fees",                                "Zenith", "",                              103.75, "8ce13f46"],
  ["2026-06-30", "Bank Charge", "Bank Charge",       "Stamp Duty",                                   "Opay",   "",                              100.00, "4c6bb8e8"],
  ["2026-06-30", "Saving",      "New Place Fund (CP Compass)", "Rent Installment",                   "Zenith", "CP Compass (New Place Fund)", 208333.00, "e23cce94"],
  ["2026-06-30", "Saving",      "Bonus",             "Seed from Bonus",                              "Zenith", "CP Compass (New Place Fund)", 11666.00, "84960038"],
  ["2026-06-30", "Receivable",  "Bonus",             "Loan to Caleb",                                "Zenith", "",                           100000.00, "176630ec"],
  ["2026-06-30", "Bank Charge", "Bank Charge",       "Transfer fees",                                "Zenith", "",                              103.75, "02302441"],
  ["2026-06-30", "Bank Charge", "Bank Charge",       "Transfer fees",                                "Zenith", "",                              103.75, "8e212e67"],
  ["2026-06-30", "Expense",     "Transport",         "Transport for July",                           "Zenith", "",                            65000.00, "fc4533bd"],
  ["2026-06-30", "Bank Charge", "Bank Charge",       "Transfer fees",                                "Zenith", "",                              103.75, "29644290"],
  ["2026-06-30", "Saving",      "Clothing Fund",     "Transfer to Clothing Fund",                    "Zenith", "CP Compass (Clothing Fund)",  15000.00, "6567d092"],
  ["2026-06-30", "Bank Charge", "Bank Charge",       "Transfer fees",                                "Zenith", "",                               76.88, "3a2e68a2"],
  ["2026-06-30", "Investment",  "Investment",        "Transfer to Mainstreet Flexi",                  "Zenith", "Mainstreet Flexi",            82084.42, "cf10b14a"],
  ["2026-06-30", "Investment",  "Investment",        "Transfer to Mainstreet Flexi",                  "Zenith", "Mainstreet Flexi",            46667.00, "1cff2f31"],
  ["2026-06-30", "Bank Charge", "Bank Charge",       "Transfer fees",                                "Zenith", "",                              103.75, "d9e59d2f"],
  ["2026-06-30", "Expense",     "Discretionary",     "McVities Digestive Biscuit",                   "Cash",   "",                              800.00, "8ebc1818"],
  ["2026-06-30", "Expense",     "Discretionary",     "Viju Chocolate Drink",                         "Cash",   "",                             1200.00, "f7251c18"],
  ["2026-06-30", "Expense",     "Discretionary",     "Groundnut",                                    "Cash",   "",                              500.00, "f611e6f1"],
  ["2026-06-30", "Expense",     "Discretionary",     "Biscuits and Gum for SH",                      "Cash",   "",                             1500.00, "bc2ae142"],
  ["2026-06-30", "Expense",     "Discretionary",     "Eggs for Luna",                                "Cash",   "",                             1000.00, "7c53a00c"],
  ["2026-07-01", "Expense",     "Discretionary",     "Gala Sausage",                                 "Cash",   "",                             1000.00, "02345efe"],
  ["2026-07-01", "Expense",     "Discretionary",     "Gift to Gideon",                               "Zenith", "",                            10000.00, "b56fcd2c"],
  ["2026-07-01", "Expense",     "Discretionary",     "Hollandia Evap (Medium)",                      "Cash",   "",                              600.00, "b11c8a48"],
  ["2026-07-01", "Bank Charge", "Bank Charge",       "Transfer Fee and Stamp Duty",                  "Zenith", "",                               76.88, "f5f39a5f"],
  ["2026-07-01", "Expense",     "Discretionary",     "Airtime for Dad",                              "Zenith", "",                             1500.00, "d60e246a"],
  ["2026-07-01", "Expense",     "Food & Household",  "Bag of water",                                 "Cash",   "",                              500.00, "5eb06905"],
  ["2026-07-02", "Expense",     "Discretionary",     "Airtime for Mum",                              "Zenith", "",                             1500.00, "653a260a"],
  ["2026-07-02", "Expense",     "Discretionary",     "Transport to Sabo",                            "Cash",   "",                              300.00, "7adc5666"],
  ["2026-07-02", "Expense",     "Discretionary",     "Transport to Lekki Gate",                      "Cash",   "",                              300.00, "3ad16d93"],
  ["2026-07-02", "Transfer",    "Discretionary",     "Cash Withdrawal",                              "Zenith", "Cash",                        10000.00, "a330149c"],
  ["2026-07-02", "Bank Charge", "Bank Charge",       "POS Charge and Stamp Duty",                    "Zenith", "",                              250.00, "6c85574c"],
  ["2026-07-02", "Expense",     "Discretionary",     "Dinner (Currency Grill)",                      "Zenith", "",                            11150.00, "ab3eca05"],
  ["2026-07-02", "Expense",     "Discretionary",     "Eggs for Luna",                                "Cash",   "",                             1000.00, "47f4ee2c"],
  ["2026-07-02", "Bank Charge", "Bank Charge",       "Stamp Duty",                                   "Zenith", "",                               50.00, "120d039a"],
  ["2026-07-03", "Expense",     "Internet",          "Mobile Data on GLO",                           "Zenith", "",                             3000.00, "884b4ad2"],
  ["2026-07-03", "Expense",     "Discretionary",     "Snacks",                                       "Cash",   "",                             4900.00, "ba44ed7f"],
  ["2026-07-03", "Expense",     "Discretionary",     "CWAY Nutr Choco",                              "Cash",   "",                              900.00, "67f1c018"],
  ["2026-07-03", "Expense",     "Discretionary",     "Transport",                                    "Cash",   "",                              400.00, "edfcf61c"],
  ["2026-07-03", "Transfer",    "Food & Household",  "Cash Withdrawal",                              "Zenith", "Cash",                        10000.00, "7ca07606"],
  ["2026-07-03", "Bank Charge", "Bank Charge",       "POS Charge and Stamp Duty",                    "Zenith", "",                              300.00, "1617955b"],
  ["2026-07-03", "Expense",     "Food & Household",  "Pepper",                                       "Cash",   "",                             4000.00, "e6c17bec"],
  ["2026-07-03", "Expense",     "Food & Household",  "Onions",                                       "Cash",   "",                              300.00, "996871da"],
  ["2026-07-03", "Expense",     "Food & Household",  "Garlic",                                       "Cash",   "",                              500.00, "e5c0e1ea"],
  ["2026-07-03", "Expense",     "Food & Household",  "Fish",                                         "Cash",   "",                             5000.00, "55f79ad6"],
  ["2026-07-03", "Expense",     "Food & Household",  "Pepper Grinding",                              "Cash",   "",                              300.00, "b8241ca7"],
  ["2026-07-03", "Expense",     "Food & Household",  "Foodstuff for the house",                      "Zenith", "",                            57830.00, "0de7cc7d"],
  ["2026-07-03", "Bank Charge", "Bank Charge",       "Stamp Duty",                                   "Zenith", "",                               50.00, "af9cd2ed"],
  ["2026-07-04", "Expense",     "Internet",          "ODU Subscription",                             "Zenith", "",                            25000.00, "65fbb0d4"],
  ["2026-07-04", "Bank Charge", "Bank Charge",       "Transfer Fee and Stamp Duty",                  "Zenith", "",                               76.88, "7f806c02"],
  ["2026-07-04", "Expense",     "Discretionary",     "Groceries from City Bakers",                   "Zenith", "",                            14400.00, "3a686aaa"],
  ["2026-07-04", "Bank Charge", "Bank Charge",       "Transfer Fee and Stamp Duty",                  "Zenith", "",                               76.88, "7242fc48"],
  ["2026-07-05", "Expense",     "Food & Household",  "House Contribution",                           "Zenith", "",                             3000.00, "e5b355c7"],
  ["2026-07-05", "Bank Charge", "Bank Charge",       "Transfer Fee",                                 "Zenith", "",                               10.75, "9cbc1056"],
  ["2026-07-05", "Expense",     "Subscriptions",     "Subscription for Canva",                       "Zenith", "",                             2800.00, "75b7f7a6"],
  ["2026-07-05", "Expense",     "Subscriptions",     "Subscription for Spotify",                     "Zenith", "",                             2500.00, "b0a90900"],
  ["2026-07-05", "Transfer",    "Subscriptions",     "Transfer to OPay",                             "Zenith", "Opay",                         2700.00, "4bd324c2"],
  ["2026-07-05", "Bank Charge", "Bank Charge",       "Transfer Fees",                                "Zenith", "",                               10.75, "e06fecec"],
  ["2026-07-05", "Transfer",    "Discretionary",     "Cash Withdrawal",                              "Zenith", "Cash",                        10000.00, "c9ccd4c9"],
  ["2026-07-05", "Bank Charge", "Bank Charge",       "POS Charge",                                   "Zenith", "",                              200.00, "430a2299"],
  ["2026-07-05", "Bank Charge", "Bank Charge",       "Stamp Duty",                                   "Zenith", "",                               50.00, "aa87359d"],
  ["2026-07-05", "Expense",     "Food & Household",  "Grinded Pepper",                               "Cash",   "",                             1000.00, "e369874c"],
  ["2026-07-05", "Expense",     "Food & Household",  "Onions",                                       "Cash",   "",                             1000.00, "30c99b7b"],
  ["2026-07-05", "Expense",     "Food & Household",  "Cray Fish",                                    "Cash",   "",                             1000.00, "3cec8bde"],
  ["2026-07-05", "Expense",     "Food & Household",  "Spices [Larsor]",                              "Cash",   "",                              500.00, "cee4afd9"],
  ["2026-07-05", "Expense",     "Food & Household",  "Fish",                                         "Cash",   "",                             1000.00, "8290c013"],
  ["2026-07-06", "Expense",     "Transport",         "Transport to Sabo",                            "Cash",   "",                              300.00, "de68b3fc"],
  ["2026-07-06", "Expense",     "Transport",         "Transport to Road 13",                         "Cash",   "",                              400.00, "19616137"],
  ["2026-07-06", "Expense",     "Discretionary",     "Biscuits",                                     "Cash",   "",                             1000.00, "a6341948"],
  ["2026-07-06", "Expense",     "Internet",          "Data Subscription for SH",                     "Opay",   "",                             2000.00, "aed443d4"],
  ["2026-07-06", "Expense",     "Transport",         "Transport to Lekki Gate",                      "Cash",   "",                              300.00, "65d18822"],
  ["2026-07-06", "Expense",     "Transport",         "Transport home",                               "Cash",   "",                              300.00, "d3745ed2"],
  ["2026-07-07", "Expense",     "Transport",         "Transport to Sabo",                            "Cash",   "",                              300.00, "9329225b"],
  ["2026-07-07", "Expense",     "Discretionary",     "Screwdriver purchase",                         "Cash",   "",                             2500.00, "397ceebb"],
  ["2026-07-07", "Expense",     "Discretionary",     "Corn Purchase",                                "Cash",   "",                              400.00, "3e2e6d91"],
  ["2026-07-07", "Expense",     "Discretionary",     "Clothes Dryer Purchase",                       "Zenith", "",                            39000.00, "a6f85afe"],
  ["2026-07-07", "Bank Charge", "Bank Charge",       "Stamp Duty and Transfer Fee",                  "Zenith", "",                               76.88, "09dc0939"],
  ["2026-07-07", "Expense",     "Discretionary",     "Transfer to SH",                               "Zenith", "",                             5000.00, "7e8c05bb"],
  ["2026-07-07", "Bank Charge", "Bank Charge",       "Transfer Fee",                                 "Zenith", "",                               10.75, "a076b1f0"],
  ["2026-07-07", "Bank Charge", "Bank Charge",       "Stamp Duty",                                   "Zenith", "",                              200.00, "ab4c57fd"],
  ["2026-07-08", "Transfer",    "Discretionary",     "Cash Withdrawal",                              "Zenith", "Cash",                        10000.00, "3bc30020"],
  ["2026-07-08", "Bank Charge", "Bank Charge",       "POS Charge",                                   "Zenith", "",                              200.00, "30ed3d14"],
  ["2026-07-08", "Bank Charge", "Bank Charge",       "Stamp Duty",                                   "Zenith", "",                               50.00, "878b1872"],
  ["2026-07-08", "Expense",     "Discretionary",     "Funds to SH",                                  "Cash",   "",                             3000.00, "13dba7c5"],
  ["2026-07-08", "Transfer",    "Discretionary",     "Zenith Top-up",                                "Opay",   "Zenith",                       1000.00, "09581768"],
  ["2026-07-08", "Expense",     "Clothes",           "New Clothes",                                  "Zenith", "",                           115000.00, "81686997"],
  ["2026-07-08", "Bank Charge", "Bank Charge",       "Stamp Duty",                                   "Zenith", "",                               50.00, "6ca0d370"],
  ["2026-07-08", "Bank Charge", "Bank Charge",       "Transfer Fee for cloth purchase",               "Zenith", "",                               53.75, "a7e47c5d"],
  ["2026-07-08", "Income",      "Discretionary",     "Transfer from SH",                             "",       "Zenith",                      30000.00, "fdb4d4e6"],
  ["2026-07-09", "Expense",     "Discretionary",     "Airtime for Dad",                              "Zenith", "",                             1500.00, "ed3e427b"],
  ["2026-07-09", "Expense",     "Discretionary",     "Airtime for Mum",                              "Zenith", "",                             1500.00, "76c27685"],
  ["2026-07-08", "Expense",     "Subscriptions",     "iCloud+ Subscription",                         "Zenith", "",                             2952.20, "b90fe637"],
];

// Opening balances in Naira
const ACCOUNTS: Record<string, { openingNaira: number; type: string }> = {
  "Zenith":                      { openingNaira: 719803.97, type: "Bank" },
  "Opay":                        { openingNaira: 1373.30,   type: "Bank" },
  "Cash":                        { openingNaira: 0,         type: "Cash" },
  "Wema":                        { openingNaira: 0,         type: "Bank" },
  "Mainstreet Flexi":            { openingNaira: 6999.06,   type: "Investment" },
  "CP Compass (Emergency Fund)": { openingNaira: 0,         type: "Investment" },
  "CP Compass (Clothing Fund)":  { openingNaira: 0,         type: "Investment" },
  "CP Compass (New Place Fund)": { openingNaira: 0,         type: "Investment" },
};

// ─── Compute balances exactly like the engine ───

const balances: Record<string, number> = {};
for (const [name, info] of Object.entries(ACCOUNTS)) {
  balances[name] = info.openingNaira;
}

const budgetSpent: Record<string, number> = {};

for (const row of RAW_DAILY_LOG) {
  const [, v1Type, category, , fromAccount, toAccount, amountNaira] = row;
  const eventType = V1_TYPE_MAP[v1Type];
  const isLiquidAccount = (name: string) => {
    const acc = ACCOUNTS[name];
    return acc && ["Bank", "Cash"].includes(acc.type);
  };

  switch (eventType) {
    case "EXPENSE_RECORDED":
      // Debit fromAccount
      if (fromAccount && balances[fromAccount] !== undefined) {
        balances[fromAccount] -= amountNaira;
      }
      // Count toward budget
      budgetSpent[category.trim()] = (budgetSpent[category.trim()] || 0) + amountNaira;
      break;

    case "INCOME_RECEIVED":
      // Credit toAccount (or fromAccount)
      const creditTarget = toAccount || fromAccount;
      if (creditTarget && balances[creditTarget] !== undefined) {
        balances[creditTarget] += amountNaira;
      }
      break;

    case "TRANSFER_COMPLETED":
      // Debit from, credit to
      if (fromAccount && balances[fromAccount] !== undefined) {
        balances[fromAccount] -= amountNaira;
      }
      if (toAccount && balances[toAccount] !== undefined) {
        balances[toAccount] += amountNaira;
      }
      break;

    case "SAVINGS_CONTRIBUTION":
      // Debit from, credit to
      if (fromAccount && balances[fromAccount] !== undefined) {
        balances[fromAccount] -= amountNaira;
      }
      if (toAccount && balances[toAccount] !== undefined) {
        balances[toAccount] += amountNaira;
      }
      break;

    case "RECEIVABLE_RECORDED":
      // For liquid accounts (Bank/Cash) — DO NOT debit (engine liquid cash protection)
      // For investment accounts — credit toAccount
      if (fromAccount && isLiquidAccount(fromAccount)) {
        // Skip — liquid cash protection
      } else if (fromAccount && balances[fromAccount] !== undefined) {
        balances[fromAccount] -= amountNaira;
      }
      break;
  }
}

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  FinanceOS V3 — Balance Verification (Naira)");
console.log("═══════════════════════════════════════════════════════════\n");

console.log("ACCOUNT BALANCES (after processing all 115 transactions):\n");
let totalNetWorth = 0;
for (const [name, info] of Object.entries(ACCOUNTS)) {
  const bal = balances[name];
  totalNetWorth += bal;
  const formatted = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(bal);
  const opening = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2 }).format(info.openingNaira);
  console.log(`  ${name.padEnd(32)} Opening: ₦${opening.padStart(12)}  →  Balance: ₦${formatted.padStart(12)}`);
}

const netFormatted = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(totalNetWorth);
console.log(`\n  ${"TOTAL NET WORTH".padEnd(32)}                               ₦${netFormatted.padStart(12)}`);

console.log("\n\nBUDGET SPENDING BY CATEGORY (Jul-26):\n");
const budgetPlan: Record<string, number> = {
  "Food & Household": 85000,
  "Transport": 65000,
  "Tithe": 65601.94,
  "Internet": 30000,
  "Pet Care": 20000,
  "Discretionary": 121667,
  "Clothing Fund": 15000,
  "Emergency Fund": 50000,
  "New Place Fund (CP Compass)": 208333,
  "Investment": 82084.42,
  "Subscriptions": 8000,
};

for (const [cat, planned] of Object.entries(budgetPlan)) {
  const spent = budgetSpent[cat] || 0;
  const remaining = planned - spent;
  const pct = planned > 0 ? Math.round((spent / planned) * 100) : 0;
  console.log(`  ${cat.padEnd(32)} Planned: ₦${planned.toFixed(2).padStart(12)}  Spent: ₦${spent.toFixed(2).padStart(12)}  Remaining: ₦${remaining.toFixed(2).padStart(12)}  (${pct}%)`);
}

// Unbudgeted categories
for (const [cat, spent] of Object.entries(budgetSpent)) {
  if (!budgetPlan[cat]) {
    console.log(`  ${cat.padEnd(32)} Planned: ₦${"0.00".padStart(12)}  Spent: ₦${spent.toFixed(2).padStart(12)}  [UNBUDGETED]`);
  }
}

console.log(`\n  Total events processed: ${RAW_DAILY_LOG.length}`);
console.log("═══════════════════════════════════════════════════════════\n");
