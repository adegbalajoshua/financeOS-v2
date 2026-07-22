# FinanceOS FAQ

## Why does email verification fail with Brevo or Resend by default?
Gmail sender addresses fail DMARC policy checks when routed through third-party services like Brevo or Resend. You must use a verified domain sender address or configure a direct SMTP workaround. The application provides fallback terminal logging for verification codes during development to bypass this issue.

## What happens if I edit the same transaction on two offline devices?
The application resolves conflicts using a last-write-wins policy. The database enforces this via a trigger on the `updated_at` column. The server rejects the write and returns a conflict error if an incoming update carries an older `updated_at` timestamp than the database record. No manual merge process exists.

## Why do amounts show as kobo internally?
The system stores all financial values as integers representing the smallest currency unit (kobo). This approach completely avoids floating-point arithmetic errors. The frontend converts these integers back to standard decimal formats for display only.
