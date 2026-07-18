# FinanceOS V3 Architecture

## Overview
FinanceOS V3 is a standalone Next.js web application implementing **Clean Architecture**, **Domain-Driven Design (DDD)**, and an **Event-Sourced** data model. The persistence layer remains **Google Sheets**, but the architecture strictly decouples the domain from infrastructure.

## Clean Architecture Layers

### 1. Presentation Layer (`src/app` & `src/components`)
- **Next.js App Router**: Handles routing, server components, and API routes.
- **UI Components**: Built with React, Tailwind CSS, and shadcn/ui, featuring a premium SaaS (Stripe-like) aesthetic.
- **State**: TanStack Query for server state caching; Zustand for global UI state; React Hook Form + Zod for validation.

### 2. Application Layer (`src/application`)
- **Use Cases**: Encapsulate the core business workflows (e.g., `RecordExpenseUseCase`).
- **Validation**: Zod schemas that validate incoming data before passing it to the domain.
- **Services**: Orchestrates calls between the Presentation layer and the Infrastructure layer.

### 3. Domain Layer (`src/domain`)
- **Entities**: Core data shapes (`User`, `BudgetCycle`, `FinancialEvent`).
- **Finance Engine**: Pure functions that contain business logic (e.g., calculating net worth, projecting budgets). No side effects, no API calls.
- **Repositories**: Abstract interfaces for data persistence (e.g., `IEventRepository`).

### 4. Infrastructure Layer (`src/infrastructure`)
- **Google Sheets API**: Concrete implementations of the Domain Repositories.
- **Authentication**: NextAuth.js handling Google OAuth.
- **Caching**: Local memory or Redis adapters.

## Data Flow
1. User interacts with UI (Presentation).
2. UI calls Next.js Route Handler (`/api/events`).
3. Route Handler invokes an Application Use Case.
4. Use Case uses the Domain Finance Engine to process/validate data.
5. Use Case saves data using an Infrastructure Repository (Google Sheets).
6. Success response propagates back to the UI, which invalidates caches via TanStack Query.

## Next Steps
- Establish NextAuth with Google OAuth.
- Implement the `IFinancialEventRepository` and the Google Sheets implementation.
