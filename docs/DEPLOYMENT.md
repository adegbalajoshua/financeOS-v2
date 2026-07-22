# Deployment Guide

This guide details the process for deploying the FinanceOS Next.js application to a production environment.

## Prerequisites
You must secure a hosting provider that supports Next.js applications (e.g., Vercel, Railway, or a custom Node.js server).
You must create a Supabase project.

## Supabase Configuration
Execute the schema migration script located in `docs/supabase_schema.sql` against your Supabase SQL Editor.
Lock down the Row Level Security (RLS) policies. You must deny all public access to the tables.
Copy the `service_role` key from the Supabase dashboard. You must never expose this key to the client.

## Environment Variables
Configure the following environment variables in your deployment hosting dashboard:

- `NEXT_PUBLIC_SUPABASE_URL`: The URL of your Supabase project.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The public anonymous key for Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: The secret service-role key for Supabase.
- `AUTH_SECRET`: A secure, randomly generated string for signing session tokens.
- `NEXTAUTH_URL`: The public canonical URL of your deployed application (e.g., `https://financeos.example.com`).
- `ENABLE_DEMO_ACCOUNTS`: Set this value to `false`.

### SMTP Configuration
Provide your SMTP credentials to enable email verification delivery:
- `SMTP_HOST`: The hostname of your SMTP provider.
- `SMTP_PORT`: The connection port for the provider.
- `SMTP_USER`: Your SMTP username.
- `SMTP_PASS`: Your SMTP password.
- `NOTIFICATION_FROM_EMAIL`: The sender email address.

## Deployment Steps
1. Push your repository to your version control system (e.g., GitHub, GitLab).
2. Connect your hosting provider to the repository.
3. Add the required environment variables to the deployment configuration.
4. Initiate the build process. The hosting provider will automatically run `npm install` and `npm run build`.
5. Verify the deployment by accessing the application URL.
6. Attempt to register a new account to test the SMTP email delivery.
