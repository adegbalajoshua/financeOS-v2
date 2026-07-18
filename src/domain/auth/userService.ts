import bcrypt from "bcryptjs";
import { getSupabaseClient, SupabaseCredentials, UserSupabaseService } from "@/infrastructure/supabase/client";
import { validateEmail, validatePassword, resolveAuthIdentifier } from "@/domain/auth/validation";

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
  name?: string;
  password_hash?: string;
  has_completed_onboarding: boolean;
  created_at?: string;
}

// In-memory session credentials buffer for initial user registration during onboarding flow
// before cloud Supabase connection is established by the user. Attaches to globalThis
// across Next.js API routes and NextAuth callbacks.
const sessionUserBuffer: Record<string, UserProfile> =
  (globalThis as any).financeos_user_buffer || ((globalThis as any).financeos_user_buffer = {});

/**
 * Checks if a user already exists in Supabase PostgreSQL (`finance_users` or events/accounts)
 * or inside our session credentials buffer during initial onboarding setup.
 */
export async function checkUserStatus(email: string, customCreds?: SupabaseCredentials | null): Promise<{
  exists: boolean;
  hasCompletedOnboarding: boolean;
  hasRecords: boolean;
  profile: UserProfile | null;
}> {
  const normalizedEmail = email.toLowerCase().trim();
  const client = getSupabaseClient(customCreds);

  if (!client) {
    console.log(`[Auth Engine] Supabase cloud connection not configured yet. Checking isolated session buffer for ${normalizedEmail}.`);
    const buffered = sessionUserBuffer[normalizedEmail] || null;
    return {
      exists: Boolean(buffered),
      hasCompletedOnboarding: Boolean(buffered?.has_completed_onboarding),
      hasRecords: false,
      profile: buffered,
    };
  }

  try {
    const userSvc = new UserSupabaseService(client);
    // 1. Check finance_users table
    const { data: userRow, error: userError } = await userSvc.getUserByEmail(normalizedEmail);

    if (userError && userError.code !== "PGRST116") { // Ignore "no rows returned" error
      console.error("Supabase checkUserStatus query error:", userError.message);
    }

    // 2. Check finance_events count for this user
    const { count: eventsCount } = await client
      .from("finance_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", normalizedEmail);

    // 3. Check finance_accounts count for this user
    const { count: accountsCount } = await client
      .from("finance_accounts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", normalizedEmail);

    const hasRecords = (eventsCount || 0) > 0 || (accountsCount || 0) > 0;
    const exists = Boolean(userRow) || hasRecords || Boolean(sessionUserBuffer[normalizedEmail]);
    const hasCompletedOnboarding = Boolean(userRow?.has_completed_onboarding) || hasRecords;

    let profile: UserProfile | null = userRow ? {
      id: userRow.id,
      email: userRow.email,
      username: userRow.username || userRow.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_-]/g, "_"),
      first_name: userRow.first_name,
      last_name: userRow.last_name,
      dob: userRow.dob,
      name: userRow.name,
      password_hash: userRow.password_hash,
      has_completed_onboarding: hasCompletedOnboarding,
      created_at: userRow.created_at,
    } : (sessionUserBuffer[normalizedEmail] || null);

    // Auto-register user into public.finance_users if found through auth/events but missing user row
    if (!userRow && (hasRecords || sessionUserBuffer[normalizedEmail])) {
      const newId = profile?.id || crypto.randomUUID();
      const defaultUsername = normalizedEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9_-]/g, "_");
      const newProfile = {
        id: newId,
        email: normalizedEmail,
        username: profile?.username || defaultUsername,
        name: profile?.name || normalizedEmail.split("@")[0],
        password_hash: profile?.password_hash,
        has_completed_onboarding: hasCompletedOnboarding,
        created_at: profile?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      try {
        await userSvc.upsertUser(newProfile);
        profile = {
          id: newProfile.id,
          email: newProfile.email,
          username: newProfile.username,
          name: newProfile.name,
          password_hash: newProfile.password_hash,
          has_completed_onboarding: newProfile.has_completed_onboarding,
          created_at: newProfile.created_at,
        };
      } catch (e) {
        console.error("Auto-creation of finance_users row failed:", e);
      }
    }

    return {
      exists: Boolean(profile) || exists,
      hasCompletedOnboarding,
      hasRecords,
      profile,
    };
  } catch (err: any) {
    console.error("Supabase verification failed, checking session buffer:", err.message);
    const buffered = sessionUserBuffer[normalizedEmail] || null;
    return {
      exists: Boolean(buffered),
      hasCompletedOnboarding: Boolean(buffered?.has_completed_onboarding),
      hasRecords: false,
      profile: buffered,
    };
  }
}

