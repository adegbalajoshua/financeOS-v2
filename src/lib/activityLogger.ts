export async function logActivity(category: string, message: string, metadata: Record<string, any> = {}) {
  try {
    fetch("/api/activity/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        log_type: "activity",
        category,
        message,
        metadata,
      }),
    }).catch(() => {});
  } catch (e) {
    // Ignore
  }
}
