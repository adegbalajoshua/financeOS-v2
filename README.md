# FinanceOS

FinanceOS is a private, local-first financial command center. The application tracks events, manages budgets, and monitors accounts securely. The system stores data on the local device and synchronizes with a cloud database.

## Technology Stack

- **Framework**: Next.js (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Local Caching**: IndexedDB

## Environment Variables

You must set the following environment variables in your `.env.local` file before starting the application:

- `NEXT_PUBLIC_SUPABASE_URL`: The URL of your Supabase project.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The public anonymous key for Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: The highly secret service-role key for Supabase. Keep this key strictly on the server. Never expose this key to the client.
- `AUTH_SECRET`: The secret key that NextAuth uses to sign session tokens.
- `NEXTAUTH_URL`: The canonical URL of your application (e.g., `http://localhost:3000`).
- `ENABLE_DEMO_ACCOUNTS`: Set this to `true` to enable the demo login buttons. Set this to `false` in production.

### Email Delivery (SMTP)

The application uses a standard SMTP relay for email verification. You must set these variables:
- `SMTP_HOST`: The hostname of your SMTP provider (e.g., `smtp.gmail.com`).
- `SMTP_PORT`: The port for your SMTP provider (e.g., `587`).
- `SMTP_USER`: Your SMTP username or email address.
- `SMTP_PASS`: Your SMTP password or application-specific password.
- `NOTIFICATION_FROM_EMAIL`: The email address that users will see as the sender.

*Note: The application previously supported Resend and Brevo. These services currently require a verified custom domain. They are not usable with a generic `@gmail.com` address.*

## Setup Instructions

1. Clone the repository to your local machine.
2. Install the required dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the root directory and configure the variables listed above.
4. Execute the SQL schema from `docs/supabase_schema.sql` in your Supabase SQL Editor.
5. Start the development server:
   ```bash
   npm run dev
   ```
6. Open `http://localhost:3000` in your browser.
