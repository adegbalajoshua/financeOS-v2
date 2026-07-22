import { NextRequest, NextResponse } from "next/server";
import { registerNewUser } from "@/domain/auth/userService";
import { validateEmail, validatePassword, validateName, validateDateOfBirth, sanitizeInput } from "@/domain/auth/validation";
import { validateUsername } from "@/domain/users/usernameValidation";
import { sendEmailNotification } from "@/domain/notifications/notificationService";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, firstName, lastName, dob, username, url, key } = await req.json();

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      return NextResponse.json({ error: emailCheck.error }, { status: 400 });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
    }

    let cleanFirstName: string | undefined = undefined;
    let cleanLastName: string | undefined = undefined;
    let cleanDob: string | undefined = undefined;

    if (firstName) {
      const fnCheck = validateName(firstName, "First Name");
      if (!fnCheck.isValid) return NextResponse.json({ error: fnCheck.error }, { status: 400 });
      cleanFirstName = fnCheck.normalized;
    }
    if (lastName) {
      const lnCheck = validateName(lastName, "Last Name");
      if (!lnCheck.isValid) return NextResponse.json({ error: lnCheck.error }, { status: 400 });
      cleanLastName = lnCheck.normalized;
    }
    if (dob) {
      const dobCheck = validateDateOfBirth(dob);
      if (!dobCheck.isValid) return NextResponse.json({ error: dobCheck.error }, { status: 400 });
      cleanDob = dobCheck.normalized;
    }

    let cleanUsername: string | undefined = undefined;
    if (username && typeof username === "string" && username.trim().length > 0) {
      const v = validateUsername(username);
      if (!v.isValid) {
        return NextResponse.json({ error: v.error }, { status: 400 });
      }
      cleanUsername = v.normalized;
    }

    const cleanEmail = email.toLowerCase().trim();
    const computedName = name || (cleanFirstName && cleanLastName ? `${cleanFirstName} ${cleanLastName}` : cleanEmail.split("@")[0]);
    const cleanName = sanitizeInput(computedName);

    const customCreds = null;

    const user = await registerNewUser(
      cleanEmail,
      password,
      cleanName,
      cleanUsername,
      customCreds,
      { firstName: cleanFirstName, lastName: cleanLastName, dob: cleanDob }
    );

    // Asynchronously dispatch welcome email notification via enterprise notification service
    sendEmailNotification({
      to: user.email,
      subject: `Welcome to FinanceOS, ${user.name}! Your Command Center is Ready.`,
      type: "welcome_email",
      data: {
        message: "Your private financial command center has been provisioned. All your transactions are securely encrypted and protected.",
      },
    }).catch((e) => console.error("Welcome email dispatch warning:", e));

    return NextResponse.json({
      status: "ok",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        dob: user.dob,
        name: user.name,
      },
    });
  } catch (err: any) {
    const errorId = logger.logErrorWithId("POST /api/auth/register error", { email: req.json().catch(() => ({})) }, err);
    return NextResponse.json({ error: `${err.message || "Failed to register account."} (Ref: ${errorId})` }, { status: 400 });
  }
}
