import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getSupabaseClient } from "@/infrastructure/supabase/client";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const logType = searchParams.get("type") || "activity";
    
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database client not available" }, { status: 503 });
    }

    // Since we are hitting a table with RLS USING (false) for anon/authenticated,
    // this query will ONLY succeed because getSupabaseClient() uses the Service Role Key server-side.
    const { data, error } = await supabase
      .from("app_event_log")
      .select("*")
      .eq("log_type", logType)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      logger.error("Failed to query app_event_log:", { error: error.message });
      return NextResponse.json({ error: "Failed to fetch event logs" }, { status: 500 });
    }

    return NextResponse.json({ success: true, events: data || [] });
  } catch (err: any) {
    logger.error("GET /api/admin/logs error:", { error: err?.message || String(err) }, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
