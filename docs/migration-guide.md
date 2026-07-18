# Migration Guide (Apps Script to V3)

## Overview
Moving from the legacy Google Apps Script version to FinanceOS V3 involves translating flat, non-normalized spreadsheet rows into strictly validated, Event-Sourced `FinancialEvent` objects.

## The Migration Service
The `MigrationService` (`src/application/services/migrationService.ts`) is designed to run once per user.

### Key Transformations
1. **Amount Normalization**: Legacy amounts were tracked as decimals (e.g. `150.50`). V3 tracks everything in base units (Kobo for NGN). The service multiplies all amounts by `100` and rounds them to integers.
2. **Budget Cycle Inference**: The old system did not have explicit Budget Cycles. The service looks at the `Date` column of a legacy transaction and infers a pseudo-cycle (e.g., `MIGRATED_JULY_2026`).
3. **Event Typing**: A simple "Income" string is translated into the strict domain enum `INCOME_RECEIVED`.

## How to Run
A dedicated API endpoint (`/api/migrate`) will trigger the service, reading the `Transactions` sheet from the old Google Sheet, mapping the rows, and batch-appending them to the new `Events` sheet.

**Warning**: Always back up the legacy Google Sheet before triggering the migration route.
