import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseClient, FinanceSupabaseService } from "@/infrastructure/supabase/client";
import { BaseFinancialEventSchema } from "@/domain/events/schemas";
import { z } from "zod";

/**
 * GET /api/events/sync
 * Fetches all events for the current user directly from Supabase PostgreSQL.
 */
export async function GET(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session || (!session.user?.email && !session.user?.id)) {
      return NextResponse.json({
        status: "ok",
        events: [],
        message: "Offline session active.",
      });
    }
    const userId = session.user.email || session.user.id;

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({
        status: "ok",
        events: [],
        message: "Supabase credentials not configured in environment. Running purely local-first.",
      });
    }

    const service = new FinanceSupabaseService(supabase, userId);
    const events = await service.getEvents();

    return NextResponse.json({ status: "ok", events });
  } catch (error: any) {
    console.error("GET /api/events/sync error:", error);
    return NextResponse.json({ error: "Failed to fetch event records." }, { status: 500 });
  }
}

/**
 * POST /api/events/sync
 * Upserts batched events into Supabase PostgreSQL.
 */
export async function POST(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session || (!session.user?.email && !session.user?.id)) {
      return NextResponse.json(
        { error: "Unauthorized. Valid authentication session required to sync events." },
        { status: 401 }
      );
    }
    const userId = session.user.email || session.user.id;

    const body = await req.json().catch(() => ({}));
    const { events, event } = body;
    const rawEvents = Array.isArray(events) ? events : event ? [event] : [];

    if (!rawEvents.length) {
      return NextResponse.json({ status: "ok", count: 0 });
    }

    const validationResult = z.array(BaseFinancialEventSchema.passthrough()).safeParse(rawEvents);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: `Invalid event schema: ${validationResult.error.issues.map((i) => i.message).join(", ")}` },
        { status: 400 }
      );
    }
    const eventsToUpsert = validationResult.data;

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({
        status: "ok",
        appendedCount: eventsToUpsert.length,
        message: "Supabase credentials not configured; events saved to local storage.",
      });
    }

    const service = new FinanceSupabaseService(supabase, userId);
    const result = await service.upsertEvents(eventsToUpsert);

    if (!result.success) {
      return NextResponse.json({ error: "Failed to save event records." }, { status: 500 });
    }

    return NextResponse.json({
      status: "ok",
      appendedCount: result.count,
      message: `Successfully synced ${result.count} event(s).`,
    });
  } catch (error: any) {
    console.error("POST /api/events/sync error:", error);
    return NextResponse.json({ error: "An unexpected error occurred while saving events." }, { status: 500 });
  }
}

/**
 * PUT /api/events/sync
 * Updates existing events in Supabase PostgreSQL (via upsert).
 */
export async function PUT(req: NextRequest) {
  return POST(req);
}

/**
 * DELETE /api/events/sync
 * Deletes events from Supabase PostgreSQL by eventId.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session || (!session.user?.email && !session.user?.id)) {
      return NextResponse.json(
        { error: "Unauthorized. Valid authentication session required to delete events." },
        { status: 401 }
      );
    }
    const userId = session.user.email || session.user.id;

    const body = await req.json().catch(() => ({}));
    const { eventIds, eventId } = body;
    const rawIds = Array.isArray(eventIds) ? eventIds : eventId ? [eventId] : [];

    if (!rawIds.length) {
      return NextResponse.json({ status: "ok", count: 0 });
    }

    const validationResult = z.array(z.string().min(1)).safeParse(rawIds);
    if (!validationResult.success) {
      return NextResponse.json({ error: "Invalid event ID format for deletion." }, { status: 400 });
    }
    const idsToDelete = validationResult.data;

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ status: "ok", deletedCount: idsToDelete.length });
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("finance_events")
      .update({ deleted_at: now, updated_at: now })
      .eq("user_id", userId)
      .in("event_id", idsToDelete);

    if (error) {
      console.error("DELETE /api/events/sync error:", error);
      return NextResponse.json({ error: "Database error while deleting events." }, { status: 500 });
    }

    return NextResponse.json({ status: "ok", deletedCount: idsToDelete.length });
  } catch (error: any) {
    console.error("DELETE /api/events/sync error:", error);
    return NextResponse.json({ error: "Failed to delete events." }, { status: 500 });
  }
}