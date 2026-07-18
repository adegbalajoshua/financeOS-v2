/**
 * FinanceOS — Nigerian Demo Baseline Data (Fictional)
 *
 * All data in this file is ENTIRELY FICTIONAL. No real persons, accounts,
 * or transactions are referenced. This dataset is designed to showcase
 * the FinanceOS platform for Nigerian users.
 *
 * All monetary amounts are stored in KOBO (Naira × 100).
 * ₦850,000.00 → 85_000_000 kobo
 *
 * Period: 27 Jun 2026 – 26 Jul 2026 (one full month, "Jul-26" cycle)
 */

// Inline types to avoid circular import with appContext.tsx
interface EventRecord {
  id: string;
  type: string;
  amount: number;
  category: string;
  timestamp: string;
  accountName: string;
  description?: string;
  eventId?: string;
  eventType?: string;
  budgetCycleId?: string;
  payload?: any;
}
interface AccountRecord {
  id: string;
  name: string;
  type: string;
  balance: number;
  openingBalance?: number;
  institution?: string;
  status?: string;
}
interface BudgetRecord {
  id: string;
  name: string;
  planned: number;
  spent: number;
  color: string;
  category?: string;
  cycleId?: string;
  type?: string;
}

// ─── V1 Type → V3 Event Type Mapping ────────────────────────────────────────
// Expense     → EXPENSE_RECORDED     (debit fromAccount)
// Bank Charge → EXPENSE_RECORDED     (debit fromAccount, category "Bank Charge")
// Income      → INCOME_RECEIVED      (credit toAccount)
// Transfer    → TRANSFER_COMPLETED   (debit from, credit to)
// Saving      → SAVINGS_CONTRIBUTION (debit from, credit to)
// Investment  → TRANSFER_COMPLETED   (debit from, credit to — investment accounts)
// Receivable  → RECEIVABLE_RECORDED  (no liquid cash impact per engine rules)

type RawRow = [
  date: string,       // ISO date "2026-06-27"
  v1Type: string,     // "Expense" | "Bank Charge" | "Income" | "Transfer" | "Saving" | "Investment" | "Receivable"
  category: string,   // Budget category
  description: string,
  fromAccount: string, // "" if none
  toAccount: string,   // "" if none
  amountNaira: number, // In Naira (will be × 100 for kobo)
  txId: string,        // Transaction ID
];

const V1_TYPE_MAP: Record<string, string> = {
  "Expense":     "EXPENSE_RECORDED",
  "Bank Charge": "EXPENSE_RECORDED",
  "Income":      "INCOME_RECEIVED",
  "Transfer":    "TRANSFER_COMPLETED",
  "Saving":      "SAVINGS_CONTRIBUTION",
  "Investment":  "TRANSFER_COMPLETED",
  "Receivable":  "RECEIVABLE_RECORDED",
};

