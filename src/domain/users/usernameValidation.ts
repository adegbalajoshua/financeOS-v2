import { z } from "zod";

/**
 * Banned username blocklist preventing system route hijacking and offensive/reserved handles.
 */
export const BANNED_USERNAMES = new Set([
  "admin",
  "administrator",
  "settings",
  "api",
  "help",
  "login",
  "logout",
  "register",
  "signup",
  "signin",
  "null",
  "undefined",
  "root",
  "support",
  "billing",
  "migration",
  "onboarding",
  "dashboard",
  "accounts",
  "budget",
  "events",
  "demo",
  "test",
  "sys",
  "mod",
  "moderator",
  "financeos",
  "superuser",
  "owner",
  "profile",
  "user",
  "users",
  "auth",
  "security",
  "system",
  "status",
  "official",
  "staff",
]);

/**
 * Normalizes a raw username string: strips leading `$` or `@` prefixes, trims whitespace, and converts to lowercase.
 */
export function normalizeUsername(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  let clean = raw.trim();
  while (clean.startsWith("$") || clean.startsWith("@")) {
    clean = clean.slice(1);
  }
  return clean.toLowerCase().trim();
}

/**
 * Zod schema for $username / @handle format validation.
 */
export const UsernameSchema = z
  .string()
  .transform((val) => normalizeUsername(val))
  .pipe(
    z
      .string()
      .min(3, "Username must be at least 3 characters long.")
      .max(20, "Username must not exceed 20 characters.")
      .regex(
        /^[a-z0-9_-]+$/,
        "Username can only contain letters, numbers, underscores, and hyphens without spaces."
      )
      .refine(
        (val) => !BANNED_USERNAMES.has(val),
        { message: "This username is reserved by the system and cannot be claimed." }
      )
  );

/**
 * Helper function to validate and normalize a username.
 */
export function validateUsername(raw: string): {
  isValid: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = normalizeUsername(raw);
  const result = UsernameSchema.safeParse(raw);
  if (!result.success) {
    // Return the first issue message
    const firstMsg = result.error.issues?.[0]?.message || (result.error as any).errors?.[0]?.message || result.error.message || "Invalid username format.";
    return {
      isValid: false,
      normalized,
      error: firstMsg,
    };
  }
  return {
    isValid: true,
    normalized: result.data,
  };
}
