# Changelog

All notable changes to FinanceOS are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Implemented real Supabase PostgreSQL persistence replacing the legacy Google Sheets backend.
- Added NextAuth authentication layer with secure session cookie verification.
- Implemented robust Row Level Security (RLS) blocking all public anonymous access.
- Implemented a brute-force prevention system for email verification codes (5-attempt lockout).
- Implemented a 60-second cooldown period between verification code requests.
- Added soft-deletion support across all database tables.
- Added Gmail SMTP delivery failover for verification emails.

### Changed
- Migrated the application architecture to Next.js App Router.
- Upgraded the currency calculation engine to store all amounts in Kobo (base units) rather than decimal Naira to prevent floating point math errors.

### Fixed
- Fixed unauthenticated dashboard access bug by validating the JWT signature inside the Next.js middleware.
- Fixed permissive database access by forcing the backend to use the highly restricted `service_role` key.
- Fixed the offline-sync system by enforcing strict `updated_at` checks via Supabase database triggers to prevent stale writes. This protection is strictly limited to the `finance_events`, `finance_accounts`, and `finance_budgets` tables.
- Fixed frontend UI validation to accurately report verification email send failures.

### Security
- Completely isolated the database behind strict server-only service-role credentials.
- Reset the repository's git history to cleanly decouple from an unrelated legacy Vanilla JS project.

---

## Legacy (Google Apps Script era)

*(The following entries reflect the state of the codebase before the Next.js migration.)*

### [1.0.0] - Stable Release

#### Fixed
- Resolved the dashboard Income subtraction bug by updating the `resolveAccountColumns` function.  
- The system now correctly maps 'Income' types to the `toAccount` field and leaves the `fromAccount` empty, ensuring `FinanceEngine` credits the balance properly.
- Fixed the Telegram webhook ledger reversal issue by completely removing manual column writing from `gateway.js`.  
- The `doPost` webhook now parses the incoming payload and delegates the actual database write to the shared `submitNewTransaction` pipeline.
- Dashboard "Recent Activity" timeline was rendering `receivableList` instead of actual transactions, and colored entries by array index rather than transaction type. `FinanceEngine.generateDashboardPayload` now returns a `recentTransactions` array (most recent 8, newest first), and `Components.renderTimeline` colors/signs each entry by its real `Type` (Income/Receivable credit, Transfer neutral, everything else debit).

#### Changed
- Centralized transaction architecture so that external webhooks and internal frontend submissions both utilize the same validation and formatting rules.  
- Improved data safety in `FinanceEngine` by upgrading the `_parseNum` method.  
- The engine now strips all non-numeric characters from incoming string values, leaving only digits, decimals, and minus signs before performing calculations.  

#### Added
- Implemented automated cache clearing via `API.clearCache()`.  
- The cache is now dynamically wiped whenever a new transaction is appended to the ledger.  
- The cache is also explicitly wiped at the end of the `startNewCycle` automation workflow to ensure the dashboard reflects the newly funded cycle immediately.
- Edit and delete for individual transactions from the dashboard's Recent Activity panel. Backed by a new `Transaction ID` column in `Daily Log` (additive, MINOR version) and two new endpoints, `updateTransaction` and `deleteTransaction`. A **financeOS → Backfill Transaction IDs** menu action populates IDs for transactions logged before this change.
- Cycle Trends view: a bar chart comparing income vs. spend across every budget cycle in `Daily Log`, via a new `trending-up` header button.
- Manage panel: add/edit accounts (soft-delete only, via Deactivate) and add/edit/delete budget lines for the active cycle, without touching the spreadsheet directly. New endpoints: `fetchTrendsData`, `fetchManageData`, `submitAccount`, `deactivateAccount`, `submitBudgetLine`, `deleteBudgetLine`.

### [0.1.0] - Initial Public Preparation

#### Added
- Modular backend: `Database`, `FinanceEngine`, `API`, `Analytics`, `Automation`, `Gateway`, `Menu`.
- Responsive dashboard frontend with ApexCharts donut and area charts, Motion One entrance animations, Lucide icons.
- Budget cycle rollover workflow (`startNewCycle`) with guided prompts for new cycle name and salary funding.
- Native Google Sheets analytics generator (`buildAnalyticsDashboard`) producing pie and column charts directly in a dedicated `Analytics` sheet.
- `doPost` webhook for external transaction logging (Telegram-style `"Description : Amount"` shorthand parsing).
- Document-scoped caching via `CacheService` for dashboard payloads, keyed per budget cycle.
- Transaction modal supporting Expense, Income, and Transfer entry types.
- Dark mode with `localStorage` persistence and live ApexCharts theme switching.
