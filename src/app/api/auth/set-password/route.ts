import { NextResponse, type NextRequest } from "next/server";
import { setUserPassword } from "@/domain/auth/userService";
import { isEmailVerified } from "@/domain/auth/verificationService";
import { validatePassword } from "@/domain/auth/validation";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body?.email?.toLowerCase()?.trim();
    const password = body?.password;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and new password are required." }, { status: 400 });
    }

    // Verify email verification challenge passed
    if (!isEmailVerified(email)) {
      return NextResponse.json({ error: "Email address not verified via OTP code yet. Please complete verification." }, { status: 403 });
    }

    const val = validatePassword(password);
    if (!val.isValid) {
      return NextResponse.json({ error: val.error || "Invalid password." }, { status: 400 });
    }

    const success = await setUserPassword(email, password);
    if (!success) {
      return NextResponse.json({ error: "Could not update account credentials." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Password set successfully. You can now sign in directly." });
  } catch (err: any) {
    logger.error("POST /api/auth/set-password error:", { error: err?.message || String(err) }, err);
    return NextResponse.json({ error: "Internal server error setting password." }, { status: 500 });
  }
}
