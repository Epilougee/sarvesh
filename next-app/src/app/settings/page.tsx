export const dynamic = "force-dynamic";

import { getAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/my-timetable");

  const supabase = getAdminClient();
  const { data: settingData } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "institution_type")
    .single();

  const currentType = (settingData?.value as "college" | "school") || "college";

  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      <Sidebar user={session} institutionType={currentType} />

      <div className="ml-[240px] flex-1 flex flex-col min-w-0">
        <Topbar title="System Settings" institutionType={currentType} />

        <main className="p-7">
          <SettingsClient initialType={currentType} />
        </main>
      </div>
    </div>
  );
}

