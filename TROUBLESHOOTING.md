# FinanceOS Troubleshooting Guide

## OTP Email Never Arrives
1. Check that your SMTP environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) are set correctly in your `.env.local` file.
2. Check the server terminal logs. The application prints the 6-digit verification code to the console during development as a fallback if email sending fails.
3. Confirm the sender email address is not a `@gmail.com` address routed through Brevo or Resend, as this triggers DMARC rejections.

## Dashboard Shows No Data After Login
1. Open your browser's developer console and check for Row Level Security (RLS) or authentication errors.
2. Confirm that `SUPABASE_SERVICE_ROLE_KEY` is set correctly in your environment variables. The server requires this key to bypass the strict `USING (false)` RLS policies and return data to the frontend.

## Sync Indicators
- **"Sync Failed"**: This indicates a generic network failure. You do not need to take action. The application will queue the changes locally and retry the synchronization automatically when the network connection is restored.
- **"N changes couldn't be saved"**: This indicates the server actively rejected the update due to a write conflict. This happens when the `updated_at` timestamp of your local change is older than the database record. You must discard the local change and refresh the data to view the latest version.