// prettier-ignore
export const RAW_DAILY_LOG: RawRow[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // WEEK 1: 27 Jun – 03 Jul 2026
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 27 Jun 2026 (Saturday) ──
  ["2026-06-27", "Expense",     "Food & Groceries",     "Weekend market run at Balogun Market",                "GTBank Salary", "",                    18500.00, "demo-001"],
  ["2026-06-27", "Expense",     "Food & Groceries",     "Tomatoes, pepper and onions from Mile 12",            "Cash",          "",                     4200.00, "demo-002"],
  ["2026-06-27", "Expense",     "Transport",            "Bolt ride to Lekki market",                           "GTBank Salary", "",                     2800.00, "demo-003"],
  ["2026-06-27", "Bank Charge", "Bank Charge",          "Transfer fee and stamp duty",                         "GTBank Salary", "",                      160.75, "demo-004"],
  ["2026-06-27", "Transfer",    "Transport",            "ATM cash withdrawal for transport",                   "GTBank Salary", "Cash",                10000.00, "demo-005"],
  ["2026-06-27", "Bank Charge", "Bank Charge",          "ATM withdrawal charge",                               "GTBank Salary", "",                      200.00, "demo-006"],

  // ── 28 Jun 2026 (Sunday) ──
  ["2026-06-28", "Expense",     "Giving & Support",     "Monthly family support transfer",                     "GTBank Salary", "",                    25000.00, "demo-007"],
  ["2026-06-28", "Bank Charge", "Bank Charge",          "Transfer fee",                                        "GTBank Salary", "",                       53.75, "demo-008"],
  ["2026-06-28", "Expense",     "Food & Groceries",     "Lunch at Mama Put restaurant",                        "Cash",          "",                     1500.00, "demo-009"],
  ["2026-06-28", "Expense",     "Entertainment",        "DSTV compact subscription renewal",                   "Kuda Daily",   "",                    10500.00, "demo-010"],
  ["2026-06-28", "Expense",     "Internet & Data",      "MTN 10GB monthly data bundle",                        "OPay Wallet",  "",                     3500.00, "demo-011"],

  // ── 29 Jun 2026 (Monday) ──
  ["2026-06-29", "Expense",     "Transport",            "BRT card recharge (Ikorodu-CMS)",                     "Cash",          "",                     2000.00, "demo-012"],
  ["2026-06-29", "Expense",     "Food & Groceries",     "Breakfast – Akara and pap from vendor",               "Cash",          "",                      500.00, "demo-013"],
  ["2026-06-29", "Expense",     "Food & Groceries",     "Lunch – Jollof rice and chicken",                     "Cash",          "",                     1800.00, "demo-014"],
  ["2026-06-29", "Expense",     "Personal & Clothing",  "Laundry pickup service",                              "OPay Wallet",  "",                     3000.00, "demo-015"],
  ["2026-06-29", "Bank Charge", "Bank Charge",          "Stamp duty",                                          "GTBank Salary", "",                       50.00, "demo-016"],

  // ── 30 Jun 2026 (Tuesday — Salary Day) ──
  ["2026-06-30", "Income",      "Salary",               "June salary from TechNova Solutions Ltd",              "",              "GTBank Salary",      800000.00, "demo-017"],
  ["2026-06-30", "Expense",     "Housing & Rent",       "Monthly rent installment (Yaba flat)",                 "GTBank Salary", "",                   200000.00, "demo-018"],
  ["2026-06-30", "Bank Charge", "Bank Charge",          "Transfer fee and stamp duty",                         "GTBank Salary", "",                      107.50, "demo-019"],
  ["2026-06-30", "Expense",     "Giving & Support",     "Monthly tithe and offering",                          "GTBank Salary", "",                    80000.00, "demo-020"],
  ["2026-06-30", "Bank Charge", "Bank Charge",          "Transfer fee",                                        "GTBank Salary", "",                       53.75, "demo-021"],
  ["2026-06-30", "Saving",      "Savings & Emergency",  "Emergency fund contribution",                         "GTBank Salary", "PiggyVest Savings",   50000.00, "demo-022"],
  ["2026-06-30", "Bank Charge", "Bank Charge",          "Transfer fee and stamp duty",                         "GTBank Salary", "",                      107.50, "demo-023"],
  ["2026-06-30", "Investment",  "Investment",           "Monthly investment into mutual fund",                  "GTBank Salary", "Cowrywise Invest",    80000.00, "demo-024"],
  ["2026-06-30", "Bank Charge", "Bank Charge",          "Transfer fee and stamp duty",                         "GTBank Salary", "",                      107.50, "demo-025"],
  ["2026-06-30", "Transfer",    "Utilities & Bills",    "Top up OPay wallet for utilities",                    "GTBank Salary", "OPay Wallet",         30000.00, "demo-026"],
  ["2026-06-30", "Bank Charge", "Bank Charge",          "Transfer fee",                                        "GTBank Salary", "",                       10.75, "demo-027"],
  ["2026-06-30", "Transfer",    "Transport",            "Top up Kuda for daily spending",                      "GTBank Salary", "Kuda Daily",          50000.00, "demo-028"],
  ["2026-06-30", "Bank Charge", "Bank Charge",          "Transfer fee",                                        "GTBank Salary", "",                       10.75, "demo-029"],

  // ── 01 Jul 2026 (Wednesday) ──
  ["2026-07-01", "Expense",     "Transport",            "Bolt ride to Victoria Island office",                 "Kuda Daily",    "",                     3500.00, "demo-030"],
  ["2026-07-01", "Expense",     "Food & Groceries",     "Lunch at office canteen",                             "Cash",          "",                     2500.00, "demo-031"],
  ["2026-07-01", "Expense",     "Utilities & Bills",    "Prepaid electricity (PHCN) recharge – 50 units",      "OPay Wallet",   "",                     7500.00, "demo-032"],
  ["2026-07-01", "Expense",     "Transport",            "BRT return trip CMS-Ikorodu",                         "Cash",          "",                     1000.00, "demo-033"],
  ["2026-07-01", "Expense",     "Entertainment",        "Netflix premium subscription",                        "Kuda Daily",    "",                     5500.00, "demo-034"],

  // ── 02 Jul 2026 (Thursday) ──
  ["2026-07-02", "Expense",     "Transport",            "Uber ride to client meeting at Ikeja",                "Kuda Daily",    "",                     4200.00, "demo-035"],
  ["2026-07-02", "Expense",     "Food & Groceries",     "Sharwarma and Chapman at Tastee Fried Chicken",       "Cash",          "",                     4500.00, "demo-036"],
  ["2026-07-02", "Expense",     "Internet & Data",      "GLO 5GB weekly data top-up",                          "OPay Wallet",   "",                     1500.00, "demo-037"],
  ["2026-07-02", "Bank Charge", "Bank Charge",          "Card maintenance fee (Q3)",                           "GTBank Salary", "",                     1050.00, "demo-038"],
  ["2026-07-02", "Expense",     "Personal & Clothing",  "Haircut at local barbing salon",                      "Cash",          "",                     2000.00, "demo-039"],

  // ── 03 Jul 2026 (Friday) ──
  ["2026-07-03", "Expense",     "Food & Groceries",     "Weekend groceries from Shoprite Lekki",               "Kuda Daily",    "",                    22000.00, "demo-040"],
  ["2026-07-03", "Expense",     "Entertainment",        "After-work drinks at Shiro Lagos",                    "Kuda Daily",    "",                     8500.00, "demo-041"],
  ["2026-07-03", "Expense",     "Transport",            "Bolt ride home from Victoria Island",                 "Kuda Daily",    "",                     4800.00, "demo-042"],
  ["2026-07-03", "Bank Charge", "Bank Charge",          "Stamp duty on debit",                                 "Kuda Daily",    "",                       50.00, "demo-043"],
  ["2026-07-03", "Transfer",    "Transport",            "ATM cash withdrawal",                                 "Kuda Daily",    "Cash",                15000.00, "demo-044"],
  ["2026-07-03", "Bank Charge", "Bank Charge",          "ATM withdrawal charge",                               "Kuda Daily",    "",                      200.00, "demo-045"],

  // ═══════════════════════════════════════════════════════════════════════════
  // WEEK 2: 04 Jul – 10 Jul 2026
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 04 Jul 2026 (Saturday) ──
  ["2026-07-04", "Expense",     "Food & Groceries",     "Suya from Glover Court vendor",                       "Cash",          "",                     3000.00, "demo-046"],
  ["2026-07-04", "Expense",     "Food & Groceries",     "Fresh fish and stockfish from Makoko",                "Cash",          "",                     6500.00, "demo-047"],
  ["2026-07-04", "Expense",     "Utilities & Bills",    "Water delivery (dispensed water)",                    "Cash",          "",                     2000.00, "demo-048"],
  ["2026-07-04", "Expense",     "Entertainment",        "Cinema tickets at Filmhouse IMAX Lekki",              "Kuda Daily",    "",                    10000.00, "demo-049"],
  ["2026-07-04", "Expense",     "Food & Groceries",     "Popcorn and drinks at cinema",                        "Cash",          "",                     4500.00, "demo-050"],

  // ── 05 Jul 2026 (Sunday) ──
  ["2026-07-05", "Expense",     "Giving & Support",     "Church offering and seeds",                           "Cash",          "",                     5000.00, "demo-051"],
  ["2026-07-05", "Expense",     "Food & Groceries",     "Sunday rice and stew ingredients",                    "Cash",          "",                     3500.00, "demo-052"],
  ["2026-07-05", "Expense",     "Internet & Data",      "Airtel 3GB weekend data bundle",                      "OPay Wallet",   "",                     1200.00, "demo-053"],
  ["2026-07-05", "Expense",     "Personal & Clothing",  "Pressing and dry cleaning pickup",                    "Cash",          "",                     2500.00, "demo-054"],

  // ── 06 Jul 2026 (Monday) ──
  ["2026-07-06", "Expense",     "Transport",            "Bolt ride to VI office",                              "Kuda Daily",    "",                     3200.00, "demo-055"],
  ["2026-07-06", "Expense",     "Food & Groceries",     "Breakfast – Egg sauce and yam from canteen",          "Cash",          "",                      800.00, "demo-056"],
  ["2026-07-06", "Expense",     "Food & Groceries",     "Lunch – Amala and ewedu at Iya Oyo",                 "Cash",          "",                     1200.00, "demo-057"],
  ["2026-07-06", "Expense",     "Health & Wellness",    "Monthly HMO premium payment",                        "GTBank Salary", "",                    15000.00, "demo-058"],
  ["2026-07-06", "Bank Charge", "Bank Charge",          "Transfer fee and stamp duty",                         "GTBank Salary", "",                       76.88, "demo-059"],
  ["2026-07-06", "Expense",     "Transport",            "Okada ride to Yaba Tech axis",                       "Cash",          "",                      500.00, "demo-060"],

  // ── 07 Jul 2026 (Tuesday) ──
  ["2026-07-07", "Expense",     "Transport",            "BRT Ikorodu-CMS morning commute",                    "Cash",          "",                     1000.00, "demo-061"],
  ["2026-07-07", "Expense",     "Food & Groceries",     "Plantain chips and zobo from vendor",                 "Cash",          "",                      600.00, "demo-062"],
  ["2026-07-07", "Expense",     "Food & Groceries",     "Office lunch – Fried rice and chicken",               "Cash",          "",                     2200.00, "demo-063"],
  ["2026-07-07", "Expense",     "Utilities & Bills",    "Monthly waste management (LAWMA) bill",               "OPay Wallet",   "",                     3500.00, "demo-064"],
  ["2026-07-07", "Expense",     "Personal & Clothing",  "New polo shirts from Primark Lagos",                  "Kuda Daily",    "",                    12000.00, "demo-065"],
  ["2026-07-07", "Bank Charge", "Bank Charge",          "Stamp duty",                                          "Kuda Daily",    "",                       50.00, "demo-066"],

  // ── 08 Jul 2026 (Wednesday) ──
  ["2026-07-08", "Expense",     "Transport",            "Uber ride to Ajah for site visit",                    "Kuda Daily",    "",                     5500.00, "demo-067"],
  ["2026-07-08", "Expense",     "Food & Groceries",     "Packed lunch from Chicken Republic",                  "Kuda Daily",    "",                     3800.00, "demo-068"],
  ["2026-07-08", "Expense",     "Health & Wellness",    "Pharmacy – Vitamin C and paracetamol",                "Cash",          "",                     3200.00, "demo-069"],
  ["2026-07-08", "Saving",      "Savings & Emergency",  "PiggyVest flex autosave",                             "GTBank Salary", "PiggyVest Savings",   10000.00, "demo-070"],
  ["2026-07-08", "Bank Charge", "Bank Charge",          "Transfer fee and stamp duty",                         "GTBank Salary", "",                      107.50, "demo-071"],
  ["2026-07-08", "Expense",     "Giving & Support",     "Airtime gift to senior colleague",                    "OPay Wallet",   "",                     2000.00, "demo-072"],

  // ── 09 Jul 2026 (Thursday) ──
  ["2026-07-09", "Expense",     "Transport",            "BRT morning commute",                                 "Cash",          "",                     1000.00, "demo-073"],
  ["2026-07-09", "Expense",     "Food & Groceries",     "Suya and fanta after work",                           "Cash",          "",                     2000.00, "demo-074"],
  ["2026-07-09", "Expense",     "Internet & Data",      "MTN 2.5GB midweek data top-up",                      "OPay Wallet",   "",                     1500.00, "demo-075"],
  ["2026-07-09", "Receivable",  "Receivable",           "Freelance invoice sent to client (web project)",      "",              "",                   150000.00, "demo-076"],
  ["2026-07-09", "Expense",     "Utilities & Bills",    "Generator diesel – 10 litres",                        "Cash",          "",                    12000.00, "demo-077"],

  // ── 10 Jul 2026 (Friday) ──
  ["2026-07-10", "Expense",     "Entertainment",        "Spotify premium subscription",                        "Kuda Daily",    "",                     2900.00, "demo-078"],
  ["2026-07-10", "Expense",     "Food & Groceries",     "Friday night Shawarma from KFC",                      "Kuda Daily",    "",                     4200.00, "demo-079"],
  ["2026-07-10", "Expense",     "Entertainment",        "Bowling night at Landmark Leisure",                   "Kuda Daily",    "",                     6000.00, "demo-080"],
  ["2026-07-10", "Expense",     "Transport",            "Bolt ride home from VI",                              "Kuda Daily",    "",                     4500.00, "demo-081"],
  ["2026-07-10", "Transfer",    "Transport",            "ATM cash withdrawal for weekend",                     "GTBank Salary", "Cash",                20000.00, "demo-082"],
  ["2026-07-10", "Bank Charge", "Bank Charge",          "ATM withdrawal charge and stamp duty",                "GTBank Salary", "",                      250.00, "demo-083"],

  // ═══════════════════════════════════════════════════════════════════════════
  // WEEK 3: 11 Jul – 17 Jul 2026
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 11 Jul 2026 (Saturday) ──
  ["2026-07-11", "Expense",     "Food & Groceries",     "Bulk food shopping at Spar Lekki",                    "GTBank Salary", "",                    35000.00, "demo-084"],
  ["2026-07-11", "Bank Charge", "Bank Charge",          "POS charge and stamp duty",                           "GTBank Salary", "",                      250.00, "demo-085"],
  ["2026-07-11", "Expense",     "Food & Groceries",     "Pepper grinding at market mill",                      "Cash",          "",                      500.00, "demo-086"],
  ["2026-07-11", "Expense",     "Personal & Clothing",  "Shoe repair at local cobbler",                        "Cash",          "",                     1500.00, "demo-087"],
  ["2026-07-11", "Expense",     "Giving & Support",     "Support for younger sibling's school fees",           "GTBank Salary", "",                    15000.00, "demo-088"],
  ["2026-07-11", "Bank Charge", "Bank Charge",          "Transfer fee and stamp duty",                         "GTBank Salary", "",                      107.50, "demo-089"],

  // ── 12 Jul 2026 (Sunday) ──
  ["2026-07-12", "Expense",     "Giving & Support",     "Sunday offering and thanksgiving",                    "Cash",          "",                     3000.00, "demo-090"],
  ["2026-07-12", "Expense",     "Food & Groceries",     "Ingredients for Sunday jollof rice",                  "Cash",          "",                     4000.00, "demo-091"],
  ["2026-07-12", "Expense",     "Entertainment",        "Spotify playlist session and snacks",                 "Cash",          "",                     1500.00, "demo-092"],

  // ── 13 Jul 2026 (Monday) ──
  ["2026-07-13", "Expense",     "Transport",            "Bolt ride to Ikeja meeting",                          "Kuda Daily",    "",                     4000.00, "demo-093"],
  ["2026-07-13", "Expense",     "Food & Groceries",     "Lunch at The Place restaurant",                       "Kuda Daily",    "",                     5500.00, "demo-094"],
  ["2026-07-13", "Expense",     "Transport",            "Bolt ride back from Ikeja",                           "Kuda Daily",    "",                     3800.00, "demo-095"],
  ["2026-07-13", "Expense",     "Internet & Data",      "Office Wi-Fi subscription (Spectranet)",              "GTBank Salary", "",                    12000.00, "demo-096"],
  ["2026-07-13", "Bank Charge", "Bank Charge",          "Transfer fee and stamp duty",                         "GTBank Salary", "",                       76.88, "demo-097"],

  // ── 14 Jul 2026 (Tuesday) ──
  ["2026-07-14", "Income",      "Freelance",            "Freelance web project payment received",              "",              "GTBank Salary",      150000.00, "demo-098"],
  ["2026-07-14", "Expense",     "Transport",            "BRT commute morning",                                 "Cash",          "",                     1000.00, "demo-099"],
  ["2026-07-14", "Expense",     "Food & Groceries",     "Moi moi and custard for breakfast",                   "Cash",          "",                      700.00, "demo-100"],
  ["2026-07-14", "Expense",     "Food & Groceries",     "Jollof rice from buka for lunch",                     "Cash",          "",                     1500.00, "demo-101"],
  ["2026-07-14", "Saving",      "Savings & Emergency",  "Bonus windfall → emergency fund",                     "GTBank Salary", "PiggyVest Savings",   40000.00, "demo-102"],
  ["2026-07-14", "Bank Charge", "Bank Charge",          "Transfer fee and stamp duty",                         "GTBank Salary", "",                      107.50, "demo-103"],

  // ── 15 Jul 2026 (Wednesday — Mid-Month) ──
  ["2026-07-15", "Expense",     "Utilities & Bills",    "Prepaid electricity (PHCN) recharge – 80 units",      "OPay Wallet",   "",                    12000.00, "demo-104"],
  ["2026-07-15", "Expense",     "Transport",            "Fuel for generator (5L petrol)",                      "Cash",          "",                     4000.00, "demo-105"],
  ["2026-07-15", "Expense",     "Food & Groceries",     "Bread and eggs from local bakery",                    "Cash",          "",                     2500.00, "demo-106"],
  ["2026-07-15", "Investment",  "Investment",           "Additional Cowrywise top-up (target savings)",         "GTBank Salary", "Cowrywise Invest",    20000.00, "demo-107"],
  ["2026-07-15", "Bank Charge", "Bank Charge",          "Transfer fee and stamp duty",                         "GTBank Salary", "",                      107.50, "demo-108"],
  ["2026-07-15", "Expense",     "Health & Wellness",    "Gym membership monthly fee",                          "Kuda Daily",    "",                     8000.00, "demo-109"],

  // ── 16 Jul 2026 (Thursday) ──
  ["2026-07-16", "Expense",     "Transport",            "Uber pool to Surulere client",                        "Kuda Daily",    "",                     2800.00, "demo-110"],
  ["2026-07-16", "Expense",     "Food & Groceries",     "Pack of indomie noodles and eggs",                    "Cash",          "",                      800.00, "demo-111"],
  ["2026-07-16", "Expense",     "Giving & Support",     "Airtime recharge for parent",                         "OPay Wallet",   "",                     3000.00, "demo-112"],
  ["2026-07-16", "Expense",     "Personal & Clothing",  "Face cream and body lotion from Jumia",               "Kuda Daily",    "",                     5500.00, "demo-113"],
  ["2026-07-16", "Bank Charge", "Bank Charge",          "Stamp duty on debit",                                 "Kuda Daily",    "",                       50.00, "demo-114"],

  // ── 17 Jul 2026 (Friday) ──
  ["2026-07-17", "Expense",     "Entertainment",        "Friday hangout at Terra Kulture VI",                  "Kuda Daily",    "",                     7500.00, "demo-115"],
  ["2026-07-17", "Expense",     "Food & Groceries",     "Pepper soup and drinks at hangout",                   "Cash",          "",                     5000.00, "demo-116"],
  ["2026-07-17", "Expense",     "Transport",            "Bolt ride home from VI",                              "Kuda Daily",    "",                     4200.00, "demo-117"],
  ["2026-07-17", "Transfer",    "Transport",            "ATM cash withdrawal",                                 "Kuda Daily",    "Cash",                10000.00, "demo-118"],
  ["2026-07-17", "Bank Charge", "Bank Charge",          "ATM charge",                                          "Kuda Daily",    "",                      200.00, "demo-119"],

  // ═══════════════════════════════════════════════════════════════════════════
  // WEEK 4: 18 Jul – 26 Jul 2026
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 18 Jul 2026 (Saturday) ──
  ["2026-07-18", "Expense",     "Food & Groceries",     "Bulk protein – chicken and beef from Epe market",     "GTBank Salary", "",                    15000.00, "demo-120"],
  ["2026-07-18", "Bank Charge", "Bank Charge",          "POS charge",                                          "GTBank Salary", "",                      200.00, "demo-121"],
  ["2026-07-18", "Expense",     "Personal & Clothing",  "New work trousers from Yaba market",                  "Cash",          "",                     8000.00, "demo-122"],
  ["2026-07-18", "Expense",     "Food & Groceries",     "Fruit basket (oranges, bananas, watermelon)",         "Cash",          "",                     3000.00, "demo-123"],
  ["2026-07-18", "Expense",     "Utilities & Bills",    "Monthly water bill (estate levy)",                    "OPay Wallet",   "",                     5000.00, "demo-124"],

  // ── 19 Jul 2026 (Sunday) ──
  ["2026-07-19", "Expense",     "Giving & Support",     "Church tithes and offering",                          "GTBank Salary", "",                    10000.00, "demo-125"],
  ["2026-07-19", "Bank Charge", "Bank Charge",          "Transfer fee",                                        "GTBank Salary", "",                       53.75, "demo-126"],
  ["2026-07-19", "Expense",     "Food & Groceries",     "Cooking gas refill (12.5kg cylinder)",                "Cash",          "",                    11000.00, "demo-127"],
  ["2026-07-19", "Expense",     "Entertainment",        "YouTube Premium subscription",                        "Kuda Daily",    "",                     1100.00, "demo-128"],

  // ── 20 Jul 2026 (Monday) ──
  ["2026-07-20", "Expense",     "Transport",            "BRT morning commute",                                 "Cash",          "",                     1000.00, "demo-129"],
  ["2026-07-20", "Expense",     "Food & Groceries",     "Beans and plantain for lunch",                        "Cash",          "",                     1200.00, "demo-130"],
  ["2026-07-20", "Expense",     "Internet & Data",      "MTN 3GB booster data pack",                           "OPay Wallet",   "",                     1500.00, "demo-131"],
  ["2026-07-20", "Expense",     "Transport",            "Bolt ride from office to tech meetup at Yaba",        "Kuda Daily",    "",                     2500.00, "demo-132"],
  ["2026-07-20", "Expense",     "Entertainment",        "Tech community meetup refreshments",                  "Cash",          "",                     2000.00, "demo-133"],

  // ── 21 Jul 2026 (Tuesday) ──
  ["2026-07-21", "Expense",     "Transport",            "Morning Bolt ride to office",                         "Kuda Daily",    "",                     3500.00, "demo-134"],
  ["2026-07-21", "Expense",     "Food & Groceries",     "Ofada rice and ayamase for lunch",                    "Cash",          "",                     2500.00, "demo-135"],
  ["2026-07-21", "Expense",     "Health & Wellness",    "Dental checkup and cleaning",                         "GTBank Salary", "",                    10000.00, "demo-136"],
  ["2026-07-21", "Bank Charge", "Bank Charge",          "Transfer fee and stamp duty",                         "GTBank Salary", "",                       76.88, "demo-137"],
  ["2026-07-21", "Expense",     "Transport",            "Evening keke napep home",                             "Cash",          "",                      400.00, "demo-138"],

  // ── 22 Jul 2026 (Wednesday) ──
  ["2026-07-22", "Expense",     "Transport",            "BRT morning commute",                                 "Cash",          "",                     1000.00, "demo-139"],
  ["2026-07-22", "Expense",     "Food & Groceries",     "Eba and egusi soup at mama put",                      "Cash",          "",                     1500.00, "demo-140"],
  ["2026-07-22", "Saving",      "Savings & Emergency",  "Weekly PiggyVest autosave",                           "GTBank Salary", "PiggyVest Savings",   10000.00, "demo-141"],
  ["2026-07-22", "Bank Charge", "Bank Charge",          "Transfer fee and stamp duty",                         "GTBank Salary", "",                      107.50, "demo-142"],
  ["2026-07-22", "Expense",     "Utilities & Bills",    "Electricity recharge – 30 units top-up",              "OPay Wallet",   "",                     4500.00, "demo-143"],
  ["2026-07-22", "Expense",     "Personal & Clothing",  "New office shoes from Jumia",                         "Kuda Daily",    "",                    15000.00, "demo-144"],

  // ── 23 Jul 2026 (Thursday) ──
  ["2026-07-23", "Expense",     "Transport",            "Uber to Lekki Free Trade Zone",                      "Kuda Daily",    "",                     6500.00, "demo-145"],
  ["2026-07-23", "Expense",     "Food & Groceries",     "Lunch – pounded yam and egusi at Jevinik",           "Kuda Daily",    "",                     5500.00, "demo-146"],
  ["2026-07-23", "Expense",     "Transport",            "Uber ride back from Lekki FTZ",                      "Kuda Daily",    "",                     5800.00, "demo-147"],
  ["2026-07-23", "Expense",     "Internet & Data",      "Airtel 4G home router data bundle",                   "OPay Wallet",   "",                     5000.00, "demo-148"],
  ["2026-07-23", "Bank Charge", "Bank Charge",          "Stamp duty",                                          "Kuda Daily",    "",                       50.00, "demo-149"],
  ["2026-07-23", "Expense",     "Health & Wellness",    "Pharmacy – cold medicine and vitamins",               "Cash",          "",                     4500.00, "demo-150"],

  // ── 24 Jul 2026 (Friday) ──
  ["2026-07-24", "Expense",     "Entertainment",        "Friday night karaoke at The Cabana",                  "Kuda Daily",    "",                     8000.00, "demo-151"],
  ["2026-07-24", "Expense",     "Food & Groceries",     "Grilled fish and palm wine at beach hangout",         "Cash",          "",                     6500.00, "demo-152"],
  ["2026-07-24", "Expense",     "Transport",            "Bolt ride to Elegushi beach",                         "Kuda Daily",    "",                     3500.00, "demo-153"],
  ["2026-07-24", "Expense",     "Transport",            "Bolt ride home from Elegushi",                        "Kuda Daily",    "",                     4200.00, "demo-154"],
  ["2026-07-24", "Transfer",    "Transport",            "ATM cash withdrawal for weekend",                     "GTBank Salary", "Cash",                15000.00, "demo-155"],
  ["2026-07-24", "Bank Charge", "Bank Charge",          "ATM charge and stamp duty",                           "GTBank Salary", "",                      250.00, "demo-156"],

  // ── 25 Jul 2026 (Saturday) ──
  ["2026-07-25", "Expense",     "Food & Groceries",     "End-of-month market run at Oyingbo",                  "Cash",          "",                    12000.00, "demo-157"],
  ["2026-07-25", "Expense",     "Food & Groceries",     "Condiments and spices bulk buy",                      "Cash",          "",                     4500.00, "demo-158"],
  ["2026-07-25", "Expense",     "Personal & Clothing",  "Perfume from fragrance shop",                         "Cash",          "",                     5000.00, "demo-159"],
  ["2026-07-25", "Expense",     "Giving & Support",     "Birthday gift for friend",                            "Kuda Daily",    "",                     5000.00, "demo-160"],
  ["2026-07-25", "Bank Charge", "Bank Charge",          "Stamp duty",                                          "Kuda Daily",    "",                       50.00, "demo-161"],
  ["2026-07-25", "Expense",     "Utilities & Bills",    "Cable TV (GoTV) subscription",                        "OPay Wallet",   "",                     4900.00, "demo-162"],

  // ── 26 Jul 2026 (Sunday — Month Close) ──
  ["2026-07-26", "Expense",     "Giving & Support",     "End-of-month offering and charity",                   "Cash",          "",                     5000.00, "demo-163"],
  ["2026-07-26", "Expense",     "Food & Groceries",     "Sunday special – Egusi soup ingredients",             "Cash",          "",                     5000.00, "demo-164"],
  ["2026-07-26", "Expense",     "Entertainment",        "Family movie night (Amazon Prime)",                   "Kuda Daily",    "",                     2300.00, "demo-165"],
  ["2026-07-26", "Saving",      "Savings & Emergency",  "End-of-month emergency fund boost",                   "GTBank Salary", "PiggyVest Savings",   15000.00, "demo-166"],
  ["2026-07-26", "Bank Charge", "Bank Charge",          "Transfer fee and stamp duty",                         "GTBank Salary", "",                      107.50, "demo-167"],
  ["2026-07-26", "Expense",     "Transport",            "Bolt ride to visit family",                           "Kuda Daily",    "",                     3500.00, "demo-168"],
  ["2026-07-26", "Expense",     "Health & Wellness",    "Monthly pharmacy restock – supplements",              "Cash",          "",                     5000.00, "demo-169"],
  ["2026-07-26", "Investment",  "Investment",           "End-of-month Cowrywise investment",                    "GTBank Salary", "Cowrywise Invest",    15000.00, "demo-170"],
  ["2026-07-26", "Bank Charge", "Bank Charge",          "Transfer fee and stamp duty",                         "GTBank Salary", "",                      107.50, "demo-171"],
];

