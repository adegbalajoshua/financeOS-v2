/**
 * Scrubs sensitive data from metadata payloads before writing to the database.
 * Explicit Denylist: password, password_hash, passwordHash, code, otp, token,
 * access_token, refresh_token, SUPABASE_SERVICE_ROLE_KEY, AUTH_SECRET, NEXTAUTH_SECRET, apiKey, api_key.
 */

const DENYLIST = new Set([
  "password",
  "password_hash",
  "passwordhash",
  "code",
  "otp",
  "token",
  "access_token",
  "refresh_token",
  "supabase_service_role_key",
  "auth_secret",
  "nextauth_secret",
  "apikey",
  "api_key",
]);

export function sanitizeLogPayload(payload: any): any {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  // Handle Arrays
  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizeLogPayload(item));
  }

  // Deep clone and sanitize Objects
  const sanitized: Record<string, any> = {};
  for (const key of Object.keys(payload)) {
    const lowerKey = key.toLowerCase();
    if (DENYLIST.has(lowerKey)) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof payload[key] === "object" && payload[key] !== null) {
      sanitized[key] = sanitizeLogPayload(payload[key]);
    } else {
      sanitized[key] = payload[key];
    }
  }

  return sanitized;
}
