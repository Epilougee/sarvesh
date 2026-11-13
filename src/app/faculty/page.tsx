export const dynamic = "force-dynamic";

import { getAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { FacultyClient } from "./FacultyClient";

export default async function FacultyPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/my-timetable");

  const supabase = getAdminClient();
  const [{ data: facultyRaw }, { data: subjects }, { data: settingData }] = await Promise.all([
    supabase
      .from("faculty")
      .select("id, department, designation, phone, users:user_id (id, name, email)")
      .order("id"),
    supabase.from("subjects").select("*").order("name"),
    supabase.from("settings").select("value").eq("key", "institution_type").maybeSingle(),
  ]);

  const institutionType = (settingData?.value as "college" | "school") || "college";

  const facultyList = (facultyRaw || []).map((f: any) => ({
    id: f.id,
    user_id: f.users?.id,
    name: f.users?.name || "Unknown",
    email: f.users?.email || "",
    department: f.department,
    designation: f.designation,
    phone: f.phone,
  }));

  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      <Sidebar user={session} institutionType={institutionType} />
      <div className="ml-[240px] flex-1 flex flex-col min-w-0">
        <Topbar title="Faculty Members" institutionType={institutionType} />
        <main className="p-7">
          <FacultyClient initialFaculty={facultyList} allSubjects={subjects || []} />
        </main>
      </div>
    </div>
  );
}

