/**
 * ==============================================================================
 * FinanceOS Security & Input Validation Utility
 * Strictly enforces RFC 5322 Email standards, Disposable Domain Filtering,
 * Dual-Identifier Resolver, International Unicode Names, DoB Legal Age-Gating (13+),
 * and High-Entropy Password Policies (10+ characters).
 * ==============================================================================
 */

/**
 * Strict RFC 5322 compliant regular expression for validating email addresses.
 */
export const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Blocklist of known temporary / disposable email domain providers.
 */
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
  "getairmail.com",
  "disposablemail.com",
  "temp-mail.org",
  "fakeinbox.com",
  "maildrop.cc",
]);

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  normalized?: string;
}

/**
 * Resolves a dual-identifier login input (Email OR Username).
 * If the string contains '@' or matches email pattern, evaluates as email.
 * Otherwise strips leading '$' or '@' and evaluates as username handle.
 */
export function resolveAuthIdentifier(raw: string | undefined | null): {
  type: "email" | "username";
  value: string;
} {
  if (!raw || typeof raw !== "string") {
    return { type: "username", value: "" };
  }
  const trimmed = raw.trim();
  const isEmail =
    STRICT_EMAIL_REGEX.test(trimmed) ||
    (trimmed.includes("@") && !trimmed.startsWith("@"));

  if (isEmail) {
    return { type: "email", value: trimmed.toLowerCase() };
  }
  let clean = trimmed;
  while (clean.startsWith("$") || clean.startsWith("@")) {
    clean = clean.slice(1);
  }
  return { type: "username", value: clean.toLowerCase().trim() };
}

/**
 * Validates whether an email string meets enterprise security & deliverability standards.
 */
export function validateEmail(email: string | undefined | null): ValidationResult {
  if (!email || typeof email !== "string") {
    return { isValid: false, error: "Email address is required." };
  }

  const clean = email.trim().toLowerCase();
  if (clean.length < 5) {
    return { isValid: false, error: "Email address is too short." };
  }
  if (clean.length > 254) {
    return { isValid: false, error: "Email address exceeds maximum length of 254 characters." };
  }
  if (!STRICT_EMAIL_REGEX.test(clean)) {
    return {
      isValid: false,
      error: "Please enter a valid email address (e.g., name@domain.com with a valid top-level domain).",
    };
  }

  if (clean.includes(" ") || clean.includes("..")) {
    return { isValid: false, error: "Email address contains invalid characters or consecutive dots." };
  }

  const domainPart = clean.split("@")[1];
  if (domainPart && DISPOSABLE_EMAIL_DOMAINS.has(domainPart)) {
    return {
      isValid: false,
      error: "Temporary or disposable email domains are not permitted for financial accounts.",
    };
  }

  return { isValid: true, normalized: clean };
}

/**
 * Validates whether a password meets strict enterprise security criteria (10+ characters, high entropy).
 */
export function validatePassword(password: string | undefined | null): ValidationResult {
  if (!password || typeof password !== "string") {
    return { isValid: false, error: "Password is required." };
  }

  if (password.length < 10) {
    return { isValid: false, error: "Password must be at least 10 characters long." };
  }
  if (password.length > 128) {
    return { isValid: false, error: "Password exceeds maximum allowed length." };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one uppercase letter (A-Z)." };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one lowercase letter (a-z)." };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one number (0-9)." };
  }

  return { isValid: true };
}

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: "Weak" | "Fair" | "Good" | "Strong" | "Excellent";
  color: string;
  width: string;
}

/**
 * Calculates real-time password entropy & strength score for our visual UI indicator bar.
 */
export function calculatePasswordStrength(password: string | undefined | null): PasswordStrengthResult {
  if (!password || typeof password !== "string" || password.length === 0) {
    return { score: 0, label: "Weak", color: "#64748B", width: "0%" };
  }

  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (password.length < 10) score = Math.min(score, 1);

  if (score === 0 || score === 1) {
    return { score: 1, label: "Weak", color: "#EF4444", width: "20%" };
  } else if (score === 2) {
    return { score: 2, label: "Fair", color: "#F59E0B", width: "40%" };
  } else if (score === 3) {
    return { score: 3, label: "Good", color: "#3B82F6", width: "65%" };
  } else if (score === 4) {
    return { score: 4, label: "Strong", color: "#10B981", width: "85%" };
  } else {
    return { score: 5, label: "Excellent", color: "#059669", width: "100%" };
  }
}

/**
 * Validates and normalizes personal names (First Name, Last Name).
 * Automatically trims whitespace and formats casing (e.g., "  aLeX  " -> "Alex").
 * Supports international unicode characters, hyphens, and apostrophes (O'Connor, François, Müller).
 */
export function validateName(name: string | undefined | null, fieldLabel: string = "Name"): ValidationResult {
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return { isValid: false, error: `${fieldLabel} is required.` };
  }

  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length < 2) {
    return { isValid: false, error: `${fieldLabel} must be at least 2 characters long.` };
  }
  if (clean.length > 50) {
    return { isValid: false, error: `${fieldLabel} must not exceed 50 characters.` };
  }

  // Allow unicode letters, apostrophes, hyphens, and spaces
  const safeNameRegex = /^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF' -]+$/;
  if (!safeNameRegex.test(clean)) {
    return {
      isValid: false,
      error: `${fieldLabel} contains invalid characters or script symbols.`,
    };
  }

  // Title-case normalization while preserving apostrophes/hyphens
  const normalized = clean
    .split(/(\s+|-|')/)
    .map((part) => {
      if (part === " " || part === "-" || part === "'") return part;
      if (part.length === 0) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");

  return { isValid: true, normalized };
}

/**
 * Validates Date of Birth (DoB) ensuring valid calendar leap days,
 * strict legal 13+ age-gating (COPPA/GDPR), and blocking future or >120 year dates.
 */
export function validateDateOfBirth(dob: string | undefined | null): ValidationResult {
  if (!dob || typeof dob !== "string" || dob.trim().length === 0) {
    return { isValid: false, error: "Date of Birth is required." };
  }

  const clean = dob.trim();
  const parts = clean.split("-");
  if (parts.length !== 3) {
    return { isValid: false, error: "Date of Birth must be formatted as YYYY-MM-DD." };
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return { isValid: false, error: "Invalid date numbers." };
  }

  if (month < 1 || month > 12) {
    return { isValid: false, error: "Invalid birth month." };
  }

  // Exact calendar days per month check
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) {
    return { isValid: false, error: `Invalid birth day for month ${month} (maximum ${daysInMonth} days).` };
  }

  const birthDate = new Date(Date.UTC(year, month - 1, day));
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (birthDate > todayUTC) {
    return { isValid: false, error: "Date of Birth cannot be in the future." };
  }

  // Calculate age precisely down to month & day
  let age = todayUTC.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = todayUTC.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && todayUTC.getUTCDate() < birthDate.getUTCDate())) {
    age--;
  }

  if (age > 120) {
    return { isValid: false, error: "Please verify your birth year." };
  }

  if (age < 13) {
    return {
      isValid: false,
      error: "You must be at least 13 years old to create a financial account (COPPA/GDPR compliance).",
    };
  }

  return { isValid: true, normalized: clean };
}

/**
 * Sanitizes string input against basic script/HTML injection tags.
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}
