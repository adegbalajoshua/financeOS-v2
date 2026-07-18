# Finance Engine

## Overview
The **Finance Engine** (`src/domain/financeEngine/engine.ts`) encapsulates all core business logic and calculations for FinanceOS V3. 

It strictly adheres to functional programming principles:
- **Pure Functions**: Receives plain domain entities (e.g., arrays of `FinancialEvent` or `Account`) and returns computed numbers, objects, or updated entities.
- **No Side Effects**: It does not make API requests, it does not query databases, and it does not interact with React or Next.js state.
- **Portability**: The engine can be run on the client-side (for optimistic UI calculations) or on the server-side (for authoritative calculations) interchangeably.

## Key Functions

### `calculateNetWorth(accounts: Account[]): number`
Derives the total net worth from a user's accounts. It natively understands the difference between Asset types (`CHECKING`, `SAVINGS`, `INVESTMENT`) and Liability types (`CREDIT`, `LOAN`), automatically offsetting liabilities against assets.

### `calculateBudgetCycleSummary(events: FinancialEvent[]): { income, expenses }`
Takes an array of events assigned to a specific `BudgetCycle` and aggregates total income and total expenses.

### `projectAccountBalance(account: Account, events: FinancialEvent[]): number`
Given an initial account state and a chronological array of events, this function projects what the account's balance should be. This acts as the event-sourced ledger verification mechanism.

## Testing
The Finance Engine is exhaustively unit-tested using `vitest`. Because it contains no side effects, mocks and stubs are entirely unnecessary. Tests are located in `tests/domain/financeEngine.test.ts`.
