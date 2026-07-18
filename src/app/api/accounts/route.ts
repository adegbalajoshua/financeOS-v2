import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseClient, FinanceSupabaseService } from "@/infrastructure/supabase/client";
import { AccountSchema } from "@/domain/events/schemas";
import { z } from "zod";

/**
 * GET /api/accounts
 * Fetches all accounts from Supabase PostgreSQL for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session || (!session.user?.email && !session.user?.id)) {
      // Unauthenticated offline/local-first user: do not expose shared fallback cloud data
      return NextResponse.json({ status: "ok", accounts: [] });
    }
    const userId = session.user.email || session.user.id;

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ status: "ok", accounts: [] });
    }

    const service = new FinanceSupabaseService(supabase, userId);
    const accounts = await service.getAccounts();

    return NextResponse.json({ status: "ok", accounts });
  } catch (error: any) {
    console.error("GET /api/accounts error:", error);
    return NextResponse.json({ error: "Failed to fetch account records." }, { status: 500 });
  }
}

/**
 * POST /api/accounts
 * Upserts batched accounts into Supabase PostgreSQL for the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session || (!session.user?.email && !session.user?.id)) {
      return NextResponse.json(
        { error: "Unauthorized. Valid authentication session required to sync accounts." },
        { status: 401 }
      );
    }
    const userId = session.user.email || session.user.id;

    const body = await req.json().catch(() => ({}));
    const { accounts, account } = body;
    const rawAccounts = Array.isArray(accounts) ? accounts : account ? [account] : [];

    if (!rawAccounts.length) {
      return NextResponse.json({ status: "ok", count: 0 });
    }

    // Validate incoming objects with flexible Zod schema pass-through to block malformed inputs or prototype pollution
    const validationResult = z.array(AccountSchema.passthrough()).safeParse(rawAccounts);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: `Invalid account schema: ${validationResult.error.issues.map((i) => i.message).join(", ")}` },
        { status: 400 }
      );
    }
    const accountsToUpsert = validationResult.data;

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ status: "ok", appendedCount: accountsToUpsert.length });
    }

    const service = new FinanceSupabaseService(supabase, userId);
    const result = await service.upsertAccounts(accountsToUpsert);

    if (!result.success) {
      return NextResponse.json({ error: "Failed to save account records." }, { status: 500 });
    }

    return NextResponse.json({ status: "ok", appendedCount: result.count });
  } catch (error: any) {
    console.error("POST /api/accounts error:", error);
    return NextResponse.json({ error: "An unexpected error occurred while saving accounts." }, { status: 500 });
  }
}

/**
 * DELETE /api/accounts
 * Deletes accounts from Supabase PostgreSQL by id for the authenticated user.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session || (!session.user?.email && !session.user?.id)) {
      return NextResponse.json(
        { error: "Unauthorized. Valid authentication session required to delete accounts." },
        { status: 401 }
      );
    }
    const userId = session.user.email || session.user.id;

    const body = await req.json().catch(() => ({}));
    const { accountId, accountIds } = body;
    const rawIds = Array.isArray(accountIds) ? accountIds : accountId ? [accountId] : [];

    if (!rawIds.length) {
      return NextResponse.json({ status: "ok", count: 0 });
    }

    const validationResult = z.array(z.string().min(1)).safeParse(rawIds);
    if (!validationResult.success) {
      return NextResponse.json({ error: "Invalid account ID format for deletion." }, { status: 400 });
    }
    const idsToDelete = validationResult.data;

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ status: "ok", deletedCount: idsToDelete.length });
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("finance_accounts")
      .update({ deleted_at: now, updated_at: now })
      .eq("user_id", userId)
      .in("id", idsToDelete);

    if (error) {
      console.error("DELETE /api/accounts error:", error);
      return NextResponse.json({ error: "Database error while deleting accounts." }, { status: 500 });
    }

    return NextResponse.json({ status: "ok", deletedCount: idsToDelete.length });
  } catch (error: any) {
    console.error("DELETE /api/accounts error:", error);
    return NextResponse.json({ error: "Failed to delete accounts." }, { status: 500 });
  }
}