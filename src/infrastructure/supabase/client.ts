import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseCredentials {
  url: string;
  key: string;
}

/**
 * Creates or gets a Supabase client instance using either user-provided credentials
 * or environment variables (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).
 */
export function getSupabaseClient(customCreds?: SupabaseCredentials | null): SupabaseClient | null {
  const url = customCreds?.url || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = customCreds?.key || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!url || !key) {
    return null;
  }

  try {
    return createClient(url, key, {
      auth: {
        persistSession: false,
      },
    });
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    return null;
  }
}

export class FinanceSupabaseService {
  private client: SupabaseClient;
  private userId: string;

  constructor(client: SupabaseClient, userId: string = "default_user") {
    this.client = client;
    this.userId = userId;
  }

  /**
   * Upserts all financial events into the `finance_events` table in PostgreSQL.
   *
   * IMPORTANT: We always ensure payload contains fromAccountId and toAccountId
   * so that the reconciliation engine can correctly resolve account columns
   * when events are fetched back from Supabase.
   */
  async upsertEvents(events: any[]): Promise<{ success: boolean; count: number; error?: string }> {
    if (!events || events.length === 0) {
      return { success: true, count: 0 };
    }

    const sanitizeIsoTimestamp = (ts: any): string => {
      if (!ts || typeof ts !== "string") return new Date().toISOString();
      const d = new Date(ts);
      if (!isNaN(d.getTime())) return d.toISOString();

      const monthMap: Record<string, string> = {
        jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
        jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
      };
      const match = ts.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})(.*)$/);
      if (match) {
        const day = match[1].padStart(2, "0");
        const month = monthMap[match[2].toLowerCase()] || "01";
        let year = match[3];
        if (year.length === 2) year = "20" + year;
        const timePart = match[4] && match[4].includes(":") ? match[4] : "T12:00:00.000Z";
        const fixedDate = new Date(`${year}-${month}-${day}${timePart}`);
        if (!isNaN(fixedDate.getTime())) return fixedDate.toISOString();
      }
      return new Date().toISOString();
    };

    const rows = events.map((event) => {
      const eventId = event.eventId || event.id || crypto.randomUUID();
      // Preserve the raw amount as-is — the baseline data is already in kobo
      const amount = Number(event.amount || event.payload?.amount || 0);

      // Ensure payload always carries fromAccountId and toAccountId for reconciliation
      const payload = { ...(event.payload || {}) };
      if (!payload.fromAccountId && event.accountName) {
        payload.fromAccountId = event.accountName;
      }
      if (!payload.fromAccountId && event.accountId) {
        payload.fromAccountId = event.accountId;
      }
      // Preserve toAccountId if present
      if (!payload.toAccountId && event.toAccountName) {
        payload.toAccountId = event.toAccountName;
      }

      return {
        event_id: eventId,
        user_id: this.userId,
        timestamp: sanitizeIsoTimestamp(event.timestamp),
        event_type: event.eventType || event.type || "ExpenseRecorded",
        budget_cycle_id: event.budgetCycleId || "Jul-26",
        account_id: event.accountName || event.accountId || event.payload?.fromAccountId || event.payload?.toAccountId || null,
        amount,
        payload,
        category: event.category || event.payload?.category || "General",
        description: event.description || event.payload?.description || "",
        updated_at: event.updated_at ? sanitizeIsoTimestamp(event.updated_at) : new Date().toISOString(),
        deleted_at: event.deleted_at ? sanitizeIsoTimestamp(event.deleted_at) : null,
      };
    });

    // Atomic constraint is now enforced by Postgres TRIGGER `check_stale_finance_events`
    // which automatically nullifies any UPDATE where incoming updated_at <= existing updated_at.
    const { error } = await this.client
      .from("finance_events")
      .upsert(rows, { onConflict: "event_id" });

    if (error) {
      console.error("Supabase upsertEvents error:", error);
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: rows.length };
  }

  /**
   * Fetches all financial events for the current user from PostgreSQL.
   *
   * CRITICAL: Maps back to the exact shape that reconcileAccount / resolveAccountColumns expects:
   * - accountName (for fromId resolution)
   * - payload.fromAccountId / payload.toAccountId
   */
  async getEvents(): Promise<any[]> {
    let { data, error } = await this.client
      .from("finance_events")
      .select("*")
      .eq("user_id", this.userId)
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("Supabase getEvents error:", error);
      throw new Error(`Failed to fetch remote events from Supabase: ${error.message}`);
    }

    return (data || []).map((row: any) => {
      const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload || {};

      return {
        id: row.event_id,
        eventId: row.event_id,
        timestamp: row.timestamp,
        type: row.event_type,
        eventType: row.event_type,
        budgetCycleId: row.budget_cycle_id,
        accountName: row.account_id || payload.fromAccountId || payload.toAccountId || "Unknown",
        amount: Number(row.amount || 0),
        category: row.category || "General",
        description: row.description || "",
        payload: payload,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
      };
    });
  }

  /**
   * Upserts all accounts into the `finance_accounts` table.
   *
   * Stores openingBalance in the JSONB metadata column or as a separate field
   * so it can be retrieved without loss.
   */
  async upsertAccounts(accounts: any[]): Promise<{ success: boolean; count: number; error?: string }> {
    if (!accounts || accounts.length === 0) return { success: true, count: 0 };

    const rows = accounts.map((acc) => ({
      id: acc.id,
      user_id: this.userId,
      name: acc.name,
      type: acc.type || "Bank",
      currency: acc.currency || "NGN",
      balance: Number(acc.openingBalance !== undefined ? acc.openingBalance : (acc.balance || 0)),
      is_active: acc.isActive !== false && (acc.status || "Active").toLowerCase() !== "inactive",
      updated_at: acc.updated_at || new Date().toISOString(),
      deleted_at: acc.deleted_at || null,
    }));

    const { error } = await this.client
      .from("finance_accounts")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      console.error("Supabase upsertAccounts error:", error);
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: rows.length };
  }

  /**
   * Fetches accounts from PostgreSQL.
   * openingBalance is NOT stored in Supabase — it is always anchored from baseline data
   * by reconcileAllState in appContext.tsx. We only return the raw fields here.
   */
  async getAccounts(): Promise<any[]> {
    const { data, error } = await this.client
      .from("finance_accounts")
      .select("*")
      .eq("user_id", this.userId);

    if (error) {
      console.error("Supabase getAccounts error:", error);
      throw new Error(`Failed to fetch accounts from Supabase: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type || "Bank",
      currency: row.currency,
      balance: Number(row.balance || 0),
      openingBalance: Number(row.balance || 0),
      institution: row.name,
      status: row.is_active ? "Active" : "Inactive",
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
    }));
  }

  /**
   * Upserts all budget records into `finance_budgets`.
   */
  async upsertBudgets(budgets: any[]): Promise<{ success: boolean; count: number; error?: string }> {
    if (!budgets || budgets.length === 0) return { success: true, count: 0 };

    const rows = budgets.map((b) => ({
      id: b.id,
      user_id: this.userId,
      budget_cycle_id: b.budgetCycleId || b.cycleId || "Jul-26",
      category: b.category || b.name || "General",
      limit_amount: Number(b.planned || b.limitAmount || 0),
      spent_amount: Number(b.spent || b.spentAmount || 0),
      updated_at: b.updated_at || new Date().toISOString(),
      deleted_at: b.deleted_at || null,
    }));

    const { error } = await this.client
      .from("finance_budgets")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      console.error("Supabase upsertBudgets error:", error);
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: rows.length };
  }

  /**
   * Fetches budget records from PostgreSQL.
   */
  async getBudgets(): Promise<any[]> {
    const { data, error } = await this.client
      .from("finance_budgets")
      .select("*")
      .eq("user_id", this.userId);

    if (error) {
      console.error("Supabase getBudgets error:", error);
      throw new Error(`Failed to fetch budgets from Supabase: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      budgetCycleId: row.budget_cycle_id,
      cycleId: row.budget_cycle_id,
      category: row.category,
      name: row.category,
      planned: Number(row.limit_amount || 0),
      limitAmount: Number(row.limit_amount || 0),
      spent: Number(row.spent_amount || 0),
      spentAmount: Number(row.spent_amount || 0),
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
      color: "#635BFF", // Default; will be overridden by baseline if matched
    }));
  }
}

