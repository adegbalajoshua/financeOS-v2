# Infrastructure Layer

## Overview
The Infrastructure layer (`src/infrastructure`) contains all code that interacts with the outside world. For FinanceOS V3, the primary persistence mechanism is **Google Sheets**.

## Google Sheets Implementation
The system treats Google Sheets strictly as an append-only event store and document database. 

### `GoogleSheetsClient`
A lightweight, edge-compatible wrapper around the native `fetch` API. 
- Automatically injects the user's OAuth access token.
- Provides standard `getRange` and `appendRows` methods.

### Repositories
The Domain layer defines generic interfaces (e.g., `IFinancialEventRepository`). The infrastructure layer implements them (e.g., `GoogleSheetsEventRepository`).
- Repositories abstract the messy logic of converting domain entities into flat spreadsheet rows and parsing rows back into strongly-typed objects.
- This ensures the rest of the application never imports Google APIs or knows that Sheets is the underlying database.

## Authentication
Authentication is handled by NextAuth (`src/auth.ts`) utilizing the Google Provider. 
- Scopes requested: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/spreadsheets`.
- The access token is persisted in the JWT session, allowing server-side route handlers to instantiate the `GoogleSheetsClient` on behalf of the user seamlessly.
