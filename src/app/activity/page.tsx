import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TimelineView } from "@/components/TimelineView";

export default async function ActivityPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6" style={{ borderColor: "var(--border)" }}>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
            Activity & Ledger
          </h1>
          <p className="text-xs sm:text-sm font-medium mt-1" style={{ color: "var(--muted-foreground)" }}>
            Real-time chronological log of transactions, transfers, and savings allocations across all accounts.
          </p>
        </div>
      </header>
      <TimelineView />
    </div>
  );
}
