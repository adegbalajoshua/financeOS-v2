# Domain Model

## Core Entities

The application is built around the following first-class entities. These define the "shape" of the data across the application.

### `Account`
Represents a source or destination of funds.
- **Attributes**: `id`, `userId`, `name`, `type` (Cash, Savings, Investment, Credit, Loan), `status`, `balance`, `currency`.
- **Note**: Balances are always stored in base units (e.g., kobo for NGN) to prevent floating-point precision issues.

### `BudgetCycle`
A distinct period for financial planning and reporting.
- **Attributes**: `id`, `userId`, `name`, `startDate`, `endDate`, `status` (Planned, Active, Closed).
- **Rule**: Never infer the Budget Cycle from an event's date. Events are explicitly assigned to a Budget Cycle ID, ensuring predictable reporting even for edge-case dates (e.g. late month salaries).

### `FinancialEvent`
The fundamental building block of the application's ledger system. This represents an event-sourced architecture where state is derived from an append-only log of events.
- **Attributes**: `id`, `userId`, `budgetCycleId`, `accountId`, `type`, `amount`, `timestamp`, `description`, `category`, `payload`.
- **Types**: `INCOME_RECEIVED`, `EXPENSE_RECORDED`, `TRANSFER_COMPLETED`, `SAVINGS_CONTRIBUTION`, etc.

## Validation Strategy
The Domain Layer is tightly coupled with **Zod Schemas** (`src/application/validation/schemas.ts`). These schemas enforce runtime type safety when receiving payloads from API boundaries, guaranteeing that the Finance Engine never processes malformed data.
