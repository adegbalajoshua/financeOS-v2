import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/DashboardView";

export default async function Home() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <DashboardView />
    </div>
  );
}
