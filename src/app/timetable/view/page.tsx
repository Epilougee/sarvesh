export const dynamic = "force-dynamic";

import { getAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { DAYS_OF_WEEK, sortTimeslots } from "@/lib/types";
import { filterGroupsByMode } from "@/lib/modeFilter";
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
  const [{ data: groupsRaw }, { data: facultyRaw }, { data: rooms }, { data: timeslotsRaw }] =
    await Promise.all([
      supabase.from("groups").select("*").order("name"),
      supabase.from("faculty").select("id, department, designation, users:user_id (name)").order("id"),
      supabase.from("rooms").select("*").order("name"),
      supabase.from("timeslots").select("*").order("id"),
    ]);

  const groups = filterGroupsByMode(groupsRaw || [], institutionType);
  const timeslots = sortTimeslots(timeslotsRaw || []);

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

  if (viewType === "group" && targetId) query = query.eq("group_id", targetId);
  if (viewType === "faculty" && targetId) query = query.eq("faculty_id", targetId);
  if (viewType === "room" && targetId) query = query.eq("room_id", targetId);

  const { data: timetableEntries } = await query;

  // Format into matrix: [day][timeslot_id]
  const matrix: Record<string, Record<number, any>> = {};
  for (const day of DAYS_OF_WEEK) {
    matrix[day] = {};
  }
  const getObj = (x: any) => (Array.isArray(x) ? x[0] : x);

  for (const item of (timetableEntries as any[]) || []) {
    if (matrix[item.day]) {
      const grp = getObj(item.groups);
      const sub = getObj(item.subjects);
      const fac = getObj(item.faculty);
      const uObj = getObj(fac?.users);
      const rm = getObj(item.rooms);

      matrix[item.day][item.timeslot_id] = {
        id: item.id,
        group_name: grp?.name,
        subject_name: sub?.name,
        subject_code: sub?.code,
        faculty_name: uObj?.name,
        room_name: rm?.name,
      };
    }
  }

  return (
    <div className="flex min-h-screen app-bg">
      <Sidebar user={session} institutionType={institutionType} />

      <div className="ml-[240px] flex-1 flex flex-col min-w-0">
        <Topbar title="Weekly Timetables" institutionType={institutionType} />

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
