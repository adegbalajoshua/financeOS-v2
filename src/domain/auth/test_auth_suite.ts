import {
  resolveAuthIdentifier,
  validateEmail,
  validatePassword,
  calculatePasswordStrength,
  validateName,
  validateDateOfBirth,
} from "./validation";

function runTests() {
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
    }
  }

  console.log("=== Running Consolidated Auth & Validation Test Suite ===");

  // 1. Dual-Identifier Resolver Tests
  const r1 = resolveAuthIdentifier("demo@financeos.com");
  assert(r1.type === "email" && r1.value === "demo@financeos.com", "Resolves valid email address");

  const r2 = resolveAuthIdentifier("$demo_user");
  assert(r2.type === "username" && r2.value === "demo_user", "Resolves $cashtag handle to clean username");

  const r3 = resolveAuthIdentifier("@demo_user");
  assert(r3.type === "username" && r3.value === "demo_user", "Resolves @username handle to clean username");

  const r4 = resolveAuthIdentifier("demo_user");
  assert(r4.type === "username" && r4.value === "demo_user", "Resolves plain string without symbol as username");

  // 2. Disposable Email Filter Tests
  const e1 = validateEmail("test@mailinator.com");
  assert(!e1.isValid && e1.error?.includes("disposable") === true, "Blocks disposable domain (mailinator.com)");

  const e2 = validateEmail("demo@financeos.com");
  assert(e2.isValid === true, "Permits valid enterprise domain");

  // 3. High-Entropy Password Policy & Strength Score Tests
  const p1 = validatePassword("short");
  assert(!p1.isValid && p1.error?.includes("10 characters") === true, "Enforces 10+ character minimum length");

  const p2 = validatePassword("PasswordWithoutNumber");
  assert(!p2.isValid && p2.error?.includes("number") === true, "Enforces numeric digit requirement");

  const p3 = validatePassword("SecureFinance2026!");
  assert(p3.isValid === true, "Validates strong password with uppercase, lowercase, and number");

  const s1 = calculatePasswordStrength("abc");
  assert(s1.label === "Weak" && s1.score === 1, "Calculates 'Weak' strength for low entropy");

  const s2 = calculatePasswordStrength("SecureFinance2026!");
  assert(s2.label === "Excellent" && s2.score === 5, "Calculates 'Excellent' strength for high entropy (14+ chars & symbols)");

  // 4. International Unicode & Hyphen Name Validation Tests
  const n1 = validateName("  aLeX  ", "First Name");
  assert(n1.isValid === true && n1.normalized === "Alex", "Normalizes casing and trims whitespace on names");

  const n2 = validateName("O'Connor-Smith", "Last Name");
  assert(n2.isValid === true && n2.normalized === "O'Connor-Smith", "Supports hyphens and apostrophes cleanly");

  // 5. Date of Birth Age-Gating & Calendar Leap Day Tests
  const d1 = validateDateOfBirth("2030-01-01");
  assert(!d1.isValid && d1.error?.includes("future") === true, "Blocks future Date of Birth");

  const d2 = validateDateOfBirth("2016-01-01");
  assert(!d2.isValid && d2.error?.includes("13 years old") === true, "Strictly enforces COPPA/GDPR 13+ age requirement");

  const d3 = validateDateOfBirth("2023-02-29");
  assert(!d3.isValid && d3.error?.includes("Invalid birth day") === true, "Rejects impossible calendar leap days (Feb 29 on non-leap year)");

  const d4 = validateDateOfBirth("1998-05-15");
  assert(d4.isValid === true && d4.normalized === "1998-05-15", "Accepts valid adult Date of Birth");

  console.log(`\n=== Test Summary: ${passed}/${total} Passed ===`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
