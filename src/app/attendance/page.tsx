export const dynamic = "force-dynamic";

import { getAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { AttendanceClient } from "./AttendanceClient";

export default async function AttendancePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/my-attendance");

  const supabase = getAdminClient();
  const { data: settingData } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "institution_type")
    .maybeSingle();

  const institutionType = (settingData?.value as "college" | "school") || "college";
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex min-h-screen app-bg">
      <Sidebar user={session} institutionType={institutionType} />

      <div className="ml-[240px] flex-1 flex flex-col min-w-0">
        <Topbar title="Faculty Attendance" institutionType={institutionType} />

        <main className="p-8">
          <AttendanceClient initialDate={today} />
        </main>
      </div>
    </div>
  );
}
