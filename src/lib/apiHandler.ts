import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { logger } from "@/lib/logger";

export interface ApiErrorOptions {
  status?: number;
  code?: string;
  details?: any;
}

export class ApiError extends Error {
  public status: number;
  public code?: string;
  public details?: any;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status || 500;
    this.code = options.code;
    this.details = options.details;
  }
}

type RouteHandler = (req: NextRequest, context: any) => Promise<NextResponse | Response>;

/**
 * Higher-order centralized API route wrapper for Next.js 16 App Router.
 * Ensures consistent JSON error responses, status codes, and structured telemetry logging.
 */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, context: any) => {
    const startTime = Date.now();
    const url = req.nextUrl.pathname;
    const method = req.method;

    try {
      const response = await handler(req, context);
      const duration = Date.now() - startTime;
      
      if (duration > 1500) {
        logger.warn(`High latency API request observed: [${method}] ${url} (${duration}ms)`, { method, url, duration });
      } else {
        logger.debug(`[${method}] ${url} completed in ${duration}ms`);
      }

      return response;
    } catch (err: any) {
      const duration = Date.now() - startTime;
      const status = err instanceof ApiError ? err.status : err?.status || 500;
      const message = err instanceof Error ? err.message : "Internal Server Error";
      const code = err instanceof ApiError ? err.code : err?.code || "INTERNAL_ERROR";

      logger.error(`[${method}] ${url} failed with HTTP ${status} (${duration}ms): ${message}`, {
        method,
        url,
        status,
        code,
        duration,
        details: err?.details,
      }, err);

      return NextResponse.json(
        {
          success: false,
          error: {
            message,
            code,
            status,
            ...(process.env.NODE_ENV === "development" && { details: err?.details || err?.stack }),
          },
        },
        { status }
      );
    }
  };
}
