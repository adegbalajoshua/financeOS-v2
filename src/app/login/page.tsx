"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { validateEmail, validatePassword, validateName, validateDateOfBirth, calculatePasswordStrength, resolveAuthIdentifier } from "@/domain/auth/validation";
import { UsernameInput } from "@/components/UsernameInput";
import { UsernameStatus } from "@/hooks/useDebouncedUsernameCheck";

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<"auth" | "otp" | "otp_migration">("auth");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otpMessage, setOtpMessage] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [signupWizardStep, setSignupWizardStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [normalizedUsername, setNormalizedUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [displayBalance, setDisplayBalance] = useState(128450.00);

  // Catch any NextAuth URL error params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get("error");
      if (urlError) {
        setErrorMsg(`Authentication notice: ${urlError}. Please sign in with Email & Password.`);
      }
    }
  }, []);

  // Smooth mouse tilt tracking for the floating interactive card
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      setMousePos({
        x: (e.clientX / innerWidth - 0.5) * 20,
        y: (e.clientY / innerHeight - 0.5) * -20,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Live simulation of high-frequency balance updates on login card
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayBalance((prev) => +(prev + (Math.random() * 4 - 1.5)).toFixed(2));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleQuickDemoLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: "demo@financeos.com",
        password: "demo123",
      });
      if (res?.error) {
        setErrorMsg("Demo login unavailable: " + res.error);
        setIsLoading(false);
      } else {
        localStorage.setItem("financeos_first_name", "Demo User");
        localStorage.setItem("financeos_display_name", "Demo Account User");
        localStorage.setItem("financeos_user_email", "demo@financeos.com");
        localStorage.setItem("financeos_username", "demo_user");
        router.push("/auth/resolve");
      }
    } catch (err: any) {
      setErrorMsg("Failed to launch quick demo: " + err.message);
      setIsLoading(false);
    }
  };

  const pwdStrength = calculatePasswordStrength(password);
  const dobCheck = dob ? validateDateOfBirth(dob) : { isValid: false };

  const handleStep1Next = () => {
    setErrorMsg(null);
    const fnCheck = validateName(firstName, "First Name");
    if (!fnCheck.isValid) {
      setErrorMsg(fnCheck.error || "Please check your First Name.");
      return;
    }
    const lnCheck = validateName(lastName, "Last Name");
    if (!lnCheck.isValid) {
      setErrorMsg(lnCheck.error || "Please check your Last Name.");
      return;
    }
    const dobResult = validateDateOfBirth(dob);
    if (!dobResult.isValid) {
      setErrorMsg(dobResult.error || "Please check your Date of Birth.");
      return;
    }
    setFirstName(fnCheck.normalized || firstName);
    setLastName(lnCheck.normalized || lastName);
    setDob(dobResult.normalized || dob);
    setSignupWizardStep(2);
  };

  const handleCredentialsAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    if (authMode === "signup") {
      if (signupWizardStep === 1) {
        setIsLoading(false);
        handleStep1Next();
        return;
      }

      const emailCheck = validateEmail(email);
      if (!emailCheck.isValid) {
        setErrorMsg(emailCheck.error || "Invalid email address.");
        setIsLoading(false);
        return;
      }

      const passCheck = validatePassword(password);
      if (!passCheck.isValid) {
        setErrorMsg(passCheck.error || "Invalid password.");
        setIsLoading(false);
        return;
      }

      if (usernameStatus === "taken") {
        setErrorMsg("Sorry, that username is already taken. Please choose another cashtag.");
        setIsLoading(false);
        return;
      }
      if (usernameStatus === "invalid" && username.trim().length > 0) {
        setErrorMsg("Please enter a valid username format (3-20 characters, letters, numbers, underscores).");
        setIsLoading(false);
        return;
      }

      try {
        const targetUsername = normalizedUsername || username;
        const fnClean = validateName(firstName, "First Name").normalized || firstName;
        const lnClean = validateName(lastName, "Last Name").normalized || lastName;
        const dobClean = validateDateOfBirth(dob).normalized || dob;
        const computedName = `${fnClean} ${lnClean}`;

        const url = typeof window !== "undefined" ? localStorage.getItem("financeos_supabase_url") || "" : "";
        const key = typeof window !== "undefined" ? localStorage.getItem("financeos_supabase_key") || "" : "";
        const regRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            firstName: fnClean,
            lastName: lnClean,
            dob: dobClean,
            name: computedName,
            username: targetUsername,
            url,
            key,
          }),
        });
        const regData = await regRes.json();
        if (!regRes.ok) {
          throw new Error(regData.error || "Failed to create account.");
        }

        if (typeof window !== "undefined") {
          if (targetUsername) localStorage.setItem("financeos_username", targetUsername);
          if (fnClean) localStorage.setItem("financeos_first_name", fnClean);
          localStorage.setItem("financeos_display_name", computedName);
        }

        const otpRes = await fetch("/api/auth/otp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        setOtpMessage("Account created! Please enter the 6-digit verification code sent to your email (or shown in your dev console).");
        setStep("otp");
        setIsLoading(false);
        return;
      } catch (err: any) {
        setErrorMsg("Failed to create account: " + err.message);
        setIsLoading(false);
        return;
      }
    }

    // Sign in via credentials provider (Dual-Identifier)
    const targetIdentifier = (identifier || email).trim();
    if (!targetIdentifier) {
      setErrorMsg("Please enter your Email or Username.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await signIn("credentials", {
        redirect: false,
        identifier: targetIdentifier,
        password,
      });

      if (res?.error) {
        if (res.error.includes("OTP_REQUIRED_MIGRATION")) {
          await fetch("/api/auth/otp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: targetIdentifier }),
          });
          setOtpMessage("We detected your Google account! Please enter the 6-digit code sent to your email to set a password.");
          setStep("otp_migration");
          setIsLoading(false);
          return;
        }
        if (res.error.includes("OTP_REQUIRED")) {
          await fetch("/api/auth/otp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: targetIdentifier }),
          });
          setOtpMessage("Email verification required. Please enter the 6-digit verification code sent to your email.");
          setStep("otp");
          setIsLoading(false);
          return;
        }
        throw new Error("Invalid Email/Username or Password.");
      }

      router.push("/auth/resolve");
    } catch (err: any) {
      setErrorMsg(err.message || "Sign in failed.");
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const verifyRes = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Verification failed.");
      }

      if (step === "otp_migration") {
        if (!newPassword || newPassword.length < 6) {
          throw new Error("Please enter a new password of at least 6 characters.");
        }
        const setPassRes = await fetch("/api/auth/set-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: newPassword }),
        });
        const setPassData = await setPassRes.json();
        if (!setPassRes.ok) {
          throw new Error(setPassData.error || "Failed to set password.");
        }
        // Sign in with the newly created password!
        const res = await signIn("credentials", {
          redirect: false,
          email,
          password: newPassword,
        });
        if (res?.error) {
          throw new Error("Password set, but automatic sign-in failed. Please return to login.");
        }
        router.push("/auth/resolve");
        return;
      }

      // For standard OTP verification
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      if (res?.error) {
        throw new Error("Verification complete, but login failed: " + res.error);
      }
      router.push("/auth/resolve");
    } catch (err: any) {
      setErrorMsg(err.message || "Could not verify code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipToDemo = () => {
    setDemoLoading(true);
    router.push("/onboarding");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#06060A] text-white overflow-x-hidden relative selection:bg-[#635BFF] selection:text-white font-sans p-4 sm:p-8">

      {/* ─────────────────────────────────────────────────────────────
          INLINE BUTTERY SMOOTH 60FPS KEYFRAME ANIMATIONS
      ────────────────────────────────────────────────────────────── */}
      <style jsx>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-16px) rotate(1.5deg); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(14px) rotate(-1.5deg); }
        }
        @keyframes aurora-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(80px, -50px) scale(1.15); }
          66% { transform: translate(-60px, 40px) scale(0.9); }
        }
        @keyframes aurora-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-70px, 60px) scale(1.2); }
          66% { transform: translate(50px, -40px) scale(0.85); }
        }
        @keyframes shimmer-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.06); }
        }
        .animate-float-slow {
          animation: float-slow 7s ease-in-out infinite;
        }
        .animate-float-reverse {
          animation: float-reverse 8s ease-in-out infinite;
        }
        .animate-aurora-1 {
          animation: aurora-1 16s ease-in-out infinite;
        }
        .animate-aurora-2 {
          animation: aurora-2 20s ease-in-out infinite;
        }
        .animate-shimmer {
          animation: shimmer-sweep 3.5s infinite;
        }
        .animate-pulse-glow {
          animation: pulse-glow 4s ease-in-out infinite;
        }
      `}</style>

      {/* ─────────────────────────────────────────────────────────────
          MESMERIZING AMBIENT AURORA & LIGHT ORBS (Background)
      ────────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#635BFF]/30 to-purple-600/20 blur-[140px] animate-aurora-1" />
        <div className="absolute top-1/3 -right-32 w-[480px] h-[480px] rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/15 blur-[150px] animate-aurora-2" />
        <div className="absolute -bottom-40 left-1/4 w-[520px] h-[520px] rounded-full bg-gradient-to-t from-indigo-600/20 to-cyan-500/15 blur-[160px] animate-aurora-1" />

        {/* Subtle ultra-fine dot matrix */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MAIN MINIMALIST GATE (Two-Column Floating Layout)
      ────────────────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center py-6">

        {/* ── LEFT COLUMN: Interactive Floating Sanctuary Card (6 cols) ── */}
        <div className="lg:col-span-6 flex flex-col items-center lg:items-start space-y-8 order-2 lg:order-1">

          <div className="text-center lg:text-left space-y-4 max-w-md">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 -ml-4" />
              <span className="text-xs font-bold tracking-wide text-white/90">Personal Wealth Sanctuary</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.08] text-white">
              Clarity for <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-emerald-400">your finances.</span>
            </h1>

            <p className="text-sm sm:text-base text-white/60 font-medium leading-relaxed">
              Experience lightning-fast financial tracking designed with human elegance and total peace of mind.
            </p>
          </div>

          {/* Interactive Floating 3D Card (Responds to Mouse Tilt) */}
          <div
            className="relative w-full max-w-[360px] sm:max-w-[400px] transition-transform duration-300 ease-out py-4"
            style={{
              transform: `perspective(1000px) rotateX(${-mousePos.y * 0.6}deg) rotateY(${mousePos.x * 0.6}deg)`
            }}
          >
            {/* Ambient backglow */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#635BFF] to-emerald-400 opacity-30 blur-2xl animate-pulse-glow pointer-events-none" />

            {/* Main Floating Card */}
            <div className="relative rounded-3xl bg-gradient-to-br from-[#161622]/95 via-[#12121C]/95 to-[#0C0C14]/95 border border-white/15 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-hidden animate-float-slow">

              {/* Shimmer overlay line */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              {/* Card Top Row */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#635BFF] to-indigo-600 flex items-center justify-center shadow-lg border border-white/20">
                    <span className="text-white font-black text-sm">F</span>
                  </div>
                  <span className="text-xs font-bold tracking-widest uppercase text-white/80">FinanceOS</span>
                </div>

                {/* Contactless Chip icon */}
                <div className="w-10 h-7 rounded-lg bg-gradient-to-r from-amber-400/30 to-amber-500/10 border border-amber-400/30 flex items-center justify-center">
                  <span className="text-[10px] font-black text-amber-300">⚡</span>
                </div>
              </div>

              {/* Card Balance Display */}
              <div className="space-y-1 mb-8">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">Total Liquid Balance</span>
                <div className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-baseline gap-2">
                  <span>₦{displayBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    ✦ Live
                  </span>
                </div>
              </div>

              {/* Animated Mini Transaction Pill inside card */}
              <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">
                    ✓
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white/90">Instant Auto-Reconciled</p>
                    <p className="text-[10px] text-white/40">Synced seamlessly across devices</p>
                  </div>
                </div>
                <span className="text-xs font-black text-emerald-400">+₦2,450.00</span>
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
                <span>✦ SANCTUARY CARD</span>
                <span>07 / 28</span>
              </div>
            </div>

            {/* Floating Decorative Micro-Badge (Floats in reverse) */}
            <div className="absolute -bottom-4 -right-4 bg-[#141424] border border-white/15 rounded-2xl px-4 py-2.5 shadow-2xl backdrop-blur-xl flex items-center gap-2.5 animate-float-reverse pointer-events-none">
              <span className="text-base animate-bounce" style={{ animationDuration: '3s' }}>🛡️</span>
              <div>
                <p className="text-[11px] font-bold text-white">Private & Secure</p>
                <p className="text-[9px] text-white/50">Encrypted DB isolation</p>
              </div>
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN: Minimalist High-Converting Auth Box (6 cols) ── */}
        <div className="lg:col-span-6 flex justify-center order-1 lg:order-2">

          <div className="w-full max-w-[440px] rounded-3xl bg-[#0F0F1A]/85 border border-white/10 backdrop-blur-2xl p-7 sm:p-9 shadow-[0_25px_70px_rgba(0,0,0,0.8)] relative overflow-hidden space-y-6">

            {/* Top accent border light */}
            <div className="absolute top-0 left-10 right-10 h-[1.5px] bg-gradient-to-r from-transparent via-[#635BFF] to-transparent opacity-80" />

            {/* Mode Toggle & Wizard Step Indicator */}
            {step === "auth" ? (
              <>
                <div className="space-y-3">
                  <div className="flex rounded-xl bg-white/[0.04] p-1 border border-white/10">
                    <button
                      type="button"
                      onClick={() => { setAuthMode("signin"); setErrorMsg(null); }}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-extrabold transition-all ${authMode === "signin"
                        ? "bg-[#635BFF] text-white shadow-md scale-[1.01]"
                        : "text-white/50 hover:text-white"
                        }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode("signup"); setSignupWizardStep(1); setErrorMsg(null); }}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-extrabold transition-all ${authMode === "signup"
                        ? "bg-[#635BFF] text-white shadow-md scale-[1.01]"
                        : "text-white/50 hover:text-white"
                        }`}
                    >
                      Create Account
                    </button>
                  </div>

                  {authMode === "signup" && (
                    <div className="flex items-center justify-between px-1 text-[11px] font-bold text-white/60">
                      <span>{signupWizardStep === 1 ? "Step 1: Personal Details" : "Step 2: Account & Security"}</span>
                      <span className="text-[#8C85FF] font-black">{signupWizardStep} / 2</span>
                    </div>
                  )}
                </div>

                {/* Error Message Display */}
                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs text-center font-bold animate-fadeIn">
                    ⚠️ {errorMsg}
                  </div>
                )}

                {/* Authentication / Registration Form */}
                <form onSubmit={handleCredentialsAuth} className="space-y-4">
                  {authMode === "signin" ? (
                    <>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">Email or Username</label>
                        <input
                          type="text"
                          value={identifier || email}
                          onChange={(e) => { setIdentifier(e.target.value); setEmail(e.target.value); }}
                          placeholder="name@example.com or $username"
                          autoComplete="username"
                          required
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/15 text-sm font-medium text-white placeholder:text-white/30 focus:border-[#635BFF] focus:outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">Password</label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          required
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/15 text-sm font-medium text-white placeholder:text-white/30 focus:border-[#635BFF] focus:outline-none transition-all"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading || demoLoading}
                        className="w-full py-4 px-6 rounded-2xl bg-[#635BFF] hover:bg-[#574EE5] text-white font-extrabold text-sm shadow-[0_6px_20px_rgba(99,91,255,0.4)] transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-50 border border-white/20 mt-2"
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Verifying Credentials...</span>
                          </div>
                        ) : (
                          <span>Sign In to Command Center →</span>
                        )}
                      </button>
                    </>
                  ) : signupWizardStep === 1 ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">First Name</label>
                          <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="John"
                            autoComplete="given-name"
                            required
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/15 text-sm font-medium text-white placeholder:text-white/30 focus:border-[#635BFF] focus:outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">Last Name</label>
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Doe"
                            autoComplete="family-name"
                            required
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/15 text-sm font-medium text-white placeholder:text-white/30 focus:border-[#635BFF] focus:outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">Date of Birth</label>
                          <span className="text-[10px] font-semibold text-[#8C85FF]"></span>
                        </div>
                        <input
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          autoComplete="bday"
                          required
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/15 text-sm font-medium text-white placeholder:text-white/30 focus:border-[#635BFF] focus:outline-none transition-all"
                        />
                        {dob && dobCheck.isValid && (
                          <p className="text-[11px] font-bold text-emerald-400 mt-1 flex items-center gap-1">
                            <span>✓ Verified Age (Compliant 13+)</span>
                          </p>
                        )}
                        {dob && !dobCheck.isValid && (
                          <p className="text-[11px] font-bold text-red-400 mt-1">
                            ⚠️ {dobCheck.error}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleStep1Next}
                        className="w-full py-4 px-6 rounded-2xl bg-[#635BFF] hover:bg-[#574EE5] text-white font-extrabold text-sm shadow-[0_6px_20px_rgba(99,91,255,0.4)] transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] border border-white/20 mt-4"
                      >
                        <span>Next: Account & Security →</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">Username Handle ($Cashtag)</label>
                        <UsernameInput
                          value={username}
                          onChange={(val) => setUsername(val)}
                          onStatusChange={(st, norm) => {
                            setUsernameStatus(st);
                            setNormalizedUsername(norm);
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">Email Address</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@domain.com"
                          autoComplete="email"
                          required
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/15 text-sm font-medium text-white placeholder:text-white/30 focus:border-[#635BFF] focus:outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">Password (10+ Chars)</label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 10 characters"
                          autoComplete="new-password"
                          required
                          minLength={10}
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/15 text-sm font-medium text-white placeholder:text-white/30 focus:border-[#635BFF] focus:outline-none transition-all"
                        />
                        {/* Dynamic Password Strength Meter Bar */}
                        {password.length > 0 && (
                          <div className="space-y-1 pt-1 animate-fadeIn">
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full transition-all duration-300 rounded-full"
                                style={{ width: pwdStrength.width, backgroundColor: pwdStrength.color }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                              <span style={{ color: pwdStrength.color }}>Strength: {pwdStrength.label}</span>
                              <span className="text-white/40">10+ Chars (A-Z, a-z, 0-9)</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => { setSignupWizardStep(1); setErrorMsg(null); }}
                          className="py-3.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white/80 font-bold text-xs transition-all"
                        >
                          ← Back
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading || demoLoading || !dobCheck.isValid || usernameStatus === "taken" || usernameStatus === "invalid"}
                          className="flex-1 py-4 px-6 rounded-2xl bg-[#635BFF] hover:bg-[#574EE5] text-white font-extrabold text-sm shadow-[0_6px_20px_rgba(99,91,255,0.4)] transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 border border-white/20"
                        >
                          {isLoading ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Encrypting & Registering...</span>
                            </div>
                          ) : (
                            <span>Create Account & Continue →</span>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5 animate-fadeIn">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#635BFF]/20 border border-[#635BFF]/40 text-[#8C85FF] flex items-center justify-center text-2xl mx-auto mb-3 shadow-md">
                    🔐
                  </div>
                  <h3 className="text-lg font-black text-white">
                    {step === "otp_migration" ? "Set Your Account Password" : "Verify Your Email Address"}
                  </h3>
                  <p className="text-xs text-white/70 leading-relaxed">
                    {otpMessage || `We sent a 6-digit verification code to ${email}.`}
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs text-center font-bold">
                    ⚠️ {errorMsg}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/60 block text-center">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="• • • • • •"
                    required
                    className="w-full text-center text-2xl tracking-[0.5em] font-mono font-black py-4 rounded-2xl bg-white/[0.05] border-2 border-[#635BFF]/60 text-white placeholder:text-white/20 focus:border-[#635BFF] focus:outline-none transition-all shadow-inner"
                  />
                </div>

                {step === "otp_migration" && (
                  <div className="space-y-1 pt-2 border-t border-white/10">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      Create Your New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      minLength={6}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/15 text-sm font-medium text-white placeholder:text-white/30 focus:border-[#635BFF] focus:outline-none transition-all"
                    />
                    <p className="text-[10px] text-white/40">You will use this password alongside your email for all future sign-ins.</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || otpCode.length !== 6 || (step === "otp_migration" && newPassword.length < 6)}
                  className="w-full py-4 px-6 rounded-2xl bg-[#635BFF] hover:bg-[#574EE5] text-white font-extrabold text-sm shadow-[0_6px_20px_rgba(99,91,255,0.4)] transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-50 border border-white/20"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying & Unlocking...</span>
                    </div>
                  ) : (
                    <span>{step === "otp_migration" ? "Verify Code & Set Password →" : "Verify Code & Access Workspace →"}</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep("auth"); setErrorMsg(null); }}
                  className="w-full text-center text-xs font-bold text-white/50 hover:text-white transition-colors pt-2 block"
                >
                  ← Back to Sign In / Email Entry
                </button>
              </form>
            )}

            {/* Minimalist Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-white/[0.08]" />
              <span className="flex-shrink mx-4 text-[10px] font-bold uppercase tracking-widest text-white/30">
                Or choose direct login
              </span>
              <div className="flex-grow border-t border-white/[0.08]" />
            </div>

            {/* Instant Demo Account One-Click Login Button */}
            <button
              onClick={handleQuickDemoLogin}
              disabled={isLoading || demoLoading}
              type="button"
              className="w-full py-3.5 px-6 rounded-2xl border border-[#635BFF]/40 hover:border-[#635BFF] bg-[#635BFF]/10 hover:bg-[#635BFF]/20 text-[#A5A1FF] hover:text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 shadow-sm"
            >
              <span>⚡ Quick Login as Demo User (`demo@financeos.com`)</span>
            </button>

            {/* Secondary Action: Minimalist Interactive Demo Launch */}
            <button
              onClick={handleSkipToDemo}
              disabled={isLoading || demoLoading}
              type="button"
              className="w-full py-3 px-6 rounded-2xl border border-white/10 hover:border-white/20 bg-transparent text-white/60 hover:text-white font-medium text-[11px] transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            >
              <span>✨ Try Demo Without Signing In</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}