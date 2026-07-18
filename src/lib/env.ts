import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters").optional(),
  NEXTAUTH_SECRET: z.string().min(16, "NEXTAUTH_SECRET must be at least 16 characters").optional(),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL").optional(),
  AUTH_URL: z.string().url("AUTH_URL must be a valid URL").optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  DEMO_SEED_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  PORT: z.coerce.number().default(3000),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL").optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

/**
 * Validates runtime environment variables safely.
 * Returns both validated env values and validation status without crashing during static build generation.
 */
export function getEnv() {
  const processEnv = {
    NODE_ENV: process.env.NODE_ENV,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    AUTH_URL: process.env.AUTH_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    DEMO_SEED_SECRET: process.env.DEMO_SEED_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    PORT: process.env.PORT,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };

  const parsedServer = serverSchema.safeParse(processEnv);
  const parsedClient = clientSchema.safeParse(processEnv);

  if (!parsedServer.success || !parsedClient.success) {
    const serverErrors = parsedServer.success ? {} : parsedServer.error.flatten().fieldErrors;
    const clientErrors = parsedClient.success ? {} : parsedClient.error.flatten().fieldErrors;
    
    if (process.env.NODE_ENV === "production" && typeof window === "undefined") {
      console.warn("[Env Validation Warning] Some runtime environment variables failed validation or are missing:", {
        server: serverErrors,
        client: clientErrors,
      });
    }
  }

  return {
    ...(parsedServer.success ? parsedServer.data : (processEnv as any)),
    ...(parsedClient.success ? parsedClient.data : (processEnv as any)),
    _isServerValid: parsedServer.success,
    _isClientValid: parsedClient.success,
  };
}

export const env = getEnv();