/**
 * Registers a new user with email, password, and name inside Supabase PostgreSQL
 * or inside our session credentials buffer if Supabase has not been connected yet.
 * Encrypts password using bcrypt with salt rounds = 12 (High Security Standard).
 */
export async function registerNewUser(
  email: string,
  passwordPlain: string,
  name?: string,
  customCredsOrUsername?: SupabaseCredentials | null | string,
  maybeCustomCreds?: SupabaseCredentials | null,
  extraFields?: { firstName?: string; lastName?: string; dob?: string }
): Promise<UserProfile> {
  const emailCheck = validateEmail(email);
  if (!emailCheck.isValid) {
    throw new Error(emailCheck.error);
  }
  const passwordCheck = validatePassword(passwordPlain);
  if (!passwordCheck.isValid) {
    throw new Error(passwordCheck.error);
  }

  let customCreds: SupabaseCredentials | null | undefined = maybeCustomCreds;
  let providedUsername: string | undefined = undefined;
  if (typeof customCredsOrUsername === "string") {
    providedUsername = customCredsOrUsername;
  } else if (customCredsOrUsername && typeof customCredsOrUsername === "object") {
    customCreds = customCredsOrUsername;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const status = await checkUserStatus(normalizedEmail, customCreds);

  if (status.exists && status.profile?.password_hash) {
    throw new Error("An account with this email already exists. Please sign in instead.");
  }

  // Encrypt password with salt rounds = 12
  const password_hash = await bcrypt.hash(passwordPlain, 12);
  const id = crypto.randomUUID();
  const defaultUsername = providedUsername?.trim().toLowerCase() || normalizedEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const computedName = name || (extraFields?.firstName && extraFields?.lastName ? `${extraFields.firstName} ${extraFields.lastName}` : normalizedEmail.split("@")[0]);
  
  const newProfile: UserProfile = {
    id,
    email: normalizedEmail,
    username: defaultUsername,
    first_name: extraFields?.firstName,
    last_name: extraFields?.lastName,
    dob: extraFields?.dob,
    name: computedName,
    password_hash,
    has_completed_onboarding: false,
    created_at: new Date().toISOString(),
  };

  // Save to session buffer so user can complete registration and enter onboarding wizard cleanly
  sessionUserBuffer[normalizedEmail] = newProfile;

  const client = getSupabaseClient(customCreds);
  if (client) {
    try {
      const userSvc = new UserSupabaseService(client);
      const { error } = await userSvc.upsertUser({
        id: newProfile.id,
        email: newProfile.email,
        username: newProfile.username,
        first_name: newProfile.first_name,
        last_name: newProfile.last_name,
        dob: newProfile.dob,
        name: newProfile.name,
        password_hash: newProfile.password_hash,
        has_completed_onboarding: false,
        created_at: newProfile.created_at,
        updated_at: newProfile.created_at,
      });

      if (error) {
        if (
          error.code === "23505" ||
          error.message?.toLowerCase().includes("unique") ||
          error.message?.toLowerCase().includes("duplicate")
        ) {
          throw new Error("Sorry, the username $" + newProfile.username + " is already taken by another user.");
        }
        console.error("Warning: Failed to insert into cloud Supabase finance_users:", error.message);
      }
    } catch (err: any) {
      if (err.message?.includes("already taken by another user")) {
        throw err;
      }
      console.error("Supabase upsert error during registration:", err.message);
    }
  } else {
    console.log(`[Auth Engine] Account created in session buffer (${normalizedEmail}). User will connect cloud Supabase inside onboarding.`);
  }

  return newProfile;
}

/**
 * Verifies email and plain text password against Supabase PostgreSQL or session credentials buffer.
 */
export async function verifyUserCredentials(
  identifierOrEmail: string,
  passwordPlain: string,
  customCreds?: SupabaseCredentials | null
): Promise<UserProfile | null> {
  if (!identifierOrEmail || typeof identifierOrEmail !== "string") {
    return null;
  }

  const resolved = resolveAuthIdentifier(identifierOrEmail);

  // Instant Practice / Demo account check for zero-friction access
  if (
    process.env.ENABLE_DEMO_ACCOUNTS === "true" &&
    (resolved.value === "demo@financeos.com" || resolved.value === "practice@financeos.com" || resolved.value === "demo") &&
    (passwordPlain === "demo123" || passwordPlain === "password" || passwordPlain === "practice")
  ) {
    return {
      id: "demo-user-id",
      email: "demo@financeos.com",
      username: "demo",
      first_name: "Demo",
      last_name: "User",
      name: "Demo Account User",
      has_completed_onboarding: true,
      password_hash: "demo-bypass",
    };
  }

  const client = getSupabaseClient(customCreds);

  let userProfile: UserProfile | null = null;
  if (resolved.type === "email") {
    userProfile = sessionUserBuffer[resolved.value] || null;
  } else {
    userProfile = Object.values(sessionUserBuffer).find(
      (u) => u.username?.toLowerCase() === resolved.value
    ) || null;
  }

  if (client) {
    try {
      const userSvc = new UserSupabaseService(client);
      let data: any = null;
      let error: any = null;
      
      if (resolved.type === "email") {
        const res = await userSvc.getUserByEmail(resolved.value);
        data = res.data;
        error = res.error;
      } else {
        const res = await userSvc.getUserByUsername(resolved.value);
        data = res.data;
        error = res.error;
      }

      if (!error && data) {
        userProfile = {
          id: data.id,
          email: data.email,
          username: data.username || data.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_-]/g, "_"),
          first_name: data.first_name,
          last_name: data.last_name,
          dob: data.dob,
          name: data.name,
          password_hash: data.password_hash,
          has_completed_onboarding: data.has_completed_onboarding,
          created_at: data.created_at,
        };
      }
    } catch (err) {
      console.error("Supabase verifyUserCredentials check failed:", err);
    }
  }

  if (!userProfile || !userProfile.password_hash) {
    return null;
  }

  const isMatch = await bcrypt.compare(passwordPlain, userProfile.password_hash);
  if (!isMatch) {
    return null;
  }

  return userProfile;
}

