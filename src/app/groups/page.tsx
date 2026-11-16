export const dynamic = "force-dynamic";

import { getAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { filterGroupsByMode } from "@/lib/modeFilter";
import { MasterRecordsClient } from "../subjects/MasterRecordsClient";

export default async function GroupsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/my-timetable");

  const supabase = getAdminClient();
  const [{ data: groupsRaw }, { data: settingData }] = await Promise.all([
    supabase.from("groups").select("*").order("name"),
    supabase.from("settings").select("value").eq("key", "institution_type").maybeSingle(),
  ]);

  const institutionType = (settingData?.value as "college" | "school") || "college";
  const title = institutionType === "school" ? "Classes & Sections" : "Cohorts & Divisions";
  const singular = institutionType === "school" ? "Class" : "Cohort";
  const filteredGroups = filterGroupsByMode(groupsRaw || [], institutionType);

  return (
    <div className="flex min-h-screen app-bg">
      <Sidebar user={session} institutionType={institutionType} />
      <div className="ml-[240px] flex-1 flex flex-col min-w-0">
        <Topbar title={title} institutionType={institutionType} />
        <main className="p-7">
          <MasterRecordsClient
            entityType="group"
            initialItems={filteredGroups}
            title={title}
            singularTitle={singular}
          />
        </main>
      </div>
    </div>
  );
}
