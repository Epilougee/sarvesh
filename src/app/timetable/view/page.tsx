export const dynamic = "force-dynamic";

import { getAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { DAYS_OF_WEEK } from "@/lib/types";
import { TimetableViewClient } from "./TimetableViewClient";

export default async function TimetableViewPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; id?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = getAdminClient();
  const params = await searchParams;

  const viewType = (params.view || "group") as "group" | "faculty" | "room";

  // Fetch institution type
  const { data: settingData } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "institution_type")
    .maybeSingle();
  const institutionType = (settingData?.value as "college" | "school") || "college";

  // Fetch groups, faculty, rooms, timeslots
  const [{ data: groups }, { data: facultyRaw }, { data: rooms }, { data: timeslots }] =
    await Promise.all([
      supabase.from("groups").select("*").order("name"),
      supabase.from("faculty").select("id, department, designation, users:user_id (name)").order("id"),
      supabase.from("rooms").select("*").order("name"),
      supabase.from("timeslots").select("*").order("start_time"),
    ]);

  const allFaculty = (facultyRaw || []).map((f: any) => ({
    id: f.id,
    name: f.users?.name || "Faculty",
    department: f.department,
  }));

  let targetId = params.id ? parseInt(params.id, 10) : 0;
  if (!targetId) {
    if (viewType === "group" && groups && groups.length > 0) targetId = groups[0].id;
    if (viewType === "faculty" && allFaculty.length > 0) targetId = allFaculty[0].id;
    if (viewType === "room" && rooms && rooms.length > 0) targetId = rooms[0].id;
  }

  // Fetch schedule
  let query = supabase.from("timetable").select(
    `
      id,
      group_id,
      subject_id,
      faculty_id,
      room_id,
      day,
      timeslot_id,
      groups:group_id (name),
      subjects:subject_id (name, code),
      faculty:faculty_id (users:user_id (name)),
      rooms:room_id (name)
    `
  );

  if (viewType === "group") query = query.eq("group_id", targetId);
  if (viewType === "faculty") query = query.eq("faculty_id", targetId);
  if (viewType === "room") query = query.eq("room_id", targetId);

  const { data: entries } = await query;

  const matrix: Record<string, Record<number, any>> = {};
  for (const day of DAYS_OF_WEEK) {
    matrix[day] = {};
  }
  for (const item of (entries || []) as any[]) {
    if (matrix[item.day]) {
      const gName = Array.isArray(item.groups) ? item.groups[0]?.name : item.groups?.name;
      const sName = Array.isArray(item.subjects) ? item.subjects[0]?.name : item.subjects?.name;
      const sCode = Array.isArray(item.subjects) ? item.subjects[0]?.code : item.subjects?.code;
      const fItem = Array.isArray(item.faculty) ? item.faculty[0] : item.faculty;
      const uName = Array.isArray(fItem?.users) ? fItem?.users[0]?.name : fItem?.users?.name;
      const rName = Array.isArray(item.rooms) ? item.rooms[0]?.name : item.rooms?.name;

      matrix[item.day][item.timeslot_id] = {
        id: item.id,
        group_name: gName,
        subject_name: sName,
        subject_code: sCode,
        faculty_name: uName,
        room_name: rName,
      };
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      <Sidebar user={session} institutionType={institutionType} />

      <div className="ml-[240px] flex-1 flex flex-col min-w-0">
        <Topbar title="Institution Timetables" institutionType={institutionType} />

        <main className="p-7">
          <TimetableViewClient
            institutionType={institutionType}
            viewType={viewType}
            targetId={targetId}
            groups={groups || []}
            faculty={allFaculty}
            rooms={rooms || []}
            timeslots={timeslots || []}
            matrix={matrix}
          />
        </main>
      </div>
    </div>
  );
}
