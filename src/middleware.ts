import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
// Simple in-memory rate limiting store for edge / serverless instances
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const WINDOW_SIZE_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_MINUTE = 30; // 30 requests per minute per IP on protected API routes

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Attach core HTTP security headers at the edge boundary
  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.googleapis.com https://accounts.google.com https://*.google.com wss://*.supabase.co; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com https://*.google.com;"
  );
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");

  // Enforce IP-based rate limiting on public sensitive routes (/api/auth/register, /api/auth/check-status, /api/notifications/send, /api/demo/seed)
  const pathname = req.nextUrl.pathname;
  if (
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/auth/check-status") ||
    pathname.startsWith("/api/auth/otp/send") ||
    pathname.startsWith("/api/auth/otp/verify") ||
    pathname.startsWith("/api/notifications/send") ||
    pathname.startsWith("/api/demo/seed") ||
    pathname.startsWith("/api/activity/log")
  ) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "127.0.0.1";
    const now = Date.now();
    const record = rateLimitMap.get(ip);
    
    // Use a more generous limit for activity logging (e.g. 120/min instead of 30/min)
    const limitForRoute = pathname.startsWith("/api/activity/log") ? 120 : MAX_REQUESTS_PER_MINUTE;

    if (!record || now > record.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_SIZE_MS });
    } else {
      record.count += 1;
      if (record.count > limitForRoute) {
        return NextResponse.json(
          { error: `Too many requests. Rate limit exceeded (max ${limitForRoute} requests/minute). Please try again later.` },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }
    }
  }

  // Enforce authentication redirect for protected UI pages (/, /dashboard, /accounts, /budget, /events, /settings, /migration, /onboarding, /auth/resolve)
  const isPublicPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/users") ||
    pathname.startsWith("/api/notifications") ||
    pathname.startsWith("/api/demo") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".ico");

  if (!isPublicPath) {
    // Cryptographically verify the NextAuth session token
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "financeOS_default_secret_key_change_in_production_123456";
    // We use secureCookie based on the environment and NEXTAUTH_URL
    const isProduction = process.env.NODE_ENV === "production";
    const token = await getToken({ 
      req, 
      secret,
      secureCookie: isProduction && !req.url.includes("localhost")
    });

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
