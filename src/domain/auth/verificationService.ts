import { sendEmailNotification } from "@/domain/notifications/notificationService";
import { getSupabaseClient, OtpSupabaseService } from "@/infrastructure/supabase/client";
import { logger } from "@/lib/logger";

interface OtpRecord {
  email: string;
  code: string;
  expiresAt: number;
  verified: boolean;
}

const otpStore: Record<string, OtpRecord> =
  (globalThis as any).financeos_otp_store || ((globalThis as any).financeos_otp_store = {});

/**
 * Generates and dispatches a 6-digit OTP verification email via Resend / Notification engine.
 */
export async function sendOtpVerification(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Store in global memory/buffer
  otpStore[normalizedEmail] = {
    email: normalizedEmail,
    code,
    expiresAt,
    verified: false,
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

  // Check global store first
  const record = otpStore[normalizedEmail];

  // Also check Supabase if store missing or expired
  if (!record || record.code !== cleanCode || Date.now() > record.expiresAt) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const otpSvc = new OtpSupabaseService(supabase);
        const { data } = await otpSvc.getOtp(normalizedEmail);

        if (data && data.code === cleanCode && new Date(data.expires_at).getTime() > Date.now()) {
          otpStore[normalizedEmail] = {
            email: normalizedEmail,
            code: cleanCode,
            expiresAt: new Date(data.expires_at).getTime(),
            verified: true,
          };
          await otpSvc.markOtpVerified(normalizedEmail);
          return { success: true };
        }
      }
    } catch (err: any) {
      logger.debug("Supabase OTP verify check failed or table missing:", { message: err?.message || String(err) });
    }

    if (!record) {
      return { success: false, error: "No active verification code found for this email. Please request a new code." };
    }
    if (Date.now() > record.expiresAt) {
      return { success: false, error: "Verification code has expired. Please request a new code." };
    }
    if (record.code !== cleanCode) {
      return { success: false, error: "Invalid verification code. Please check and try again." };
    }
  }

  // Mark verified
  record.verified = true;
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
