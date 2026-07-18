# Automation Engine

## Overview
FinanceOS V3 is designed to reduce manual data entry. The `AutomationService` (`src/application/services/automationService.ts`) powers these background tasks.

## Recurring Events
Users can define recurring templates (e.g., "Netflix Subscription, ₦5000, 15th of every month"). 
When a user opens the application or a cron job fires, the `generateDueRecurringEvents` method checks the active `BudgetCycle` and automatically injects the `EXPENSE_RECORDED` event if it hasn't been added yet.

## Copy-Forward (Rollover)
At the end of a Budget Cycle, users can trigger a "Close Cycle" action. The `copyForwardBudgetCategories` method evaluates unspent budgets.
- If a user budgeted ₦50,000 for Groceries but only spent ₦40,000, the remaining ₦10,000 can be automatically added to the next cycle's starting allocation or moved to a Savings account based on the user's settings.
