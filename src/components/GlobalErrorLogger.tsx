"use client";
import { useEffect } from "react";

export function GlobalErrorLogger() {
  useEffect(() => {
    const logClientError = async (message: string, stack?: string) => {
      try {
        await fetch("/api/activity/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            log_type: "error",
            category: "client_error",
            message: message.substring(0, 1000),
            metadata: { stack },
          }),
        }).catch(() => {}); // Empty catch to prevent any loop
      } catch (e) {
        // Silent catch inside the function execution itself
      }
    };

    const handleWindowError = (event: ErrorEvent) => {
      // Loop protection wrapper
      try {
        logClientError(event.message || "Unknown window error", event.error?.stack);
      } catch (err) {
        console.error("Failed to log window error", err);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      try {
        const reason = event.reason;
        const msg = reason instanceof Error ? reason.message : String(reason);
        const stack = reason instanceof Error ? reason.stack : undefined;
        logClientError(`Unhandled Promise: ${msg}`, stack);
      } catch (err) {
        console.error("Failed to log promise rejection", err);
      }
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
