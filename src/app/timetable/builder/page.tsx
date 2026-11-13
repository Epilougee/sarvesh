export const dynamic = "force-dynamic";

import { getAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { DAYS_OF_WEEK } from "@/lib/types";
import { TimetableBuilderClient } from "./TimetableBuilderClient";

export default async function TimetableBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ group_id?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/my-timetable");

  const supabase = getAdminClient();
  const params = await searchParams;

  // 1. Fetch institution type
  const { data: settingData } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "institution_type")
    .maybeSingle();
  const institutionType = (settingData?.value as "college" | "school") || "college";

  // 2. Fetch all groups
  const { data: groups } = await supabase.from("groups").select("*").order("name");
  const allGroups = groups || [];

  const selectedGroupId = params.group_id
    ? parseInt(params.group_id, 10)
    : allGroups[0]?.id || 0;

  // 3. Fetch timeslots, subjects, faculty, rooms
  const [{ data: timeslots }, { data: subjects }, { data: facultyRaw }, { data: rooms }] =
    await Promise.all([
      supabase.from("timeslots").select("*").order("start_time"),
      supabase.from("subjects").select("*").order("name"),
      supabase
        .from("faculty")
        .select("id, department, designation, users:user_id (name)")
        .order("id"),
      supabase.from("rooms").select("*").order("name"),
    ]);

  const allFaculty = (facultyRaw || []).map((f: any) => ({
    id: f.id,
    name: f.users?.name || "Faculty",
    department: f.department,
    designation: f.designation,
  }));

  // 4. Fetch existing schedule for selected group
  let timetableEntries: any[] = [];
  if (selectedGroupId) {
    const { data: entries } = await supabase
      .from("timetable")
      .select(
        `
        id,
        group_id,
        subject_id,
        faculty_id,
        room_id,
        day,
        timeslot_id,
        subjects:subject_id (name, code),
        faculty:faculty_id (users:user_id (name)),
        rooms:room_id (name)
      `
      )
      .eq("group_id", selectedGroupId);
    timetableEntries = entries || [];
  }

  // Format into matrix: [day][timeslot_id]
  const matrix: Record<string, Record<number, any>> = {};
  for (const day of DAYS_OF_WEEK) {
    matrix[day] = {};
  }
  for (const item of timetableEntries) {
    if (matrix[item.day]) {
      matrix[item.day][item.timeslot_id] = {
        id: item.id,
        subject_name: item.subjects?.name,
        subject_code: item.subjects?.code,
        faculty_name: item.faculty?.users?.name,
        room_name: item.rooms?.name,
      };
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      <Sidebar user={session} institutionType={institutionType} />

      <div className="ml-[240px] flex-1 flex flex-col min-w-0">
        <Topbar title="Timetable Builder" institutionType={institutionType} />

        <main className="p-7">
          <TimetableBuilderClient
            institutionType={institutionType}
            allGroups={allGroups}
            selectedGroupId={selectedGroupId}
            timeslots={timeslots || []}
            allSubjects={subjects || []}
            allFaculty={allFaculty}
            allRooms={rooms || []}
            matrix={matrix}
          />
        </main>
      </div>
    </div>
  );
}

