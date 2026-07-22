# Folder Structure

This document outlines the organization of the FinanceOS Next.js repository.

## Root Directory
- `src/`: Contains the entire application source code.
- `docs/`: Contains the project documentation.
- `public/`: Contains static assets like fonts and images.
- `tests/`: Contains automated integration and unit tests.

## Source Directory (`src/`)
- `app/`: Contains the Next.js App Router pages and API routes.
- `components/`: Contains reusable React components.
- `domain/`: Contains the core business logic, separated into `financeEngine`, `auth`, and `events`.
- `infrastructure/`: Contains database clients and external service integrations.
- `lib/`: Contains utility functions and baseline data files.

## Application Architecture Flow
1. A user interacts with a React component in `src/components/`.
2. The component dispatches an action to an API route in `src/app/api/`.
3. The API route calls a service in `src/domain/`.
4. The service performs business logic and calls a client in `src/infrastructure/` to persist data.
