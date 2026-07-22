# API Documentation

The FinanceOS backend uses Next.js API Routes. All requests must include a valid session token cookie. The server validates the JSON Web Token (JWT) signature before processing the request.

## Authentication Routes

### `POST /api/auth/otp/send`
Requests an email verification code.
- **Request Body**: `{ "email": "user@example.com" }`
- **Behavior**: The server generates a random six-digit code. The server stores the code in the database. The server sends the code via SMTP. The system enforces a sixty-second cooldown between requests.

### `POST /api/auth/otp/verify`
Verifies the email verification code.
- **Request Body**: `{ "email": "user@example.com", "code": "123456" }`
- **Behavior**: The server checks the code against the database. The server tracks failed attempts. The server locks out the code after five failures. The server deletes the code after successful verification.

## Data Synchronization Routes

### `GET /api/supabase/sync`
Retrieves the user's data from the database.
- **Query Parameters**: None. The server identifies the user via the session token.
- **Response**: Returns a JSON object containing `events`, `accounts`, and `budgets` arrays.

### `POST /api/supabase/sync`
Synchronizes the local data to the database.
- **Request Body**: `{ "events": [...], "accounts": [...], "budgets": [...] }`
- **Behavior**: The server validates the arrays against Zod schemas. The server passes the payload to the domain services. The domain services push the arrays to the database. The database uses triggers to prevent stale writes.

## Account Management Routes

### `POST /api/auth/register`
Creates a new user profile.
- **Request Body**: `{ "email": "user@example.com", "password": "...", "name": "..." }`
- **Behavior**: The server hashes the password. The server creates the user record in the `finance_users` table.

### `GET /api/auth/check-status`
Checks the onboarding status of a user.
- **Query Parameters**: `email`
- **Response**: Returns `{ "exists": true/false, "hasCompletedOnboarding": true/false }`.
