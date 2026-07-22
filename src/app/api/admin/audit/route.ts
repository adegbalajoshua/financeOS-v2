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

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database client not available" }, { status: 503 });
    }

    // Since we are hitting a table with RLS USING (false) for anon/authenticated,
    // this query will ONLY succeed because getSupabaseClient() uses the Service Role Key server-side.
    const { data, error } = await supabase
      .from("finance_security_audit")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      logger.error("Failed to query finance_security_audit:", { error: error.message });
      return NextResponse.json({ error: "Failed to fetch audit events" }, { status: 500 });
    }

    return NextResponse.json({ success: true, events: data || [] });
  } catch (err: any) {
    logger.error("GET /api/admin/audit error:", { error: err?.message || String(err) }, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
