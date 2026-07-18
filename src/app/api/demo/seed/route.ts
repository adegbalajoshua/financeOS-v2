import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/infrastructure/supabase/client";
import { BASELINE_EVENTS, BASELINE_ACCOUNTS, BASELINE_BUDGETS } from "@/lib/baselineData";
import { auth } from "@/auth";

/**
 * Helper to resolve Supabase client from request params or environment.
 */
function getClient(req: NextRequest, body?: any) {
  const url = body?.url || req.nextUrl.searchParams.get("url") || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = body?.key || req.nextUrl.searchParams.get("key") || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return { client: getSupabaseClient({ url, key }), url, key };
}

/**
 * GET /api/demo/seed
 * Retrieves read-only demo baseline from dedicated Supabase tables (`finance_demo_*`).
 * Falls back to local Nigerian baseline if tables are not yet created or empty.
 */
export async function GET(req: NextRequest) {
  try {
    const { client } = getClient(req);

    if (!client) {
      return NextResponse.json({
        success: true,
        seeded: false,
        events: BASELINE_EVENTS,
        accounts: BASELINE_ACCOUNTS,
        budgets: BASELINE_BUDGETS,
        message: "No Supabase credentials configured. Returning local Nigerian baseline data."
      });
    }

    // Attempt to query dedicated read-only demo tables
    const { data: rawEvents, error: evErr } = await client
      .from("finance_demo_events")
      .select("*")
      .order("timestamp", { ascending: false });

    if (evErr || !rawEvents || rawEvents.length === 0) {
      return NextResponse.json({
        success: true,
        seeded: false,
        events: BASELINE_EVENTS,
        accounts: BASELINE_ACCOUNTS,
        budgets: BASELINE_BUDGETS,
        message: "Dedicated demo tables (`finance_demo_events`) empty or not yet created. Using local Nigerian baseline."
      });
    }

    const { data: rawAccounts } = await client.from("finance_demo_accounts").select("*");
    const { data: rawBudgets } = await client.from("finance_demo_budgets").select("*");

    // Map back to standard client EventRecord, AccountRecord, and BudgetRecord formats
    const events = rawEvents.map((row: any) => {
      const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload || {};
      return {
        id: row.event_id || crypto.randomUUID(),
        eventId: row.event_id,
        timestamp: row.timestamp || new Date().toISOString(),
        eventType: row.event_type || "EXPENSE_RECORDED",
        type: row.event_type || "EXPENSE_RECORDED",
        budgetCycleId: row.budget_cycle_id || "Jul-26",
        accountName: row.account_id || payload.fromAccountId || "",
        accountId: row.account_id || payload.fromAccountId || "",
        amount: Number(row.amount || 0),
        payload,
        category: row.category || payload.category || "General",
        description: row.description || payload.description || "",
      };
    });

    const accounts = (rawAccounts && rawAccounts.length > 0)
      ? rawAccounts.map((row: any) => ({
          id: row.id,
          name: row.name,
          type: row.type || "Bank",
          currency: row.currency || "NGN",
          balance: Number(row.balance || 0),
          openingBalance: Number(row.opening_balance || row.balance || 0),
          institution: row.institution || row.name,
          status: row.status || "active",
        }))
      : BASELINE_ACCOUNTS;

    const budgets = (rawBudgets && rawBudgets.length > 0)
      ? rawBudgets.map((row: any) => ({
          id: row.id,
          budgetCycleId: row.budget_cycle_id || "Jul-26",
          category: row.category || "General",
          name: row.category || "General",
          planned: Number(row.limit_amount || 0),
          spent: Number(row.spent_amount || 0),
          color: row.color || "#635BFF",
        }))
      : BASELINE_BUDGETS;

    return NextResponse.json({
      success: true,
      seeded: true,
      events,
      accounts,
      budgets,
      message: `Fetched ${events.length} transactions from dedicated read-only demo tables.`
    });
  } catch (err: any) {
    console.error("GET /api/demo/seed error:", err);
    return NextResponse.json({
      success: true,
      seeded: false,
      events: BASELINE_EVENTS,
      accounts: BASELINE_ACCOUNTS,
      budgets: BASELINE_BUDGETS,
      message: "Fallback to local baseline due to error: " + err.message
    });
  }
}

