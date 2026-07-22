import { sendEmailNotification } from "@/domain/notifications/notificationService";
import { getSupabaseClient, OtpSupabaseService } from "@/infrastructure/supabase/client";
import { logger } from "@/lib/logger";

async function logSecurityEvent(eventType: string, email: string, metadata: any = {}) {
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from("finance_security_audit").insert({
        event_type: eventType,
        email,
        metadata,
      });
    }
  } catch (err) {
    logger.debug(`Failed to log security event ${eventType}:`, { error: String(err) });
  }
}

interface OtpRecord {
  email: string;
  code: string;
  expiresAt: number;
  verified: boolean;
  attempts: number;
}

const otpStore: Record<string, OtpRecord> =
  (globalThis as any).financeos_otp_store || ((globalThis as any).financeos_otp_store = {});

/**
 * Generates and dispatches a 6-digit OTP verification email via Resend / Notification engine.
 */
export async function sendOtpVerification(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  
  // Cooldown check (60 seconds)
  const existingRecord = otpStore[normalizedEmail];
  if (existingRecord) {
    const createdAt = existingRecord.expiresAt - 10 * 60 * 1000;
    const timeSinceCreation = Date.now() - createdAt;
    if (timeSinceCreation < 60000) {
      return { success: false, error: "Please wait 60 seconds before requesting a new code." };
    }
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Store in global memory/buffer
  otpStore[normalizedEmail] = {
    email: normalizedEmail,
    code,
    expiresAt,
    verified: false,
    attempts: 0,
  };

  // Try saving to cloud Supabase if connected
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const otpSvc = new OtpSupabaseService(supabase);
      await otpSvc.upsertOtp({
        email: normalizedEmail,
        code,
        expires_at: new Date(expiresAt).toISOString(),
        verified: false,
      });
    }
  } catch (err: any) {
    logger.debug("Supabase verification code table sync skipped:", { message: err?.message });
  }

  await logSecurityEvent("OTP_SENT", normalizedEmail, { expiresAt });

  // Dispatch via Email engine (Resend if key configured, or local simulated trace)
  const res = await sendEmailNotification({
    to: normalizedEmail,
    subject: "FinanceOS Security Verification Code",
    type: "otp_verification",
    data: {
      otpCode: code,
      message: "Please use this 6-digit verification code to complete your secure sign-in to FinanceOS.",
    },
  });

  if (!res.success) {
    return { success: false, error: res.error || "Failed to deliver OTP email." };
  }

  return { success: true, message: "Verification code sent to your email." };
}

/**
 * Verifies if the 6-digit OTP matches the stored code and has not expired.
 */
export async function verifyOtpCode(email: string, inputCode: string): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const cleanCode = inputCode.trim();

  let record = otpStore[normalizedEmail];

  // If missing from memory, try to load from Supabase
  if (!record) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const otpSvc = new OtpSupabaseService(supabase);
        const { data } = await otpSvc.getOtp(normalizedEmail);
        if (data) {
          record = {
            email: normalizedEmail,
            code: data.code,
            expiresAt: new Date(data.expires_at).getTime(),
            verified: data.verified,
            attempts: 0,
          };
          otpStore[normalizedEmail] = record;
        }
      }
    } catch (err: any) {
      logger.debug("Supabase OTP verify load failed:", { message: err?.message || String(err) });
    }
  }

  if (!record) {
    return { success: false, error: "No active verification code found for this email. Please request a new code." };
  }

  // Lockout check
  if (record.attempts >= 5) {
    return { success: false, error: "Too many failed attempts. This code has been invalidated. Please request a new one." };
  }

  // Expiry check
  if (Date.now() > record.expiresAt) {
    return { success: false, error: "Verification code has expired. Please request a new code." };
  }

  // Code validation
  if (record.code !== cleanCode) {
    record.attempts += 1;
    if (record.attempts >= 5) {
      delete otpStore[normalizedEmail];
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          const otpSvc = new OtpSupabaseService(supabase);
          await otpSvc.deleteOtp(normalizedEmail);
        }
      } catch (err) {}
      await logSecurityEvent("OTP_LOCKOUT", normalizedEmail, { attempts: record.attempts, reason: "Max failures reached" });
      return { success: false, error: "Too many failed attempts. This code has been invalidated. Please request a new one." };
    }
    await logSecurityEvent("OTP_FAILED_ATTEMPT", normalizedEmail, { attempts: record.attempts, remaining: 5 - record.attempts });
    return { success: false, error: `Invalid verification code. ${5 - record.attempts} attempts remaining.` };
  }

  // Mark verified
  record.verified = true;
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const otpSvc = new OtpSupabaseService(supabase);
      await otpSvc.markOtpVerified(normalizedEmail);
    }
  } catch (err) {}

  await logSecurityEvent("OTP_VERIFIED", normalizedEmail);

  return { success: true };
}

/**
 * Checks if an email has been verified via OTP within the current session/window.
 */
export function isEmailVerified(email: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  const record = otpStore[normalizedEmail];
  return Boolean(record && record.verified && Date.now() <= record.expiresAt);
}