function convertRow(row: RawRow, index: number): EventRecord {
  const [date, v1Type, category, description, fromAccount, toAccount, amountNaira, txId] = row;
  const kobo = Math.round(amountNaira * 100);
  const eventType = V1_TYPE_MAP[v1Type] || "EXPENSE_RECORDED";

  // For Income, the accountName should be the To Account (where money goes)
  // For everything else, accountName is the From Account (where money leaves)
  const accountName = v1Type === "Income"
    ? (toAccount || fromAccount || "GTBank Salary")
    : (fromAccount || "GTBank Salary");

  const payload: Record<string, any> = {};
  if (fromAccount) payload.fromAccountId = fromAccount;
  if (toAccount) payload.toAccountId = toAccount;

  const hour = 8 + (Math.floor(index / 2) % 14);
  const minute = (index * 7) % 60;

  return {
    id: txId,
    eventId: txId,
    type: eventType,
    eventType: eventType,
    amount: kobo,
    category: category.trim(),
    timestamp: `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`,
    accountName: accountName.trim(),
    description,
    budgetCycleId: "Jul-26",
    payload,
  };
}

export const BASELINE_EVENTS: EventRecord[] = RAW_DAILY_LOG.map(convertRow);

export const BASELINE_ACCOUNTS: AccountRecord[] = [
  { id: "GTBank Salary",    name: "GTBank Salary",    type: "Bank",       balance: 85000000,  openingBalance: 85000000,  institution: "Guaranty Trust Bank",  status: "Active" },
  { id: "Zenith Savings",   name: "Zenith Savings",   type: "Savings",    balance: 120000000, openingBalance: 120000000, institution: "Zenith Bank",          status: "Active" },
  { id: "OPay Wallet",      name: "OPay Wallet",      type: "Mobile",     balance: 4500000,   openingBalance: 4500000,   institution: "OPay",                 status: "Active" },
  { id: "Cash",             name: "Cash",             type: "Cash",       balance: 1500000,   openingBalance: 1500000,   institution: "Cash",                 status: "Active" },
  { id: "Kuda Daily",       name: "Kuda Daily",       type: "Bank",       balance: 12500000,  openingBalance: 12500000,  institution: "Kuda Bank",            status: "Active" },
  { id: "PiggyVest Savings",name: "PiggyVest Savings",type: "Investment", balance: 0,         openingBalance: 0,         institution: "PiggyVest",            status: "Active" },
  { id: "Cowrywise Invest", name: "Cowrywise Invest", type: "Investment", balance: 0,         openingBalance: 0,         institution: "Cowrywise",            status: "Active" },
];

