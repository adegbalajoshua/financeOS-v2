"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useAppData } from "@/lib/appContext";
import { CsvImportTool } from "@/components/CsvImportTool";
import { UsernameInput } from "@/components/UsernameInput";
import { UsernameStatus } from "@/hooks/useDebouncedUsernameCheck";

type Section = "profile" | "data" | "notifications";

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
      <div className="mr-6 min-w-0 flex-1">
        <p className="text-sm font-bold truncate" style={{ color: "var(--foreground)" }}>{label}</p>
        {description && <p className="text-xs font-medium mt-0.5 text-ellipsis overflow-hidden" style={{ color: "var(--muted-foreground)" }}>{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ defaultChecked = false, storageKey }: { defaultChecked?: boolean; storageKey?: string }) {
  const [on, setOn] = useState(defaultChecked);

  useEffect(() => {
    if (typeof window !== "undefined" && storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        setOn(saved === "true");
      }
    }
  }, [storageKey]);

  const handleToggle = () => {
    const nextVal = !on;
    setOn(nextVal);
    if (typeof window !== "undefined" && storageKey) {
      localStorage.setItem(storageKey, String(nextVal));
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30"
      style={{ backgroundColor: on ? "#635BFF" : "var(--muted)" }}
    >
      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--muted)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
  borderRadius: "0.75rem",
  padding: "0.5rem 0.875rem",
  fontSize: "0.875rem",
  fontWeight: 500,
  outline: "none",
};

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: "profile",       label: "Profile",       icon: "👤" },
  { id: "data",          label: "Data Store",    icon: "📁" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
];

