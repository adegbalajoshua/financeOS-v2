import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseClient, FinanceSupabaseService } from "@/infrastructure/supabase/client";
import { AccountSchema, BudgetCycleSchema, BaseFinancialEventSchema } from "@/domain/events/schemas";
import { z } from "zod";

/**
 * Helper to resolve the authenticated user ID and Supabase client.
 * Strictly enforces valid authentication sessions.
 */
async function getContext(req: NextRequest, body?: any) {
  const session: any = await auth();
  if (!session || (!session.user?.email && !session.user?.id)) {
    return { userId: null, client: null, url: "", key: "", error: "Unauthorized. Valid authentication session required." };
  }
  const userId = session.user.email || session.user.id;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const client = getSupabaseClient();
  return { userId, client, url, key: "", error: null };
}

/**
 * POST /api/supabase/sync
 * Upserts local events, accounts, and budgets directly into Supabase PostgreSQL for the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, client, url, error } = await getContext(req, body);

    if (error || !userId) {
      return NextResponse.json({ error: error || "Unauthorized." }, { status: 401 });
    }

    if (!client) {
      return NextResponse.json({
        error: "Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY or provide them in settings."
      }, { status: 400 });
    }

    const { events = [], accounts = [], budgets = [] } = body;

    // Validate payload against schemas
    const validEvents = z.array(BaseFinancialEventSchema.passthrough()).safeParse(events);
    const validAccounts = z.array(AccountSchema.passthrough()).safeParse(accounts);
    const validBudgets = z.array(BudgetCycleSchema.passthrough()).safeParse(budgets);

    if (!validEvents.success || !validAccounts.success || !validBudgets.success) {
      return NextResponse.json({ error: "Invalid data format or schema violation in sync payload." }, { status: 400 });
    }

    const service = new FinanceSupabaseService(client, userId);

    const eventsRes = await service.upsertEvents(validEvents.data);
    if (!eventsRes.success) {
      throw new Error(`Events upsert failed: ${eventsRes.error}`);
    }

    const accountsRes = await service.upsertAccounts(validAccounts.data);
    if (!accountsRes.success) {
      throw new Error(`Accounts upsert failed: ${accountsRes.error}`);
    }

    const budgetsRes = await service.upsertBudgets(validBudgets.data);
    if (!budgetsRes.success) {
      throw new Error(`Budgets upsert failed: ${budgetsRes.error}`);
    }

    return NextResponse.json({
      status: "ok",
      syncedTo: url,
      userId,
      counts: {
        events: eventsRes.count,
        accounts: accountsRes.count,
        budgets: budgetsRes.count,
      },
      message: `✅ Successfully synced ${eventsRes.count} events, ${accountsRes.count} accounts, and ${budgetsRes.count} budgets!`,
    });
  } catch (error: any) {
    console.error("POST /api/supabase/sync error:", error);
    return NextResponse.json({ error: "An error occurred during synchronization." }, { status: 500 });
  }
}

/**
 * GET /api/supabase/sync
 * Fetches remote events, accounts, and budgets from Supabase PostgreSQL for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, client, error } = await getContext(req);

    if (error || !userId) {
      return NextResponse.json({ error: error || "Unauthorized." }, { status: 401 });
    }

    if (!client) {
      return NextResponse.json({
        error: "Missing Supabase credentials."
      }, { status: 400 });
    }

    const service = new FinanceSupabaseService(client, userId);
    const [events, accounts, budgets] = await Promise.all([
      service.getEvents(),
      service.getAccounts(),
      service.getBudgets(),
    ]);

    return NextResponse.json({
      status: "ok",
      userId,
      events,
      accounts,
      budgets,
    });
  } catch (error: any) {
    console.error("GET /api/supabase/sync error:", error);
    return NextResponse.json({ error: "Failed to fetch remote data records." }, { status: 500 });
  }
}
