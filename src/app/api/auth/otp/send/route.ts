import { NextResponse, type NextRequest } from "next/server";
import { sendOtpVerification } from "@/domain/auth/verificationService";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body?.email?.toLowerCase()?.trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const res = await sendOtpVerification(email);
    if (!res.success) {
      return NextResponse.json({ error: res.error || "Could not dispatch verification code." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: res.message });
  } catch (err: any) {
    logger.error("POST /api/auth/otp/send error:", { error: err?.message || String(err) }, err);
    return NextResponse.json({ error: "Internal server error dispatching OTP." }, { status: 500 });
  }
}