export const BASELINE_BUDGETS: BudgetRecord[] = [
  { id: "b-1",  name: "Housing & Rent",       planned: 20000000, spent: 0, color: "#635BFF", category: "Housing & Rent",       cycleId: "Jul-26" },
  { id: "b-2",  name: "Food & Groceries",     planned: 8500000,  spent: 0, color: "#10b981", category: "Food & Groceries",     cycleId: "Jul-26" },
  { id: "b-3",  name: "Transport",            planned: 6500000,  spent: 0, color: "#0ea5e9", category: "Transport",            cycleId: "Jul-26" },
  { id: "b-4",  name: "Utilities & Bills",    planned: 3000000,  spent: 0, color: "#f59e0b", category: "Utilities & Bills",    cycleId: "Jul-26" },
  { id: "b-5",  name: "Internet & Data",      planned: 1500000,  spent: 0, color: "#6366f1", category: "Internet & Data",      cycleId: "Jul-26" },
  { id: "b-6",  name: "Entertainment",        planned: 4000000,  spent: 0, color: "#ec4899", category: "Entertainment",        cycleId: "Jul-26" },
  { id: "b-7",  name: "Savings & Emergency",  planned: 10000000, spent: 0, color: "#14b8a6", category: "Savings & Emergency",  cycleId: "Jul-26" },
  { id: "b-8",  name: "Investment",           planned: 8000000,  spent: 0, color: "#3b82f6", category: "Investment",           cycleId: "Jul-26" },
  { id: "b-9",  name: "Health & Wellness",    planned: 2500000,  spent: 0, color: "#f43f5e", category: "Health & Wellness",    cycleId: "Jul-26" },
  { id: "b-10", name: "Giving & Support",     planned: 5000000,  spent: 0, color: "#8b5cf6", category: "Giving & Support",     cycleId: "Jul-26" },
  { id: "b-11", name: "Personal & Clothing",  planned: 3000000,  spent: 0, color: "#a855f7", category: "Personal & Clothing",  cycleId: "Jul-26" },
];