export default function SettingsPage() {
  const { data: session, status, update: updateSession } = useSession();
  const { runPurge, events, accounts, budgets, activeCycleId, supabaseCreds, logoutAndClearCache } = useAppData();
  const [active, setActive] = useState<Section>("profile");
  const [savedMessage, setSavedMessage] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [normalizedUsername, setNormalizedUsername] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("NGN");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      let savedName = localStorage.getItem("financeos_display_name");

      if (status === "authenticated" && session?.user && session.user.email !== "demo@financeos.com") {
        const sName = session.user.name || session.user.email?.split("@")[0];
        if (sName && sName !== "Demo Account User") {
          if (!savedName || savedName === "Demo Account User" || savedName === "Demo User" || savedName.toLowerCase().includes("joshua")) {
            savedName = sName;
            localStorage.setItem("financeos_display_name", savedName);
            localStorage.setItem("financeos_first_name", savedName.split(" ")[0]);
          }
        }
      }

      if (savedName && savedName.toLowerCase().includes("joshua")) {
        savedName = "Demo Account User";
        localStorage.setItem("financeos_display_name", savedName);
      }
      if (savedName) {
        setDisplayName(savedName);
      } else if (session?.user?.name) {
        setDisplayName(session.user.name);
      } else {
        setDisplayName("Demo Account User");
      }

      const savedCurr = localStorage.getItem("financeos_base_currency");
      if (savedCurr) setBaseCurrency(savedCurr);

      const savedDate = localStorage.getItem("financeos_date_format");
      if (savedDate) setDateFormat(savedDate);

      let savedUsername = localStorage.getItem("financeos_username");
      if (status === "authenticated" && session?.user && session.user.email !== "demo@financeos.com") {
        const sUser = (session.user as any).username || session.user.email?.split("@")[0]?.toLowerCase();
        if (sUser && sUser !== "demo_user" && (!savedUsername || savedUsername === "demo_user" || savedUsername.toLowerCase().includes("joshua"))) {
          savedUsername = sUser;
          localStorage.setItem("financeos_username", savedUsername as string);
        }
      }
      if (savedUsername) {
        setUsername(savedUsername);
      } else if ((session?.user as any)?.username) {
        setUsername((session?.user as any).username);
      } else if (session?.user?.email) {
        setUsername(session.user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_-]/g, "_"));
      }
    }
  }, [session, status]);

  const isPracticeMode = typeof window !== "undefined" && localStorage.getItem("financeos_practice_mode") === "true";
  const hasCustomEvents = (events || []).some(e => !String(e.id || "").startsWith("demo-") && !String(e.id || "").startsWith("tx-00") && !String(e.id || "").startsWith("sample-"));
  const hasCustomAccounts = (accounts || []).some(a => !["GTBank Salary", "Zenith Savings", "OPay Wallet", "Cash", "Kuda Daily", "PiggyVest Savings", "Cowrywise Invest", "Main Checking"].includes(a.name));
  const isRealWorkspace = !isPracticeMode && (
    (typeof window !== "undefined" && localStorage.getItem("financeos_onboarding_completed") === "true") ||
    hasCustomEvents ||
    hasCustomAccounts
  );

  const handleSave = async () => {
    if (usernameStatus === "taken") {
      alert("❌ Sorry, that username is already taken. Please pick another one before saving.");
      return;
    }
    if (usernameStatus === "invalid") {
      alert("❌ Please enter a valid username (letters, numbers, underscores, 3-20 chars).");
      return;
    }

    setSavingProfile(true);
    try {
      const targetUsername = normalizedUsername || username;
      if (typeof window !== "undefined") {
        localStorage.setItem("financeos_display_name", displayName);
        if (targetUsername) localStorage.setItem("financeos_username", targetUsername);
        localStorage.setItem("financeos_base_currency", baseCurrency);
        localStorage.setItem("financeos_date_format", dateFormat);
        window.dispatchEvent(new Event("financeos_profile_updated"));
      }

      if (status === "authenticated" && session?.user?.email) {
        const res = await fetch("/api/auth/profile/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: displayName, username: targetUsername, currency: baseCurrency, dateFormat }),
        });
        const data = await res.json();
        if (res.ok) {
          if (updateSession) {
            await updateSession({ name: displayName, username: targetUsername } as any);
          }
          setSavedMessage(true);
          setTimeout(() => setSavedMessage(false), 3000);
        } else {
          alert("❌ " + (data.error || "Failed to update profile records."));
        }
      } else {
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 3000);
      }
    } catch (e: any) {
      console.error("Save profile error:", e);
      alert("❌ Error saving changes: " + e.message);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Settings Form & Navigation (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>Settings</h1>
            <p className="text-sm font-medium mt-1" style={{ color: "var(--muted-foreground)" }}>Manage your account, data store, and personal preferences.</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1.5 p-1.5 rounded-2xl border w-full sm:w-fit overflow-x-auto no-scrollbar" style={{ backgroundColor: "var(--muted)", borderColor: "var(--border)" }}>
            {NAV.map((item) => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                    isActive ? "bg-[#635BFF] text-white shadow-md shadow-[#635BFF]/25" : "hover:text-foreground text-muted-foreground"
                  }`}
                  style={isActive ? {} : { color: "var(--muted-foreground)" }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Settings Box */}
          <div className="rounded-3xl border overflow-hidden shadow-sm transition-all" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
            {active === "profile" && (
              <div className="p-6 sm:p-8 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--muted-foreground)" }}>Personal Info</p>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#635BFF]/10 border-2 border-[#635BFF]/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-[#635BFF] font-extrabold text-2xl">
                        {(displayName || session?.user?.name || "DA").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-extrabold text-lg" style={{ color: "var(--foreground)" }}>
                        {(status === "authenticated" && session?.user && session.user.email !== "demo@financeos.com" && session.user.name !== "Demo Account User")
                          ? (displayName && displayName !== "Demo Account User" && displayName !== "Demo User" ? displayName : (session.user.name || session.user.email?.split("@")[0]))
                          : (displayName || session?.user?.name || "Demo Account User")}
                      </p>
                      <p className="text-xs font-medium mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                        {session?.user?.email ? `${session.user.email} • ` : "Local Demo Workspace • "}Active Cycle: <strong>{activeCycleId || "Jul-26"}</strong>
                      </p>
                    </div>
                  </div>

                  {status === "authenticated" && (
                    <button
                      onClick={async () => {
                        if (window.confirm("Sign out and clear local device cache for total privacy?")) {
                          await logoutAndClearCache();
                          await signOut({ callbackUrl: "/login" });
                        }
                      }}
                      className="px-5 py-2.5 rounded-2xl bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 font-bold text-xs transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span>🚪 Sign Out</span>
                    </button>
                  )}
                </div>

                <SettingRow label="Display Name" description="Your name shown across the interface">
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name..."
                    style={{ ...inputStyle, width: "14rem" }}
                  />
                </SettingRow>
                <SettingRow label="Username Handle ($Cashtag)" description="Your unique cashtag handle across the platform">
                  <div style={{ width: "16rem" }}>
                    <UsernameInput
                      initialUsername={username}
                      value={username}
                      onChange={(val) => setUsername(val)}
                      onStatusChange={(st, norm) => {
                        setUsernameStatus(st);
                        setNormalizedUsername(norm);
                      }}
                    />
                  </div>
                </SettingRow>
                <SettingRow label="Base Currency" description="Default currency token across financial calculations">
                  <select
                    value={baseCurrency}
                    onChange={(e) => setBaseCurrency(e.target.value)}
                    style={{ ...inputStyle, width: "9rem" }}
                  >
                    <option value="NGN">NGN ₦</option>
                    <option value="USD">USD $</option>
                    <option value="GBP">GBP £</option>
                    <option value="EUR">EUR €</option>
                  </select>
                </SettingRow>
                <SettingRow label="Date Format" description="How timeline and transaction timestamps are formatted">
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    style={{ ...inputStyle, width: "11rem" }}
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </SettingRow>
              </div>
            )}

            {active === "data" && (
              <div className="p-6 sm:p-8 space-y-6">

                {/* Admin Seed Demo Tables Tool */}
                <div className="p-4 rounded-2xl bg-[#635BFF]/10 border border-[#635BFF]/30 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-[#635BFF]">🌱 Reset Sample Data (Demo Mode)</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Restore the default sample accounts and transactions for demonstration mode.</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!supabaseCreds.url || !supabaseCreds.key) {
                        alert("❌ Missing database configuration. Please verify environment settings.");
                        return;
                      }
                      const confirmSeed = confirm("Proceed to restore sample demo data?");
                      if (!confirmSeed) return;
                      try {
                        const res = await fetch("/api/demo/seed", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ url: supabaseCreds.url, key: supabaseCreds.key }),
                        });
                        const data = await res.json();
                        alert(data.success ? `✅ ${data.message}` : `❌ Error: ${data.error}`);
                      } catch (err: any) {
                        alert("❌ Failed to restore sample data: " + err.message);
                      }
                    }}
                    className="px-4 py-2 bg-[#635BFF] hover:bg-[#5851e5] text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 flex-shrink-0"
                  >
                    Restore Sample Data 🚀
                  </button>
                </div>

                <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                  <CsvImportTool />
                </div>
              </div>
            )}

            {active === "notifications" && (
              <div className="p-6 sm:p-8 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--muted-foreground)" }}>Alerts & Reminders</p>
                <SettingRow label="Over-Budget Watchlist Alerts" description="Instant banner alerts when a category consumes over 100% of budget"><Toggle defaultChecked={true} storageKey="financeos_notify_overbudget" /></SettingRow>
                <SettingRow label="Cycle Net Worth Recap" description="End-of-cycle summary report when rolling over to a new month"><Toggle defaultChecked={true} storageKey="financeos_notify_recap" /></SettingRow>
                <SettingRow label="Recurring Subscription Warnings" description="Remind me 3 days before regular subscription debits (`e.g., Netflix / Spotify`)"><Toggle defaultChecked={true} storageKey="financeos_notify_subscriptions" /></SettingRow>
                <SettingRow label="Low Liquid Cash Warning" description="Alert when total liquid cash drops below ₦10,000 threshold"><Toggle defaultChecked={false} storageKey="financeos_notify_lowcash" /></SettingRow>
              </div>
            )}
          </div>

          {/* Save Action */}
          <div className="flex items-center justify-end gap-3">
            {savedMessage && (
              <span className="text-xs font-bold text-emerald-500 animate-in fade-in duration-200">
                ✅ Settings saved successfully
              </span>
            )}
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-[#635BFF] hover:bg-[#5851e5] text-white rounded-xl text-sm font-bold transition-all shadow-[0_4px_12px_rgba(99,91,255,0.3)] active:scale-95"
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* Right Column: Database Health & Storage Overview (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
          
          {/* Workspace Data Records Overview */}
          <div className="p-6 rounded-3xl border shadow-sm space-y-4" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Workspace Data Records</h3>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#635BFF]/10 text-[#635BFF]">
                Active Memory Engine
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-muted border">
                <p className="text-lg font-extrabold" style={{ color: "var(--foreground)" }}>{events.length}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Transactions</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-muted border">
                <p className="text-lg font-extrabold" style={{ color: "var(--foreground)" }}>{accounts.length}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Accounts</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-muted border">
                <p className="text-lg font-extrabold" style={{ color: "var(--foreground)" }}>{budgets.length}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Categories</p>
              </div>
            </div>

            {mounted && !isRealWorkspace && (
              <div className="pt-2">
                <button
                  onClick={() => {
                    if (confirm("Restore standard sample data for practice?")) {
                      runPurge("local");
                    }
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-bold border transition-all hover:bg-[#635BFF]/10 text-[#635BFF] flex items-center justify-center gap-2"
                  style={{ borderColor: "rgba(99,91,255,0.3)" }}
                >
                  <span>🔄</span>
                  <span>Load Demonstration Sample Data</span>
                </button>
              </div>
            )}
          </div>

          {/* Security & Privacy Card */}
          <div className="p-6 rounded-3xl border shadow-sm space-y-3" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-base">
                🔒
              </div>
              <h3 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Complete Data Protection</h3>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              Every transaction and account you create is securely linked to your private profile. Your financial history stays strictly confidential and protected across all devices.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}