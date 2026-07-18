# Application Use Cases

## Overview
The Application layer (`src/application/useCases`) orchestrates business workflows. Use Cases sit between the API route handlers (Presentation) and the Domain/Infrastructure layers.

## Workflow Example: `RecordExpenseUseCase`
1. **Validation**: The Use Case first passes the raw incoming JSON payload through the Zod `FinancialEventSchema`. If the data is malformed, it throws a validation error immediately.
2. **Business Rules**: It asserts that the event type is strictly `EXPENSE_RECORDED`.
3. **Persistence**: It calls `eventRepository.save(event)`. Note that the Use Case does *not* know if the repository is writing to Google Sheets or PostgreSQL; it simply depends on the `IFinancialEventRepository` interface.

## Principles
- **One Use Case per Action**: Operations like "Transfer Funds", "Create Budget Cycle", and "Record Income" should each have their own dedicated Use Case class.
- **Dependency Injection**: Use Cases receive their dependencies (like Repositories) through their constructor. This makes them incredibly easy to mock and unit test.
