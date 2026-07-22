import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/adminAuth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authCheck = await requireAdmin();

  if (!authCheck.authorized) {
    // Hard rejection at the layout level
    redirect("/login?error=unauthorized_admin");
  }

  return (
    <div className="min-h-screen bg-[#0E0E11] text-white selection:bg-[#635BFF]/30">
      <div className="border-b border-white/5 bg-[#141419]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <span className="text-red-500 font-black text-sm">A</span>
            </div>
            <h1 className="text-sm font-bold tracking-widest uppercase text-white/90">
              Ops Dashboard
            </h1>
          </div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20">
            Admin: {authCheck.userEmail}
          </div>
        </div>
      </div>
      <main className="max-w-6xl mx-auto p-6">{children}</main>
    </div>
  );
}
