# 📘 FinanceOS — Master Technical & User Documentation Guide

Welcome to the comprehensive master reference guide for **FinanceOS**, a state-of-the-art **Local-First Financial Operating System** engineered for speed, privacy, precision, and multi-cloud resilience.

---

## 1. Executive Summary & Core Philosophy

FinanceOS departs from traditional cloud-dependent budgeting apps by adopting a **Local-First Architecture**. Your browser (`via IndexedDB`) is the primary engine and high-speed data store (< 50ms reads/writes). External cloud services (`Google Sheets` and `Supabase PostgreSQL`) act strictly as secondary background backups or migration bridges.

### 🎯 Design Pillars:
1. **Zero Latency**: Financial transactions, chart renderings, and budget reconciliations execute instantly inside memory without waiting for network responses.
2. **Deterministic Exact Accounting**: Zero floating-point rounding errors (`0.1 + 0.2 != 0.3`) through strict Base Integer (`Kobo / Cents`) accounting across every reconciliation calculation.
3. **Dual Cloud Sovereignty**: You own your data. You can back up to your private Google Spreadsheet or your personal Supabase database instance.

---

## 2. Domain Architecture & Financial Engine (`financeEngine`)

All financial intelligence resides inside `src/domain/financeEngine/engine.ts`. The engine is pure, functional, and side-effect free.

### 📐 Base Unit Accounting (Kobo Precision)
To ensure 100% accounting integrity, all monetary values across Events, Accounts, and Budgets are stored as **Base Integers (Kobo in NGN or Cents in USD)**:
- `₦1.00 NGN = 100 Kobo`
- `₦719,803.97 NGN = 71,980,397 Kobo`
Whenever values are displayed on the UI, helper functions like `fmt(kobo)` divide by `100` and format via `Intl.NumberFormat`.

### 🔄 The Double-Entry Reconciliation Engine (`reconcileAllState`)
Whenever an event is added, edited, or synced from cloud storage, the core engine runs deterministic reconciliation:
```typescript
export function reconcileAllState(
  events: FinancialEvent[],
  accounts: Account[],
  budgets: BudgetReport[]
): { reconciledAccounts: Account[]; reconciledBudgets: BudgetReport[] }
```
1. **Account Reset**: Every account starts from its `openingBalance` (or `0`).
2. **Sequential Ledger Execution**: The engine sorts all events chronologically (`timestamp`) and applies debit/credit deltas using exact domain rules:
   - **`EXPENSE_RECORDED` / `Expense` / `Bank Charge`**: Debits `accountName` (`or payload.fromAccountId`).
   - **`INCOME_RECEIVED` / `Income`**: Credits `accountName` (`or payload.toAccountId`).
   - **`TRANSFER_COMPLETED` / `SAVINGS_CONTRIBUTION` / `Transfer` / `Saving` / `Investment`**: Debits `payload.fromAccountId` (`or accountName`) and credits `payload.toAccountId`.
   - **`RECEIVABLE_RECORDED` / `Receivable`**: Recorded in ledger without modifying liquid cash balances (`per V3 domain specifications`).

---

## 3. Interactive Recharts Visualizations (V3 UI/UX Engine)

All flat progress bars across the application have been upgraded to dynamic, responsive **Recharts Donut & Pie Charts** (`recharts` package), wrapped in responsive glassmorphic cards:

### 📈 1. Top Spending Destinations (`src/components/TimelineView.tsx`)
- **Donut Chart Configuration**: `innerRadius={55}`, `outerRadius={80}`, `paddingAngle={3}` with rounded cell caps (`cornerRadius={4}`).
- **Center Hub**: Displays exact `Total Outflow` (₦ formatted) directly inside the donut hub.
- **Custom Frosted Tooltip**: Hovering (`or tapping on mobile`) displays the exact category name, total amount spent, and exact percentage (`%`) of overall expenditure.
- **Legend Grid**: A 2-column card grid below the chart pairs category colors with exact amounts and percentage tags.

### 🏦 2. Portfolio by Institution (`src/app/accounts/page.tsx`)
- **Asset Distribution Chart**: Visualizes liquid wealth distributed across Bank Accounts (`Zenith, OPay, Wema`), Mobile Money (`FastPay, PocketApp`), and High-Yield Investments (`Mainstreet Flexi, CP Compass`).
- **Center Hub**: Displays your live **Total Assets** (`₦`).
- **Liabilities & Net Worth Summary**: Separates liquid assets from debt/credit lines (`Total Liabilities`) to accurately compute Net Worth (`Assets - Liabilities`).

