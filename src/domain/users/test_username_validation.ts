import { validateUsername, normalizeUsername, BANNED_USERNAMES } from "./usernameValidation";

console.log("==========================================");
console.log("   Running $username Validation Tests     ");
console.log("==========================================\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName} ${detail ? "(" + detail + ")" : ""}`);
    failed++;
  }
}

// 1. Normalization Tests
assert(normalizeUsername("$demo_account") === "demo_account", "Strips leading $ prefix and lowercases");
assert(normalizeUsername("@@Demo_OS  ") === "demo_os", "Strips multiple @ prefixes and trims whitespace");

// 2. Valid Username Tests
const v1 = validateUsername("$demo_os");
assert(v1.isValid && v1.normalized === "demo_os", "Valid alphanumeric with underscore ($demo_os)");

const v2 = validateUsername("dev-user-99");
assert(v2.isValid && v2.normalized === "dev-user-99", "Valid alphanumeric with hyphen (dev-user-99)");

// 3. Invalid Regex / Length Tests
const v3 = validateUsername("jo");
assert(!v3.isValid && v3.error?.includes("at least 3 characters") === true, "Rejects username shorter than 3 characters");

const v4 = validateUsername("verylongusernamethatshouldfail");
assert(!v4.isValid && v4.error?.includes("not exceed 20 characters") === true, "Rejects username longer than 20 characters");

const v5 = validateUsername("demo user");
assert(!v5.isValid, "Rejects username with spaces");

const v6 = validateUsername("demo!@#");
assert(!v6.isValid, "Rejects username with special characters (!@#)");

// 4. Banned Words Blocklist Tests
const v7 = validateUsername("admin");
assert(!v7.isValid && v7.error?.includes("reserved by the system") === true, "Rejects system banned username 'admin'");

const v8 = validateUsername("settings");
assert(!v8.isValid && v8.error?.includes("reserved by the system") === true, "Rejects system banned username 'settings'");

const v9 = validateUsername("api");
assert(!v9.isValid && v9.error?.includes("reserved by the system") === true, "Rejects system banned username 'api'");

console.log("\n==========================================");
console.log(`Test Summary: ${passed} Passed | ${failed} Failed`);
console.log("==========================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
