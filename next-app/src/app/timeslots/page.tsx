export const dynamic = "force-dynamic";

import { getAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { MasterRecordsClient } from "../subjects/MasterRecordsClient";

export default async function TimeslotsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/my-timetable");

  const supabase = getAdminClient();
  const [{ data: timeslots }, { data: settingData }] = await Promise.all([
    supabase.from("timeslots").select("*").order("start_time"),
    supabase.from("settings").select("value").eq("key", "institution_type").single(),
  ]);

  const institutionType = (settingData?.value as "college" | "school") || "college";

  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      <Sidebar user={session} institutionType={institutionType} />
      <div className="ml-[240px] flex-1 flex flex-col min-w-0">
        <Topbar title="Periods & Timeslots" institutionType={institutionType} />
        <main className="p-7">
          <MasterRecordsClient
            entityType="timeslot"
            initialItems={timeslots || []}
            title="Periods & Timeslots"
            singularTitle="Timeslot"
          />
        </main>
      </div>
    </div>
  );
}
