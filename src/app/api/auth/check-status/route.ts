import { NextRequest, NextResponse } from "next/server";
import { checkUserStatus, markUserOnboardingComplete } from "@/domain/auth/userService";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const emailParam = req.nextUrl.searchParams.get("email");
    const session: any = await auth();
    const targetEmail = emailParam || session?.user?.email;

    if (!targetEmail) {
      return NextResponse.json({ error: "Email is required to check status." }, { status: 400 });
    }

    const status = await checkUserStatus(targetEmail);

    // If caller is querying another user's status while unauthenticated or different user, strip sensitive profile details
    const isOwner = session?.user?.email && session.user.email.toLowerCase() === targetEmail.toLowerCase();

    return NextResponse.json({
      status: "ok",
      email: targetEmail,
      exists: status.exists,
      hasCompletedOnboarding: status.hasCompletedOnboarding,
      hasRecords: isOwner ? status.hasRecords : false,
      profile: isOwner ? status.profile : null,
    });
  } catch (err: any) {
    const errorId = logger.logErrorWithId("GET /api/auth/check-status error", {}, err);
    return NextResponse.json({ error: `Failed to check user status. (Ref: ${errorId})` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, action } = await req.json().catch(() => ({}));
    const session: any = await auth();
    const targetEmail = email || session?.user?.email;

    if (!targetEmail) {
      return NextResponse.json({ error: "Email required." }, { status: 400 });
    }

    // Mutating onboarding status requires valid authentication matching the target email
    if (!session || !session.user?.email || session.user.email.toLowerCase() !== targetEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "Unauthorized. You can only modify your own onboarding status." },
        { status: 401 }
      );
    }

    if (action === "mark_onboarding_complete") {
      await markUserOnboardingComplete(targetEmail);
      return NextResponse.json({ status: "ok", message: "Marked onboarding as completed." });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    const errorId = logger.logErrorWithId("POST /api/auth/check-status error", {}, err);
    return NextResponse.json({ error: `Failed to update onboarding status. (Ref: ${errorId})` }, { status: 500 });
  }
}
