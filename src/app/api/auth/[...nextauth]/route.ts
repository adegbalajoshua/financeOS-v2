import { NextResponse, type NextRequest } from "next/server";
import { handlers } from "@/auth";
import { logger } from "@/lib/logger";

const { GET: originalGet, POST: originalPost } = handlers;

export async function GET(req: NextRequest) {
  console.log(`[NextAuth Route] GET request initiated for ${req.nextUrl.pathname}`);
  try {
    const response = await originalGet(req);
    console.log(`[NextAuth Route] originalGet completed with status: ${response?.status}`);
    
    // Check if NextAuth returned a 500 error (such as missing secret or uninitialized SessionProvider in dev)
    if (response && response.status === 500) {
      const cloned = response.clone();
      const text = await cloned.text().catch(() => "unknown 500 error");
      console.error(`[NextAuth Route] Intercepted 500 on [${req.nextUrl.pathname}]: ${text}`);
      logger.error(`NextAuth 500 intercepted on [${req.nextUrl.pathname}]: ${text}. Returning unauthenticated JSON fallback.`);
      
      // If the request is for /session or any auth route, return valid JSON so SessionProvider doesn't crash with Unexpected token 'I'
      return NextResponse.json({ user: null, expires: "" }, { status: 200 });
    }
    
    return response;
  } catch (err: any) {
    console.error(`[NextAuth Route] Unhandled exception inside GET:`, err);
    logger.error("Unhandled exception in NextAuth GET handler:", { message: err?.message, stack: err?.stack }, err);
    return NextResponse.json({ user: null, expires: "" }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const response = await originalPost(req);
    return response;
  } catch (err: any) {
    logger.error("Unhandled exception in NextAuth POST handler:", { message: err?.message, stack: err?.stack }, err);
    return NextResponse.json({ error: "Authentication request failed", details: err?.message }, { status: 500 });
  }
}
