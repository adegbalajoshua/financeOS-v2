import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/infrastructure/supabase/client";
import { sanitizeLogPayload } from "@/lib/loggerSanitizer";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    
    // Explicit try-catch around everything to prevent cascade failures
    const { log_type, category, message, metadata, user_email } = body;

    if (!log_type || !category || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (log_type !== "activity" && log_type !== "error") {
      return NextResponse.json({ error: "Invalid log_type" }, { status: 400 });
    }

    const session: any = await auth();
    const activeEmail = session?.user?.email || user_email || "anonymous";

    const scrubbedMetadata = sanitizeLogPayload(metadata || {});

    // Try service role bypass first for reliable writes through RLS
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (adminKey && url) {
      const { createClient } = require("@supabase/supabase-js");
      const adminClient = createClient(url, adminKey);
      
      const { error: dbError } = await adminClient.from("app_event_log").insert({
        log_type,
        category,
        message: message.substring(0, 1000),
        metadata: scrubbedMetadata,
        user_email: activeEmail
      });

      if (dbError) {
        console.error("CRITICAL: Failed to write to app_event_log via admin client", dbError);
      }
    } else {
      console.error("CRITICAL: Missing admin credentials to write to app_event_log.");
    }

    // Always return 200 OK to the client to avoid bubbling up failures
    return NextResponse.json({ success: true });

  } catch (err) {
    // Fail silently to console to prevent infinite loops
    console.error("CRITICAL: Unexpected error in /api/activity/log route", err);
    return NextResponse.json({ success: true }); // Still return success to caller
  }
}
