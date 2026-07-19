import dns from "dns";
import nodemailer from "nodemailer";

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

/**
 * ==============================================================================
 * FinanceOS Enterprise Notification Service
 * Dispatches multi-channel alerts (Email via SMTP/Resend/SendGrid + In-App Push)
 * ==============================================================================
 */

export type NotificationType =
  | "welcome_email"
  | "security_login_alert"
  | "budget_threshold_warning"
  | "budget_exceeded_alert"
  | "monthly_financial_summary"
  | "system_announcement"
  | "otp_verification";

export interface NotificationPayload {
  to: string; // Recipient email or user ID
  subject: string;
  type: NotificationType;
  data?: Record<string, any>;
  channels?: ("email" | "push" | "in_app")[];
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  channel: string;
  error?: string;
}

/**
 * Dispatches a high-priority email notification using Priority Failover Chain:
 * 1. Brevo REST API (if BREVO_API_KEY set)
 * 2. Resend REST API (if RESEND_API_KEY set)
 * 3. Nodemailer SMTP Relay (if SMTP_HOST & SMTP_USER set)
 * 4. Zero-Config Console Simulation Fallback
 */
export async function sendEmailNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const brevoKey = process.env.BREVO_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  // Default sender based on configured active provider
  const defaultFrom = brevoKey
    ? process.env.NOTIFICATION_FROM_EMAIL || "theayooluwa@gmail.com"
    : resendKey
    ? "FinanceOS Security <onboarding@resend.dev>"
    : smtpUser
    ? `FinanceOS Security <${smtpUser}>`
    : "security@financeos.io";

  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL && process.env.NOTIFICATION_FROM_EMAIL !== "security@financeos.io"
    ? process.env.NOTIFICATION_FROM_EMAIL
    : defaultFrom;

  console.log(`[Notification Engine] Dispatching '${payload.type}' email to ${payload.to} via ${brevoKey ? "Brevo Cloud API" : resendKey ? "Resend Cloud API" : smtpHost ? "SMTP Relay" : "Simulated Local Dispatcher"}`);

  // Always log OTP verification codes to local console in dev mode so developer is never locked out
  if (process.env.NODE_ENV !== "production" && payload.type === "otp_verification" && payload.data?.otpCode) {
    console.log(`\n======================================================`);
    console.log(`🔐 [FINANCEOS OTP VERIFICATION CODE] To: ${payload.to}`);
    console.log(`👉 Verification Code: ${payload.data.otpCode}`);
    console.log(`======================================================\n`);
  }

  const htmlContent = formatEmailHtmlTemplate(payload);

  // 1. Priority 1: Brevo Cloud API (Highest priority if configured)
  if (brevoKey) {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": brevoKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "FinanceOS Security", email: fromEmail.includes("<") ? fromEmail.match(/<([^>]+)>/)?.[1] || fromEmail : fromEmail },
          to: [{ email: payload.to }],
          subject: payload.subject,
          htmlContent: htmlContent,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        console.warn(`⚠️ [Brevo API Error (${response.status})]: ${JSON.stringify(errJson)}. Attempting failover...`);
      } else {
        const resData = await response.json();
        return { success: true, messageId: resData.messageId || `brevo_${crypto.randomUUID()}`, channel: "email" };
      }
    } catch (brevoErr: any) {
      console.warn(`⚠️ [Brevo Delivery Attempt Failed]: ${brevoErr.message}. Attempting failover to secondary provider...`);
    }
  }

  // 2. Priority 2: Resend Cloud API
  if (resendKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: payload.to,
          subject: payload.subject,
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        if (response.status === 403 || errJson.name === "validation_error") {
          console.warn(`\n⚠️ [Resend Sandbox Restriction] Resend blocked email to '${payload.to}': ${errJson.message}`);
          console.warn(`👉 To send to '${payload.to}' via Resend cloud API, verify a domain at resend.com/domains or test with your account owner email.`);
        } else {
          console.warn(`⚠️ [Resend API Error (${response.status})]: ${JSON.stringify(errJson)}. Attempting failover...`);
        }
      } else {
        const resData = await response.json();
        return { success: true, messageId: resData.id, channel: "email" };
      }
    } catch (resendErr: any) {
      console.warn(`⚠️ [Resend Delivery Attempt Failed]: ${resendErr.message}. Attempting failover to SMTP...`);
    }
  }

  // 3. Priority 3: Universal Nodemailer SMTP Relay (Gmail / Outlook / Zoho / Custom SMTP)
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: fromEmail,
        to: payload.to,
        subject: payload.subject,
        html: htmlContent,
      });

      console.log(`✅ [SMTP Relay Success] Delivered via ${smtpHost}: ${info.messageId}`);
      return { success: true, messageId: info.messageId, channel: "email" };
    } catch (smtpErr: any) {
      console.error(`❌ [SMTP Relay Delivery Failed]: ${smtpErr.message}`);
    }
  }

  // 4. Priority 4: Zero-Config Dev / Simulation Fallback
  if (!brevoKey && !resendKey && !(smtpHost && smtpUser)) {
    return {
      success: true,
      messageId: `sim_${crypto.randomUUID()}`,
      channel: "email",
    };
  }

  return {
    success: false,
    channel: "email",
    error: `All active email providers (${brevoKey ? "Brevo, " : ""}${resendKey ? "Resend, " : ""}${smtpHost ? "SMTP" : ""}) failed to deliver to ${payload.to}. Check server console for verification code and exact provider errors.`,
  };
}

