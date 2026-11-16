export const dynamic = "force-dynamic";

import { getAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { MyAttendanceClient } from "./MyAttendanceClient";

export default async function MyAttendancePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = getAdminClient();
  const { data: settingData } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "institution_type")
    .maybeSingle();

  const institutionType = (settingData?.value as "college" | "school") || "college";

  let facultyId: number = Number(session.faculty_id || 0);
  if (!facultyId) {
    const { data: fac } = await supabase
      .from("faculty")
      .select("id")
      .eq("user_id", session.id)
      .maybeSingle();
    facultyId = Number(fac?.id || 0);
  }

  return (
    <div className="flex min-h-screen app-bg">
      <Sidebar user={session} institutionType={institutionType} />

      <div className="ml-[240px] flex-1 flex flex-col min-w-0">
        <Topbar title="My Attendance" institutionType={institutionType} />

        <main className="p-8">
          <MyAttendanceClient facultyId={facultyId} facultyName={session.name} />
        </main>
      </div>
    </div>
  );
}
