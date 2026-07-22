# System Architecture

The FinanceOS application utilizes a layered architecture. The system separates the user interface, backend logic, and database persistence.

## Frontend Layer
The application uses the Next.js App Router for the frontend.
The user interface reads and writes data through local domain services.
The system uses IndexedDB to cache data locally.
The caching layer provides an immediate local response before synchronizing with the server.

## API Layer
The Next.js backend exposes API routes for data synchronization.
The API routes validate incoming payloads against strict Zod schemas.
The API routes verify the JSON Web Token (JWT) signature for every request.
The API routes refuse all unauthenticated requests.

## Domain Services
The domain services handle the core financial calculations.
The system stores all monetary amounts in Kobo (base units) to prevent floating-point calculation errors.
The `verificationService` handles email One-Time Passwords (OTP).
The `verificationService` enforces a strict five-attempt lockout.
The `verificationService` enforces a sixty-second cooldown period between requests.

## Infrastructure Layer
The application uses a Supabase PostgreSQL database for persistent storage.
The `FinanceSupabaseService` executes the queries against the database.
The server connects to Supabase using a secret service-role key.
The backend bypasses Row Level Security via the service-role key.

## Data Synchronization
The application synchronizes data between the local IndexedDB cache and the remote Supabase database.
The synchronization mechanism does not perform differential synchronization.
The client pushes the full local dataset during every sync event.
The system relies on database triggers to prevent stale writes.
The triggers reject updates where the local `updated_at` timestamp is older than the remote timestamp.
The user interface does not currently offer manual conflict resolution.
