/**
 * Structured Telemetry & Level-Based Logging Engine for FinanceOS
 * Outputs clean JSON formatted telemetry suitable for Datadog, Sentry, CloudWatch, and OCI Logging.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: {
    message?: string;
    stack?: string;
    code?: string;
  };
}

class StructuredLogger {
  private formatMessage(level: LogLevel, message: string, context?: Record<string, any>, err?: any): string {
    const payload: LogPayload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
    };

    if (err) {
      payload.error = {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        code: err?.code || err?.status || undefined,
      };
    }

    if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
      // In browser dev mode, keep logs human readable
      return `[${level.toUpperCase()}] ${message}`;
    }

    // In production or server-side, output structured JSON for log parsers
    return JSON.stringify(payload);
  }

  debug(message: string, context?: Record<string, any>) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.formatMessage("debug", message, context));
    }
  }

  info(message: string, context?: Record<string, any>) {
    console.info(this.formatMessage("info", message, context));
  }

  warn(message: string, context?: Record<string, any>, error?: any) {
    console.warn(this.formatMessage("warn", message, context, error));
  }

  error(message: string, context?: Record<string, any>, error?: any) {
    console.error(this.formatMessage("error", message, context, error));
  }

  logErrorWithId(message: string, context?: Record<string, any>, error?: any): string {
    const errorId = `ERR-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    this.error(message, { ...context, errorId }, error);
    return errorId;
  }
}

export const logger = new StructuredLogger();
