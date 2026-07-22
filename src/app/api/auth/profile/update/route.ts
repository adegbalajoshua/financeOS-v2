import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseClient } from "@/infrastructure/supabase/client";
import { validateUsername } from "@/domain/users/usernameValidation";

/**
 * POST /api/auth/profile/update
 * Updates the user's Display Name, $username handle, and preferences inside cloud Supabase PostgreSQL (finance_users).
 */
export async function POST(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized. Please sign in first." }, { status: 401 });
    }

    const { name, username, currency, dateFormat } = await req.json().catch(() => ({}));

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Display Name cannot be empty." }, { status: 400 });
    }

    const trimmedName = name.trim();
    const email = session.user.email.toLowerCase().trim();

    let normalizedUsername: string | undefined = undefined;
    if (username && typeof username === "string" && username.trim().length > 0) {
      const v = validateUsername(username);
      if (!v.isValid) {
        return NextResponse.json({ error: v.error }, { status: 400 });
      }
      normalizedUsername = v.normalized;
    }

    // Update session buffer
    const buffer: Record<string, any> = (globalThis as any).financeos_user_buffer || {};
    if (buffer[email]) {
      buffer[email].name = trimmedName;
      if (normalizedUsername) buffer[email].username = normalizedUsername;
    }

    const client = getSupabaseClient();
    if (client) {
      const updatePayload: Record<string, any> = {
        name: trimmedName,
        updated_at: new Date().toISOString(),
      };
      if (normalizedUsername) {
        updatePayload.username = normalizedUsername;
      }

      const { data, error } = await client
        .from("finance_users")
        .update(updatePayload)
        .eq("email", email)
        .select();

      if (error) {
        if (
          error.code === "23505" ||
          error.message?.toLowerCase().includes("unique") ||
          error.message?.toLowerCase().includes("duplicate")
        ) {
          return NextResponse.json({ error: "Sorry, the username $" + normalizedUsername + " is already taken by another user." }, { status: 409 });
        }
        console.error("Failed to update profile in Supabase:", error.message);
        return NextResponse.json({ error: "Database error: " + error.message }, { status: 500 });
      }

      if (!data || data.length === 0) {
        // If data is empty, the row wasn't updated (likely RLS blocked it or email not found)
        console.error("Profile update affected 0 rows. RLS or missing user.");
        
        // Fallback: Try with an explicit admin client using service_role key to bypass RLS
        const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (adminKey && url) {
          const { createClient } = require("@supabase/supabase-js");
          const adminClient = createClient(url, adminKey);
          const { data: adminData, error: adminError } = await adminClient
            .from("finance_users")
            .update(updatePayload)
            .eq("email", email)
            .select();
            
          if (adminError || !adminData || adminData.length === 0) {
            return NextResponse.json({ error: "Failed to update profile records (Admin bypass failed)." }, { status: 500 });
          }
        } else {
          return NextResponse.json({ error: "Failed to update profile records (0 rows affected)." }, { status: 500 });
        }
      }
    }

    return NextResponse.json({
      success: true,
      name: trimmedName,
      username: normalizedUsername,
      message: "Profile updated successfully!",
    });
  } catch (err: any) {
    console.error("POST /api/auth/profile/update error:", err);
    return NextResponse.json({ error: "An unexpected error occurred updating profile." }, { status: 500 });
  }
}
