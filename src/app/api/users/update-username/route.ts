import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseClient } from "@/infrastructure/supabase/client";
import { validateUsername } from "@/domain/users/usernameValidation";

/**
 * POST or PUT /api/users/update-username
 * Securely updates or claims a $username handle with race-condition unique constraint protection (Postgres 23505 -> 409 Conflict).
 */
export async function POST(req: NextRequest) {
  return handleUpdateUsername(req);
}

export async function PUT(req: NextRequest) {
  return handleUpdateUsername(req);
}

async function handleUpdateUsername(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to change your username." },
        { status: 401 }
      );
    }

    const { username } = await req.json().catch(() => ({}));
    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "Please provide a valid username." }, { status: 400 });
    }

    const validation = validateUsername(username);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const normalized = validation.normalized;
    const email = session.user.email.toLowerCase().trim();

    // Update in session buffer
    const buffer: Record<string, any> = (globalThis as any).financeos_user_buffer || {};
    if (buffer[email]) {
      buffer[email].username = normalized;
    }

    const client = getSupabaseClient();
    if (client) {
      // First check if user exists in table
      const { data: userRow } = await client
        .from("finance_users")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (userRow) {
        const { error } = await client
          .from("finance_users")
          .update({
            username: normalized,
            updated_at: new Date().toISOString(),
          })
          .eq("email", email);

        if (error) {
          // Race-Condition safety check: Postgres error code 23505 is Unique Violation
          if (
            error.code === "23505" ||
            error.message?.toLowerCase().includes("unique") ||
            error.message?.toLowerCase().includes("duplicate")
          ) {
            return NextResponse.json(
              { error: "Sorry, this username is already taken by another user." },
              { status: 409 }
            );
          }
          console.error("Failed to update username inside Supabase:", error.message);
          return NextResponse.json(
            { error: "Database error updating username: " + error.message },
            { status: 500 }
          );
        }
      } else {
        // If row doesn't exist yet in finance_users (`e.g. demo or early session user`), insert or upsert cleanly
        const { error: insertError } = await client
          .from("finance_users")
          .upsert(
            {
              id: crypto.randomUUID(),
              email,
              username: normalized,
              name: session.user.name || email.split("@")[0],
              has_completed_onboarding: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "email" }
          );

        if (insertError) {
          if (
            insertError.code === "23505" ||
            insertError.message?.toLowerCase().includes("unique") ||
            insertError.message?.toLowerCase().includes("duplicate")
          ) {
            return NextResponse.json(
              { error: "Sorry, this username is already taken by another user." },
              { status: 409 }
            );
          }
          console.error("Failed to upsert username row:", insertError.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      username: normalized,
      message: "Username updated successfully!",
    });
  } catch (err: any) {
    console.error("update-username endpoint error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while updating username." },
      { status: 500 }
    );
  }
}
