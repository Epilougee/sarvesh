export const dynamic = "force-dynamic";

import { getAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { MasterRecordsClient } from "../subjects/MasterRecordsClient";

export default async function RoomsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/my-timetable");

  const supabase = getAdminClient();
  const [{ data: rooms }, { data: settingData }] = await Promise.all([
    supabase.from("rooms").select("*").order("name"),
    supabase.from("settings").select("value").eq("key", "institution_type").single(),
  ]);

  const institutionType = (settingData?.value as "college" | "school") || "college";

  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      <Sidebar user={session} institutionType={institutionType} />
      <div className="ml-[240px] flex-1 flex flex-col min-w-0">
        <Topbar title="Rooms & Laboratories" institutionType={institutionType} />
        <main className="p-7">
          <MasterRecordsClient
            entityType="room"
            initialItems={rooms || []}
            title="Rooms & Labs"
            singularTitle="Room"
          />
        </main>
      </div>
    </div>
  );
}

