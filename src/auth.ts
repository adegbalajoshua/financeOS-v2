import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyUserCredentials, checkUserStatus } from "@/domain/auth/userService";
import { isEmailVerified } from "@/domain/auth/verificationService";

if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  throw new Error("FATAL: AUTH_SECRET or NEXTAUTH_SECRET environment variable must be set in production.");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "financeOS_default_secret_key_change_in_production_123456",
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email or Username",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const rawId = (credentials?.identifier || credentials?.email) as string | undefined;
        if (!rawId || !credentials?.password) {
          throw new Error("Please enter both your Email/Username and Password.");
        }
        const identifier = rawId.trim();
        const password = credentials.password as string;

        // Auto-handle standard Practice/Demo login accounts for instant, zero-friction access
        if (
          process.env.ENABLE_DEMO_ACCOUNTS === "true" &&
          (identifier.toLowerCase() === "demo@financeos.com" || identifier.toLowerCase() === "practice@financeos.com" || identifier.toLowerCase() === "demo" || identifier.toLowerCase() === "$demo") &&
          (password === "demo123" || password === "password" || password === "practice")
        ) {
          return {
            id: "demo-user-id",
            email: "demo@financeos.com",
            name: "Demo Account User",
          };
        }

        const user = await verifyUserCredentials(identifier, password);
        if (!user) {
          // Check if this user exists (e.g. from a legacy migration) but has no password hash set yet
          if (identifier.includes("@")) {
            const status = await checkUserStatus(identifier.toLowerCase());
            if (status.exists) {
              throw new Error("OTP_REQUIRED_MIGRATION: Your account requires OTP verification to set your password.");
            }
          }
          throw new Error("Invalid Email/Username or Password.");
        }

        // If the user hasn't completed onboarding or is logging in for the first time without verification
        if (!user.has_completed_onboarding && !isEmailVerified(user.email)) {
          throw new Error("OTP_REQUIRED: Email verification required before first sign-in.");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.email.split("@")[0],
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user, trigger, session }: any) {
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.username) token.username = session.username;
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      if (user) {
        token.sub = user.id;
        if (user.name) token.name = user.name;
        if ((user as any).username) token.username = (user as any).username;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session && token) {
        session.accessToken = token.accessToken;
        if (session.user && token.sub) {
          session.user.id = token.sub;
          if (token.name) session.user.name = token.name;
          if (token.username) (session.user as any).username = token.username;
        }
      }
      return session;
    }
  }
});