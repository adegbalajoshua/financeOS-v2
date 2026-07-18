import { NextRequest, NextResponse } from "next/server";
import { sendEmailNotification, sendInAppNotification, NotificationPayload, NotificationType } from "@/domain/notifications/notificationService";
import { auth } from "@/auth";
import { z } from "zod";

const NotificationTypeSchema = z.enum([
  "welcome_email",
  "security_login_alert",
  "budget_threshold_warning",
  "budget_exceeded_alert",
  "monthly_financial_summary",
  "system_announcement",
]);

const NotificationPayloadSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(255),
  type: NotificationTypeSchema,
  data: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session || (!session.user?.email && !session.user?.id)) {
      return NextResponse.json({ error: "Unauthorized. Must be signed in to dispatch notifications." }, { status: 401 });
    }

    const rawBody = await req.json().catch(() => null);
    const validationResult = NotificationPayloadSchema.safeParse(rawBody);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: `Invalid notification payload: ${validationResult.error.issues.map((i) => i.message).join(", ")}` },
        { status: 400 }
      );
    }
    const body: NotificationPayload = validationResult.data as NotificationPayload;

    // Prevent open email relay: caller can only trigger notifications for their own email address
    if (session.user.email && body.to.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden. Cannot dispatch notifications to arbitrary recipients." }, { status: 403 });
    }

    const emailRes = await sendEmailNotification(body);

    if (session?.user?.email && (body.to.toLowerCase() === session.user.email.toLowerCase() || body.to === session.user.id)) {
      await sendInAppNotification(session.user.email, body.subject, String(body.data?.message || ""), body.type);
    }

    return NextResponse.json({
      status: "ok",
      result: emailRes,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("POST /api/notifications/send error:", error);
    return NextResponse.json({ error: "Failed to dispatch notification." }, { status: 500 });
  }
}
