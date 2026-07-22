# Security Policy

## Architecture Summary
The application is a Next.js web application. The application uses a Supabase PostgreSQL database. Data leaves the local device. The cloud stores the data.

## Authentication
The application uses NextAuth for user sessions. Users log in with credentials. New accounts require an email verification code.

## Protections Currently In Place
The server limits the rate of authentication requests.
The server limits the rate of verification code requests.
The server locks out a verification code after five failed attempts.
The server enforces a cooldown period before a user can request a new verification code.
The application disables demo accounts by default. An environment variable controls the demo accounts.
Production environments require an authentication secret. The application refuses to start without the secret.
The database protects the `finance_events` table against stale writes.
The database protects the `finance_accounts` table against stale writes.
The database protects the `finance_budgets` table against stale writes.

## Known Limitations
The application does not perform differential synchronization.
The client pushes the full local dataset during every sync.
The user interface provides no conflict resolution.
The newest edit silently overwrites older data.
The `finance_users` table lacks write-conflict protection.
The `finance_verification_codes` table lacks write-conflict protection.
Email delivery relies on a personal Gmail SMTP server.
Email delivery does not use a verified sending domain.

## Resolved Security Gaps
The `middleware.ts` file cryptographically verifies session tokens.
The middleware does not just check for cookie presence.
The database enforces strict Row Level Security policies.
The Row Level Security policies block all public access.
The server connects to the database using a secret service role key.
A direct request with the anonymous key returns zero rows.

## Reporting a Vulnerability
Send an email to the maintainer to report a security concern. Provide steps to reproduce the issue.
