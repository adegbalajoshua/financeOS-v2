import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseClient, FinanceSupabaseService } from "@/infrastructure/supabase/client";
import { BudgetCycleSchema } from "@/domain/events/schemas";
import { z } from "zod";

/**
 * GET /api/budgets
 * Fetches all budget records from Supabase PostgreSQL for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session || (!session.user?.email && !session.user?.id)) {
      return NextResponse.json({ status: "ok", budgets: [] });
    }
    const userId = session.user.email || session.user.id;

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ status: "ok", budgets: [] });
    }

    const service = new FinanceSupabaseService(supabase, userId);
    const budgets = await service.getBudgets();

    return NextResponse.json({ status: "ok", budgets });
  } catch (error: any) {
    console.error("GET /api/budgets error:", error);
    return NextResponse.json({ error: "Failed to fetch budget records." }, { status: 500 });
  }
}

/**
 * POST /api/budgets
 * Upserts batched budget records into Supabase PostgreSQL for the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session || (!session.user?.email && !session.user?.id)) {
      return NextResponse.json(
        { error: "Unauthorized. Valid authentication session required to sync budgets." },
        { status: 401 }
      );
    }
    const userId = session.user.email || session.user.id;

    const body = await req.json().catch(() => ({}));
    const { budgets, budget } = body;
    const rawBudgets = Array.isArray(budgets) ? budgets : budget ? [budget] : [];

    if (!rawBudgets.length) {
      return NextResponse.json({ status: "ok", count: 0 });
    }

    const validationResult = z.array(BudgetCycleSchema.passthrough()).safeParse(rawBudgets);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: `Invalid budget schema: ${validationResult.error.issues.map((i) => i.message).join(", ")}` },
        { status: 400 }
      );
    }
    const budgetsToUpsert = validationResult.data;

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ status: "ok", appendedCount: budgetsToUpsert.length });
    }

    const service = new FinanceSupabaseService(supabase, userId);
    const result = await service.upsertBudgets(budgetsToUpsert);

    if (!result.success) {
      return NextResponse.json({ error: "Failed to save budget records." }, { status: 500 });
    }

    return NextResponse.json({ status: "ok", appendedCount: result.count });
  } catch (error: any) {
    console.error("POST /api/budgets error:", error);
    return NextResponse.json({ error: "An unexpected error occurred while saving budgets." }, { status: 500 });
  }
}

/**
 * DELETE /api/budgets
 * Deletes budget records from Supabase PostgreSQL by id for the authenticated user.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session || (!session.user?.email && !session.user?.id)) {
      return NextResponse.json(
        { error: "Unauthorized. Valid authentication session required to delete budgets." },
        { status: 401 }
      );
    }
    const userId = session.user.email || session.user.id;

    const body = await req.json().catch(() => ({}));
    const { budgetId, budgetIds } = body;
    const rawIds = Array.isArray(budgetIds) ? budgetIds : budgetId ? [budgetId] : [];

    if (!rawIds.length) {
      return NextResponse.json({ status: "ok", count: 0 });
    }

    const validationResult = z.array(z.string().min(1)).safeParse(rawIds);
    if (!validationResult.success) {
      return NextResponse.json({ error: "Invalid budget ID format for deletion." }, { status: 400 });
    }
    const idsToDelete = validationResult.data;

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ status: "ok", deletedCount: idsToDelete.length });
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("finance_budgets")
      .update({ deleted_at: now, updated_at: now })
      .eq("user_id", userId)
      .in("id", idsToDelete);

    if (error) {
      console.error("DELETE /api/budgets error:", error);
      return NextResponse.json({ error: "Database error while deleting budgets." }, { status: 500 });
    }

    return NextResponse.json({ status: "ok", deletedCount: idsToDelete.length });
  } catch (error: any) {
    console.error("DELETE /api/budgets error:", error);
    return NextResponse.json({ error: "Failed to delete budgets." }, { status: 500 });
  }
}