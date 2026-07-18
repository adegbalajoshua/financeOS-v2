import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseClient } from "@/infrastructure/supabase/client";
import { validateUsername } from "@/domain/users/usernameValidation";

/**
 * GET /api/users/check-username?q=username
 * High-performance debounced check endpoint verifying if a $cashtag or @handle is available.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawUsername = searchParams.get("q") || searchParams.get("username") || "";

    if (!rawUsername || rawUsername.trim().length === 0) {
      return NextResponse.json(
        { available: false, normalized: "", reason: "Please enter a username." },
        { status: 400 }
      );
    }

    // 1. Run local Zod format & banned words check
    const validation = validateUsername(rawUsername);
    if (!validation.isValid) {
      return NextResponse.json(
        { available: false, normalized: validation.normalized, reason: validation.error },
        { status: 200 }
      );
    }

    const normalized = validation.normalized;

    // 2. Check if the authenticated user already owns this exact username
    const session: any = await auth();
    const currentUserEmail = session?.user?.email?.toLowerCase()?.trim();

    const client = getSupabaseClient();
    if (client) {
      // Check database using case-insensitive comparison
      const { data: existingUser, error } = await client
        .from("finance_users")
        .select("id, email, username")
        .ilike("username", normalized)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Supabase check-username query error:", error.message);
      }

      if (existingUser) {
        if (currentUserEmail && existingUser.email === currentUserEmail) {
          return NextResponse.json({
            available: true,
            isCurrent: true,
            normalized,
            reason: "This is your current username.",
          });
        }
        return NextResponse.json({
          available: false,
          normalized,
          reason: "Sorry, this username is already taken.",
        });
      }
    } else {
      // Fallback check in session user buffer when Supabase is not connected yet
      const buffer: Record<string, any> = (globalThis as any).financeos_user_buffer || {};
      for (const emailKey in buffer) {
        const u = buffer[emailKey];
        if (u && u.username && u.username.toLowerCase() === normalized) {
          if (currentUserEmail && emailKey.toLowerCase() === currentUserEmail) {
            return NextResponse.json({
              available: true,
              isCurrent: true,
              normalized,
              reason: "This is your current username.",
            });
          }
          return NextResponse.json({
            available: false,
            normalized,
            reason: "Sorry, this username is already taken.",
          });
        }
      }
    }

    return NextResponse.json({
      available: true,
      normalized,
      reason: "Username is available!",
    });
  } catch (err: any) {
    console.error("GET /api/users/check-username error:", err);
    return NextResponse.json(
      { available: false, reason: "Failed to verify username availability." },
      { status: 500 }
    );
  }
}
