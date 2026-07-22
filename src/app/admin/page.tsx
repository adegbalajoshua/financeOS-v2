"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ShieldAlert, ShieldCheck, Mail, AlertTriangle, Activity, AlertCircle, Database, LogIn, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SecurityEvent {
  id: string;
  event_type: string;
  email: string;
  ip_address: string | null;
  metadata: any;
  created_at: string;
}

interface AppLogEvent {
  id: string;
  log_type: string;
  category: string;
  message: string;
  user_email: string | null;
  metadata: any;
  created_at: string;
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"security" | "activity" | "errors">("activity");
  
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [activityLogs, setActivityLogs] = useState<AppLogEvent[]>([]);
  const [errorLogs, setErrorLogs] = useState<AppLogEvent[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [secRes, actRes, errRes] = await Promise.all([
          fetch("/api/admin/audit"),
          fetch("/api/admin/logs?type=activity"),
          fetch("/api/admin/logs?type=error")
        ]);

        if (!secRes.ok || !actRes.ok || !errRes.ok) {
          throw new Error(`Failed to fetch audit events.`);
        }

        const [secData, actData, errData] = await Promise.all([
          secRes.json(),
          actRes.json(),
          errRes.json()
        ]);

        setSecurityEvents(secData.events || []);
        setActivityLogs(actData.events || []);
        setErrorLogs(errData.events || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getEventIcon = (type: string, category?: string) => {
    if (type === "OTP_VERIFIED") return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
    if (type === "OTP_FAILED_ATTEMPT") return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    if (type === "OTP_LOCKOUT") return <ShieldAlert className="w-4 h-4 text-red-400" />;
    if (type === "OTP_SENT") return <Mail className="w-4 h-4 text-blue-400" />;
    
    if (category === "auth") return <LogIn className="w-4 h-4 text-indigo-400" />;
    if (category === "transaction") return <Activity className="w-4 h-4 text-emerald-400" />;
    if (category === "account") return <Database className="w-4 h-4 text-blue-400" />;
    if (category === "budget") return <Settings className="w-4 h-4 text-amber-400" />;
    if (type === "error") return <AlertCircle className="w-4 h-4 text-rose-400" />;
    
    return <Activity className="w-4 h-4 text-white/50" />;
  };

  const getEventBadge = (type: string, category?: string) => {
    if (type === "OTP_VERIFIED") return <span className="px-2 py-1 bg-emerald-400/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-md border border-emerald-400/20">Verified</span>;
    if (type === "OTP_FAILED_ATTEMPT") return <span className="px-2 py-1 bg-amber-400/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider rounded-md border border-amber-400/20">Failed Attempt</span>;
    if (type === "OTP_LOCKOUT") return <span className="px-2 py-1 bg-red-400/10 text-red-400 text-[10px] font-bold uppercase tracking-wider rounded-md border border-red-400/20">Lockout</span>;
    if (type === "OTP_SENT") return <span className="px-2 py-1 bg-blue-400/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded-md border border-blue-400/20">OTP Sent</span>;
    
    if (category) {
       return <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-[10px] font-bold uppercase tracking-wider rounded-md border border-white/10">{category}</span>;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-white/10 border-t-[#635BFF] rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 font-medium">
        Error loading dashboard: {error}
      </div>
    );
  }

  const renderTable = (items: any[], isSecurity = false) => (
    <div className="bg-[#141419] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-white/40">Timestamp</th>
              <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-white/40">Event Type</th>
              <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-white/40">Target Email</th>
              <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-white/40">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-white/30 text-sm font-medium">
                  No events recorded yet.
                </td>
              </tr>
            ) : (
              items.map((evt, idx) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  key={evt.id} 
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="text-sm text-white/80 font-medium">
                      {format(new Date(evt.created_at), "MMM d, yyyy")}
                    </div>
                    <div className="text-xs text-white/40">
                      {format(new Date(evt.created_at), "HH:mm:ss a")}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                        {getEventIcon(isSecurity ? evt.event_type : evt.log_type, evt.category)}
                      </div>
                      <div className="flex flex-col gap-1 items-start">
                        {getEventBadge(isSecurity ? evt.event_type : evt.log_type, evt.category)}
                        {!isSecurity && <span className="text-xs text-white/70">{evt.message}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-white font-medium">{evt.email || evt.user_email || "System/Anon"}</div>
                  </td>
                  <td className="py-4 px-6">
                    {evt.metadata && Object.keys(evt.metadata).length > 0 ? (
                      <div className="text-[10px] font-mono bg-black/40 text-white/70 p-2 rounded-lg border border-white/5 inline-block max-w-xs overflow-auto">
                        <pre>{JSON.stringify(evt.metadata, null, 2)}</pre>
                      </div>
                    ) : (
                      <span className="text-xs text-white/30 italic">No metadata</span>
                    )}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-black text-white">System Telemetry</h2>
        <p className="text-sm text-white/50 mt-1">Real-time audit, activity, and error logging.</p>
      </div>

      <div className="flex items-center gap-2 border-b border-white/10 pb-4">
        <button 
          onClick={() => setActiveTab("activity")}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === "activity" ? "bg-[#635BFF] text-white" : "text-white/50 hover:bg-white/5 hover:text-white"}`}
        >
          Activity Logs
        </button>
        <button 
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === "security" ? "bg-[#635BFF] text-white" : "text-white/50 hover:bg-white/5 hover:text-white"}`}
        >
          Security Events
        </button>
        <button 
          onClick={() => setActiveTab("errors")}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === "errors" ? "bg-rose-500 text-white" : "text-white/50 hover:bg-rose-500/10 hover:text-rose-400"}`}
        >
          Error Logs
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "activity" && (
          <motion.div key="activity" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            {renderTable(activityLogs, false)}
          </motion.div>
        )}
        {activeTab === "security" && (
          <motion.div key="security" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            {renderTable(securityEvents, true)}
          </motion.div>
        )}
        {activeTab === "errors" && (
          <motion.div key="errors" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            {renderTable(errorLogs, false)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