/**
 * Dispatches an in-app system notification or desktop push alert.
 */
export async function sendInAppNotification(userId: string, title: string, message: string, type: NotificationType): Promise<boolean> {
  try {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(`FinanceOS: ${title}`, {
        body: message,
        icon: "/favicon.ico",
      });
    }
    console.log(`[In-App Notification] [User: ${userId}] [Type: ${type}] ${title} - ${message}`);
    return true;
  } catch (e) {
    console.error("In-app notification dispatch error:", e);
    return false;
  }
}

/**
 * Generates rich, stunning HTML templates tailored for each notification category.
 */
function formatEmailHtmlTemplate(payload: NotificationPayload): string {
  const accentColor = "#635BFF";
  const darkBg = "#06060A";
  const cardBg = "#13131F";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Inter', -apple-system, sans-serif; background-color: ${darkBg}; color: #FFFFFF; padding: 32px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: ${cardBg}; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); padding: 40px; }
        .header { font-size: 24px; font-weight: 700; color: ${accentColor}; margin-bottom: 24px; }
        .content { font-size: 16px; line-height: 1.6; color: rgba(255,255,255,0.85); margin-bottom: 32px; }
        .badge { display: inline-block; padding: 6px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: rgba(99,91,255,0.2); color: #8C85FF; margin-bottom: 16px; }
        .footer { font-size: 12px; color: rgba(255,255,255,0.4); border-top: 1px solid rgba(255,255,255,0.08); padding-top: 24px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="badge">${payload.type.toUpperCase().replace(/_/g, " ")}</div>
        <div class="header">FinanceOS Command Center</div>
        <div class="content">
          <p>Hello,</p>
          <p><strong>${payload.subject}</strong></p>
          ${payload.data?.message ? `<p>${payload.data.message}</p>` : ""}
          ${
            payload.data?.otpCode
              ? `<div style="margin: 28px 0; padding: 24px; background: rgba(99,91,255,0.12); border: 2px dashed #635BFF; border-radius: 16px; text-align: center;">
                   <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #8C85FF; margin-bottom: 8px;">Your Verification Code</div>
                   <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #FFFFFF; font-family: monospace;">${payload.data.otpCode}</div>
                   <div style="font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 8px;">This code expires in 10 minutes.</div>
                 </div>`
              : ""
          }
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} FinanceOS &bull; Enterprise Financial Command Center
        </div>
      </div>
    </body>
    </html>
  `;
}
