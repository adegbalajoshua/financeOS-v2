"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  validateEmail,
  validatePassword,
  validateName,
  validateDateOfBirth,
  calculatePasswordStrength,
} from "@/domain/auth/validation";
import { UsernameInput } from "@/components/UsernameInput";
import { UsernameStatus } from "@/hooks/useDebouncedUsernameCheck";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, ShieldCheck, Cpu, HardDrive } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  // -- Auth State --
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<"auth" | "otp" | "otp_migration">("auth");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  // -- Presentation State --
  const [isBooting, setIsBooting] = useState(true);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReducedMotion(isReduced);

    if (!isReduced) {
      const handleMouseMove = (e: MouseEvent) => {
        setMousePos({
          x: (e.clientX / window.innerWidth - 0.5) * 30,
          y: (e.clientY / window.innerHeight - 0.5) * 30,
        });
      };
      window.addEventListener("mousemove", handleMouseMove);
      return () => window.removeEventListener("mousemove", handleMouseMove);
    }
  }, []);

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

  // Boot Sequence Logic
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasBooted = sessionStorage.getItem('financeos_booted') === 'true';

    if (prefersReducedMotion || hasBooted) {
      setIsBooting(false);
      return;
    }

    const lines = [
      "financeOS v2.0.1",
      "Initializing secure vault... [OK]",
      "Loading financial core... [OK]",
      "Establishing encrypted connection... [OK]",
      "System Ready."
    ];

    let currentLine = 0;
    const interval = setInterval(() => {
      setBootLines((prev) => [...prev, lines[currentLine]]);
      currentLine++;
      if (currentLine >= lines.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsBooting(false);
          sessionStorage.setItem('financeos_booted', 'true');
        }, 500);
      }
    }, 300);

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
        
        if (!otpRes.ok) {
          const otpErr = await otpRes.json().catch(() => ({}));
          throw new Error(otpErr.error || "Failed to dispatch verification email.");
        }

        setOtpMessage("Account created! Please enter the 6-digit verification code sent to your email.");
        setStep("otp");
        setIsLoading(false);
        return;
      } catch (err: any) {
        setErrorMsg("Failed to create account: " + err.message);
        setIsLoading(false);
        return;
      }
    }

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
          const otpRes = await fetch("/api/auth/otp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: targetIdentifier }),
          });
          if (!otpRes.ok) {
            const otpErr = await otpRes.json().catch(() => ({}));
            throw new Error(otpErr.error || "Failed to dispatch verification email.");
          }
          setOtpMessage("We detected your existing account! Please enter the 6-digit code sent to your email to set a password.");
          setStep("otp_migration");
          setIsLoading(false);
          return;
        }
        if (res.error.includes("OTP_REQUIRED")) {
          const otpRes = await fetch("/api/auth/otp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: targetIdentifier }),
          });
          if (!otpRes.ok) {
            const otpErr = await otpRes.json().catch(() => ({}));
            throw new Error(otpErr.error || "Failed to dispatch verification email.");
          }
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

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setErrorMsg(null);
    try {
      const otpRes = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier || email }),
      });
      if (!otpRes.ok) {
        const err = await otpRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to resend code.");
      }
      setCooldown(60);
      setOtpMessage("A new verification code has been sent.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to resend code.");
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

  // --- Boot Sequence Entrance View ---
  // Renders the standalone terminal boot that dissolves into the form.
  if (isBooting) {
    return (
      <AnimatePresence>
        <motion.div
          key="boot"
          exit={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
          transition={{ duration: 0.4 }}
          className="min-h-screen w-full bg-[#06060A] flex flex-col items-start justify-end p-8 sm:p-16 font-mono text-white/70 overflow-hidden relative"
        >
          {/* Diagnostic OS accents during boot only */}
          <div className="absolute top-12 left-12 border border-white/10 bg-white/5 p-3 rounded text-[10px] uppercase tracking-widest text-white/40 shadow-xl hidden md:block">
            sys.network <span className="text-[#635BFF] ml-2">Connected</span>
          </div>
          <div className="absolute top-1/4 right-16 border border-white/10 bg-white/5 p-3 rounded text-[10px] uppercase tracking-widest text-white/40 shadow-xl hidden md:block">
            mem.alloc <span className="text-white/80 ml-2">48%</span>
          </div>

          <div className="z-10 space-y-2">
            {bootLines.map((line, idx) => (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={idx}
                className="text-sm font-bold text-white/80"
              >
                {">"} {line}
              </motion.p>
            ))}
            <motion.div
              animate={{ opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="w-2.5 h-4 bg-white/80 mt-2"
            />
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // --- Main Harmonized Auth View ---
  return (
    <div className="min-h-screen w-full bg-[#06060A] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans text-white">

      {/* Subtle Grid Accent (Global) */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff04_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Ambient Aurora Background (Responsive to mouse unless reduced motion) */}
      <div
        className={`absolute inset-0 pointer-events-none transition-transform ${!reducedMotion ? 'duration-1000 ease-out' : ''}`}
        style={{ transform: !reducedMotion ? `translate(${mousePos.x}px, ${mousePos.y}px)` : 'none' }}
      >
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#635BFF]/15 blur-[120px] mix-blend-screen" />
        <div className="absolute top-1/4 -right-32 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[150px] mix-blend-screen" />
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[130px] mix-blend-screen" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[440px] rounded-3xl bg-[#0F0F1A]/85 border border-white/10 backdrop-blur-2xl p-7 sm:p-9 shadow-[0_25px_70px_rgba(0,0,0,0.8)] flex flex-col space-y-6"
      >
        {/* Harmonized Form Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#635BFF] to-indigo-600 flex items-center justify-center shadow-lg border border-white/20">
              <span className="text-white font-black text-[10px]">F</span>
            </div>
            <span className="text-[10px] font-mono tracking-widest text-white/50 uppercase">financeOS</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Access Dashboard</h1>
          <p className="text-sm font-medium text-white/50">Your private financial sanctuary.</p>
        </div>

        {step === "auth" ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={authMode + signupWizardStep}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-5"
            >

              {/* Settings-style Toggle Tabs */}
              <div className="flex rounded-xl bg-white/[0.04] p-1 border border-white/10 relative">
                <button
                  type="button"
                  onClick={() => { setAuthMode("signin"); setErrorMsg(null); }}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-extrabold transition-all relative z-10 ${authMode === "signin" ? "text-white" : "text-white/50 hover:text-white"}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode("signup"); setSignupWizardStep(1); setErrorMsg(null); }}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-extrabold transition-all relative z-10 ${authMode === "signup" ? "text-white" : "text-white/50 hover:text-white"}`}
                >
                  Create Account
                </button>
                {/* Active Tab Background Pill */}
                <div
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#635BFF] rounded-lg shadow-md transition-all duration-300 ease-out ${authMode === "signin" ? "left-1" : "left-[calc(50%+2px)]"}`}
                />
              </div>

              {authMode === "signup" && (
                <div className="flex items-center justify-between px-1 text-[11px] font-bold text-white/60">
                  <span>{signupWizardStep === 1 ? "Step 1: Personal Details" : "Step 2: Account & Security"}</span>
                  <span className="text-[#8C85FF] font-black">{signupWizardStep} / 2</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs text-center font-bold">
                  ⚠️ {errorMsg}
                </div>
              )}

              <form onSubmit={handleCredentialsAuth} className="space-y-4">
                {authMode === "signin" ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">Email or Username</label>
                      <input
                        type="text"
                        value={identifier || email}
                        onChange={(e) => { setIdentifier(e.target.value); setEmail(e.target.value); }}
                        placeholder="Email or $username"
                        autoComplete="username"
                        required
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/15 text-sm font-medium text-white placeholder:text-white/30 focus:border-[#635BFF] focus:outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
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

                    {/* Magnetic / Spring Animated Primary Button */}
                    <motion.button
                      whileHover={!reducedMotion ? { scale: 1.02 } : {}}
                      whileTap={!reducedMotion ? { scale: 0.98 } : {}}
                      type="submit"
                      disabled={isLoading || demoLoading}
                      className="w-full mt-2 py-4 px-6 rounded-2xl bg-[#635BFF] hover:bg-[#574EE5] text-white font-extrabold text-sm shadow-[0_6px_20px_rgba(99,91,255,0.4)] hover:shadow-[0_8px_25px_rgba(99,91,255,0.6)] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 border border-white/20"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Verifying Credentials...</span>
                        </div>
                      ) : (
                        <span>Sign In to Dashboard →</span>
                      )}
                    </motion.button>
                  </>
                ) : signupWizardStep === 1 ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
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
                      <div className="space-y-1.5">
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

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">Date of Birth</label>
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
                          <span>✓ Verified Age</span>
                        </p>
                      )}
                      {dob && !dobCheck.isValid && (
                        <p className="text-[11px] font-bold text-red-400 mt-1">
                          ⚠️ {dobCheck.error}
                        </p>
                      )}
                    </div>

                    <motion.button
                      whileHover={!reducedMotion ? { scale: 1.02 } : {}}
                      whileTap={!reducedMotion ? { scale: 0.98 } : {}}
                      type="button"
                      onClick={handleStep1Next}
                      className="w-full py-4 px-6 rounded-2xl bg-[#635BFF] hover:bg-[#574EE5] text-white font-extrabold text-sm shadow-[0_6px_20px_rgba(99,91,255,0.4)] transition-all flex items-center justify-center gap-2.5 border border-white/20 mt-4"
                    >
                      <span>Continue to Security →</span>
                    </motion.button>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
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

                    <div className="space-y-1.5">
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
                      <motion.button
                        whileHover={!reducedMotion ? { scale: 1.02 } : {}}
                        whileTap={!reducedMotion ? { scale: 0.98 } : {}}
                        type="submit"
                        disabled={isLoading || demoLoading || !dobCheck.isValid || usernameStatus === "taken" || usernameStatus === "invalid"}
                        className="flex-1 py-4 px-6 rounded-2xl bg-[#635BFF] hover:bg-[#574EE5] text-white font-extrabold text-sm shadow-[0_6px_20px_rgba(99,91,255,0.4)] hover:shadow-[0_8px_25px_rgba(99,91,255,0.6)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-white/20"
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Registering...</span>
                          </div>
                        ) : (
                          <span>Create Account →</span>
                        )}
                      </motion.button>
                    </div>
                  </>
                )}
              </form>
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onSubmit={handleVerifyOtp}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#635BFF]/20 border border-[#635BFF]/40 text-[#8C85FF] flex items-center justify-center mx-auto mb-3 shadow-md">
                <ShieldCheck className="w-6 h-6 text-[#8C85FF]" />
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
              </div>
            )}

            <motion.button
              whileHover={!reducedMotion ? { scale: 1.02 } : {}}
              whileTap={!reducedMotion ? { scale: 0.98 } : {}}
              type="submit"
              disabled={isLoading || otpCode.length !== 6 || (step === "otp_migration" && newPassword.length < 6)}
              className="w-full py-4 px-6 rounded-2xl bg-[#635BFF] hover:bg-[#574EE5] text-white font-extrabold text-sm shadow-[0_6px_20px_rgba(99,91,255,0.4)] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 border border-white/20"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying...</span>
                </div>
              ) : (
                <span>{step === "otp_migration" ? "Set Password & Enter →" : "Verify Code & Enter →"}</span>
              )}
            </motion.button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => { setStep("auth"); setErrorMsg(null); }}
                className="text-xs font-bold text-white/50 hover:text-white transition-colors"
              >
                ← Back to Sign In
              </button>
              
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={cooldown > 0 || isLoading}
                className={`text-xs font-bold transition-colors ${cooldown > 0 ? "text-white/30 cursor-not-allowed" : "text-[#8C85FF] hover:text-[#A5A1FF]"}`}
              >
                {cooldown > 0 ? `Resend Code (${cooldown}s)` : "Resend Code"}
              </button>
            </div>
          </motion.form>
        )}

        {process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS === "true" && (
          <div className="pt-2">
            <div className="relative flex py-1 items-center mb-4">
              <div className="flex-grow border-t border-white/[0.08]" />
              <span className="flex-shrink mx-4 text-[10px] font-bold uppercase tracking-widest text-white/30">
                Or diagnostic overrides
              </span>
              <div className="flex-grow border-t border-white/[0.08]" />
            </div>

            <button
              onClick={handleQuickDemoLogin}
              disabled={isLoading || demoLoading}
              type="button"
              className="w-full py-3.5 px-6 rounded-2xl border border-[#635BFF]/40 hover:border-[#635BFF] bg-[#635BFF]/10 hover:bg-[#635BFF]/20 text-[#A5A1FF] hover:text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 shadow-sm mb-2"
            >
              <span>⚡ Inject Demo Profile (`demo@financeos.com`)</span>
            </button>

            <button
              onClick={handleSkipToDemo}
              disabled={isLoading || demoLoading}
              type="button"
              className="w-full py-3 px-6 rounded-2xl border border-white/10 hover:border-white/20 bg-transparent text-white/60 hover:text-white font-medium text-[11px] transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            >
              <span>✨ Bypass Auth (Guest Mode)</span>
            </button>
          </div>
        )}

      </motion.div>
    </div>
  );
}