/**
 * Marks onboarding as completed for a user profile in Supabase PostgreSQL and session buffer.
 */
export async function markUserOnboardingComplete(email: string, customCreds?: SupabaseCredentials | null): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  if (sessionUserBuffer[normalizedEmail]) {
    sessionUserBuffer[normalizedEmail].has_completed_onboarding = true;
  }

  const client = getSupabaseClient(customCreds);
  if (!client) return;

  try {
    const defaultUsername = normalizedEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    const userSvc = new UserSupabaseService(client);
    await userSvc.upsertUser({
      id: normalizedEmail,
      email: normalizedEmail,
      username: defaultUsername,
      name: normalizedEmail.split("@")[0],
      has_completed_onboarding: true,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to update onboarding status in Supabase:", err);
  }
}

/**
 * Sets or updates a password hash for an existing user (such as migrating from Google OAuth or password reset).
 */
export async function setUserPassword(email: string, newPasswordPlain: string, customCreds?: SupabaseCredentials | null): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const password_hash = await bcrypt.hash(newPasswordPlain, 12);

  if (sessionUserBuffer[normalizedEmail]) {
    sessionUserBuffer[normalizedEmail].password_hash = password_hash;
  }

  const client = getSupabaseClient(customCreds);
  if (client) {
    try {
      const userSvc = new UserSupabaseService(client);
      const { data } = await userSvc.getUserByEmail(normalizedEmail);
      if (data) {
        await userSvc.updatePassword(normalizedEmail, password_hash);
        return true;
      } else {
        // Create user row if it only existed in events or session buffer before
        const defaultUsername = normalizedEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9_-]/g, "_");
        await userSvc.upsertUser({
          id: crypto.randomUUID(),
          email: normalizedEmail,
          username: defaultUsername,
          name: normalizedEmail.split("@")[0],
          password_hash,
          has_completed_onboarding: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        return true;
      }
    } catch (err: any) {
      console.error("Supabase setUserPassword error:", err.message);
    }
  }
  return true;
}