export class UserSupabaseService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async getUserByEmail(email: string) {
    return this.client.from("finance_users").select("*").eq("email", email).single();
  }

  async getUserByUsername(username: string) {
    return this.client.from("finance_users").select("*").eq("username", username).single();
  }

  async upsertUser(user: any) {
    return this.client.from("finance_users").upsert([user], { onConflict: "email" });
  }

  async updatePassword(email: string, passwordHash: string) {
    return this.client.from("finance_users").update({ 
      password_hash: passwordHash,
      updated_at: new Date().toISOString()
    }).eq("email", email);
  }

  async updateOnboarding(email: string, hasCompleted: boolean) {
    return this.client.from("finance_users").update({ 
      has_completed_onboarding: hasCompleted,
      updated_at: new Date().toISOString()
    }).eq("email", email);
  }

  async checkUserRecordsCount(email: string) {
    return this.client.from("finance_users").select("id", { count: "exact", head: true }).eq("email", email);
  }
}

export class OtpSupabaseService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async upsertOtp(otpRecord: any) {
    return this.client.from("finance_verification_codes").upsert([otpRecord], { onConflict: "email" });
  }

  async getOtp(email: string) {
    return this.client.from("finance_verification_codes").select("*").eq("email", email).single();
  }

  async markOtpVerified(email: string) {
    return this.client.from("finance_verification_codes").update({ verified: true }).eq("email", email);
  }

  async deleteOtp(email: string) {
    return this.client.from("finance_verification_codes").delete().eq("email", email);
  }
}
