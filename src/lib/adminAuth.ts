import { auth } from "@/auth";

export async function requireAdmin() {
  // If demo mode is on and the user is using it, explicitly reject to prevent impersonation
  if (process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS === "true") {
    // We cannot trust any session under demo mode as an admin
    // Even if not strictly necessary, it adds a hard fail if the demo flag is somehow enabled in production
  }

  const session: any = await auth();
  if (!session || (!session.user?.email && !session.user?.id)) {
    return { authorized: false, error: "Unauthorized. Please log in." };
  }

  const userEmail = session.user?.email;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    return { authorized: false, error: "Admin email not configured on server." };
  }

  if (userEmail !== adminEmail) {
    return { authorized: false, error: "Forbidden. Admin access required." };
  }

  // If demo mode is active, reject even if the email magically matches
  if (process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS === "true") {
    return { authorized: false, error: "Forbidden. Admin ops disabled while demo mode is active." };
  }

  return { authorized: true, userEmail };
}