### 🎯 3. Operating Expense Breakdown (`src/app/budget/page.tsx`)
- **Consumption Share Chart**: Breaks down monthly budget consumption across categories (`Food & Household, Transportation, Subscriptions, Discretionary`).
- **Center Hub**: Displays `Operating Spent (`₦`)` against your total monthly limit.

---

## 4. Local-First Storage Layer (`IndexedDB`)

The browser storage engine (`src/infrastructure/local-db/db.ts`) utilizes `idb` to manage the offline database `financeos_local_db` (`v1 schema`).

### 📦 Object Stores:
- `events`: All historical transaction records keyed by `id`.
- `accounts`: Reconciled and active financial accounts.
- `budgets`: Budget category definitions and spent counters.
- `syncMeta`: Key-value metadata tracking `lastSync_<spreadsheetId>` timestamps.

### ⚡ Boot Sequence & Cache Invalidation (`BASELINE_VERSION`)
At application startup (`src/lib/appContext.tsx`), the bootloader verifies `localStorage.getItem("financeos_baseline_version")`.
If the version string differs from the current active release (`e.g., v1-public-starter-...`), the bootloader automatically wipes outdated local caches and initializes clean baseline data from `src/lib/baselineData.ts` within **< 50 milliseconds**.

---

## 5. Dual Cloud Synchronization Engine

### 📊 Google Sheets API Integration (`src/infrastructure/googleSheets/client.ts`)
When connected via Google OAuth, the `GoogleSheetsClient` directly calls the Google Sheets REST API v4:
- **`getRange(range)`**: Reads raw row arrays (`e.g., 'Daily Log'!A2:J`).
- **`appendRow(range, values)`**: Appends newly composed transactions from `EventComposer.tsx` directly to remote sheet tabs (`USER_ENTERED` value input option).
- **`updateRange / clearRange`**: Synchronizes batch edits and cleans out deleted event IDs.

### ⚡ Supabase PostgreSQL Database (`src/infrastructure/supabase/client.ts`)
When Supabase sync is active, `FinanceSupabaseService` connects to your cloud database table schema:
- **`financial_events`**: Stores full event JSON payloads, timestamps, and account references.
- **`accounts`**: Maintains cloud backups of account types, opening balances, and live statuses.
- **`budget_cycles`**: Stores monthly/cycle limits and categories.
- **`net_worth_snapshots`**: Captures daily/weekly asset valuation history.

---

## 6. Spreadsheet & Legacy Data Migration Structure

For users migrating existing financial sheets via **`/onboarding` or `/migration`**, your spreadsheet columns (`Daily Log` or `Events` tab) should match this layout:

| Column | Header Name | Data Type | Description | Example |
|---|---|---|---|---|
| A | Date | Date/String | ISO date or formatted string | `2026-07-09` |
| B | Budget Cycle | String | Cycle identifier | `Jul-26` |
| C | Event Type | String | Core category classification | `Expense`, `Income`, `Transfer` |
| D | Category | String | Budget category | `Food & Household` |
| E | Description | String | Transaction description | `Bread from Duchess Bakery` |
| F | From Account | String | Source account | `Zenith` / `Main Checking` |
| G | To Account | String | Destination account (`Transfers/Income`) | `CP Compass (Emergency Fund)` |
| H | Amount | Number | Amount in Base Currency (`₦ / $`) | `2800.00` |
| I | Notes | String | Optional metadata / receipt ID | `783c3b2f-26c0-49f7-...` |

---

## 7. Developer API Reference & Automated Verification

### 🌐 Key Backend Route Handlers (`src/app/api/...`):
- **`POST /api/events/sync`**: Receives local event payloads and appends/updates Google Sheets or Supabase records.
- **`DELETE /api/events/sync`**: Batch removes deleted `eventId` references from remote cloud storage.
- **`POST /api/migration/sheet-to-supabase`**: Direct server-side bridge reading all tabs (`Accounts, Budget, Daily Log`) from a Google Sheet and inserting clean relational rows into Supabase PostgreSQL.

### 🧪 Running Reconciliation Test Suites
To verify accounting integrity and schema compliance across all accounts and events:
```bash
npm test
```
Runs the **Vitest** test suite (`tests/domain/financeEngine.test.ts` and `src/domain/financeEngine/__tests__/engine.test.ts`), validating 11 rigorous double-entry accounting scenarios with zero tolerance for calculation discrepancies.