/**
 * POST /api/demo/seed
 * Seeds the dedicated demo tables (`finance_demo_events`, `finance_demo_accounts`, `finance_demo_budgets`)
 * with the standard Nigerian baseline dataset. Restricts mutation to authenticated sessions or admin secret.
 */
export async function POST(req: NextRequest) {
  try {
    const session: any = await auth();
    const adminSecret = req.headers.get("x-demo-seed-secret");
    const validSecret = process.env.DEMO_SEED_SECRET && adminSecret === process.env.DEMO_SEED_SECRET;

    if (!session?.user && !validSecret) {
      return NextResponse.json({ success: false, error: "Unauthorized. Seeding demo tables requires authentication or valid admin secret." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { client } = getClient(req, body);

    if (!client) {
      return NextResponse.json({
        success: false,
        error: "Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      }, { status: 400 });
    }

    // 1. Seed Accounts
    const accountRows = (BASELINE_ACCOUNTS as any[]).map((acc) => ({
      id: acc.id,
      name: acc.name,
      type: acc.type || "Checking",
      currency: acc.currency || "NGN",
      balance: Number(acc.balance || 0),
      opening_balance: Number(acc.openingBalance !== undefined ? acc.openingBalance : acc.balance),
      institution: acc.institution || acc.name,
      status: acc.status || "active",
      is_active: true,
    }));
    const { error: accErr } = await client.from("finance_demo_accounts").upsert(accountRows, { onConflict: "id" });
    if (accErr) {
      return NextResponse.json({ success: false, error: `Failed to seed finance_demo_accounts: ${accErr.message}. Ensure create_demo_tables.sql has been executed.` }, { status: 500 });
    }

    // 2. Seed Budgets
    const budgetRows = (BASELINE_BUDGETS as any[]).map((b) => ({
      id: b.id,
      budget_cycle_id: b.budgetCycleId || b.cycleId || "Jul-26",
      category: b.category || b.name || "General",
      limit_amount: Number(b.planned || b.limitAmount || 0),
      spent_amount: Number(b.spent || b.spentAmount || 0),
      color: b.color || "#635BFF",
    }));
    const { error: bdgErr } = await client.from("finance_demo_budgets").upsert(budgetRows, { onConflict: "id" });
    if (bdgErr) {
      return NextResponse.json({ success: false, error: `Failed to seed finance_demo_budgets: ${bdgErr.message}` }, { status: 500 });
    }

    // 3. Seed Events
    const eventRows = (BASELINE_EVENTS as any[]).map((ev) => {
      const eventId = ev.eventId || ev.id || crypto.randomUUID();
      const payload = { ...(ev.payload || {}) };
      if (!payload.fromAccountId && ev.accountName) payload.fromAccountId = ev.accountName;
      if (!payload.fromAccountId && ev.accountId) payload.fromAccountId = ev.accountId;

      let safeTs = ev.timestamp || new Date().toISOString();
      try {
        if (isNaN(new Date(safeTs).getTime())) {
          safeTs = new Date().toISOString();
        }
      } catch (_) {
        safeTs = new Date().toISOString();
      }

      return {
        event_id: eventId,
        timestamp: safeTs,
        event_type: ev.eventType || ev.type || "EXPENSE_RECORDED",
        budget_cycle_id: ev.budgetCycleId || "Jul-26",
        account_id: ev.accountName || ev.accountId || payload.fromAccountId || null,
        amount: Number(ev.amount || 0),
        payload,
        category: ev.category || payload.category || "General",
        description: ev.description || payload.description || "",
      };
    });
    const { error: evErr } = await client.from("finance_demo_events").upsert(eventRows, { onConflict: "event_id" });
    if (evErr) {
      return NextResponse.json({ success: false, error: `Failed to seed finance_demo_events: ${evErr.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      counts: {
        events: eventRows.length,
        accounts: accountRows.length,
        budgets: budgetRows.length,
      },
      message: `Successfully seeded dedicated demo tables with ${eventRows.length} transactions, ${accountRows.length} accounts, and ${budgetRows.length} budget targets.`
    });
  } catch (err: any) {
    console.error("POST /api/demo/seed error:", err);
    return NextResponse.json({ success: false, error: err.message || "Server error seeding demo tables." }, { status: 500 });
  }
}
