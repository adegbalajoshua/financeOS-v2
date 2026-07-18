import { NextResponse, type NextRequest } from "next/server";
import { verifyOtpCode } from "@/domain/auth/verificationService";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body?.email?.toLowerCase()?.trim();
    const code = body?.code?.trim();

    if (!email || !code || code.length !== 6) {
      return NextResponse.json({ error: "Please enter the complete 6-digit verification code." }, { status: 400 });
    }

    const res = await verifyOtpCode(email, code);
    if (!res.success) {
      return NextResponse.json({ error: res.error || "Invalid verification code." }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Email verified successfully." });
  } catch (err: any) {
    logger.error("POST /api/auth/otp/verify error:", { error: err?.message || String(err) }, err);
    return NextResponse.json({ error: "Internal server error verifying OTP." }, { status: 500 });
  }
}
