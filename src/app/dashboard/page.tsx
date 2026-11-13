export const dynamic = "force-dynamic";

import { getAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { StatCard } from "@/components/StatCard";
import Link from "next/link";
import {
  UserCheck,
  BookOpen,
  Users,
  DoorOpen,
  CalendarDays,
  Plus,
  TableCellsSplit,
  MapPin,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/my-timetable");

  const supabase = getAdminClient();

  // Fetch counts
  const [{ count: facultyCount }, { count: subjectCount }, { count: groupCount }, { count: roomCount }] =
    await Promise.all([
      supabase.from("faculty").select("*", { count: "exact", head: true }),
      supabase.from("subjects").select("*", { count: "exact", head: true }),
      supabase.from("groups").select("*", { count: "exact", head: true }),
      supabase.from("rooms").select("*", { count: "exact", head: true }),
    ]);

  // Fetch settings
  const { data: settingData } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "institution_type")
    .single();
  const institutionType = (settingData?.value as "college" | "school") || "college";

  // Today's classes
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const now = new Date();
  let dayName = days[now.getDay()];
  const isSunday = dayName === "Sunday";
  if (isSunday) dayName = "Monday";

  const { data: todayClasses } = await supabase
    .from("timetable")
    .select(
      `
      id,
      day,
      timeslot_id,
      groups:group_id (name),
      subjects:subject_id (name, code),
      faculty:faculty_id (users:user_id (name)),
      rooms:room_id (name),
      timeslots:timeslot_id (label, start_time, end_time)
    `
    )
    .eq("day", dayName);

  const sortedClasses = (todayClasses || []).sort((a: any, b: any) =>
    (a.timeslots?.start_time || "").localeCompare(b.timeslots?.start_time || "")
  );

  const PERIOD_COLORS = ["#2F5D8A", "#3A9D6E", "#D9822B", "#6B5BB5", "#0E7490", "#BE185D", "#4338CA"];

  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      <Sidebar user={session} institutionType={institutionType} />

      <div className="ml-[240px] flex-1 flex flex-col min-w-0">
        <Topbar title="Admin Overview" institutionType={institutionType}>
          <Link
            href="/timetable/builder"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#2F5D8A] text-white text-xs font-semibold hover:bg-[#244A70] transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Build Timetable</span>
          </Link>
        </Topbar>

        <main className="p-7">
          {/* 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-7">
            <StatCard
              label="Faculty Members"
              value={facultyCount ?? 0}
              icon={UserCheck}
              variant="faculty"
            />
            <StatCard
              label="Subjects"
              value={subjectCount ?? 0}
              icon={BookOpen}
              variant="subjects"
            />
            <StatCard
              label={institutionType === "school" ? "Classes / Sections" : "Cohorts / Divisions"}
              value={groupCount ?? 0}
              icon={Users}
              variant="cohorts"
            />
            <StatCard
              label="Rooms & Labs"
              value={roomCount ?? 0}
              icon={DoorOpen}
              variant="rooms"
            />
          </div>

          {/* Today's Schedule Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-slate-500" />
                  <span>Scheduled Classes for {dayName}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isSunday
                    ? "Sunday is non-instructional. Displaying Monday's classes for planning."
                    : "Overview of all lectures and laboratory sessions scheduled across departments today."}
                </p>
              </div>

              <Link
                href="/timetable/view"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all"
              >
                <TableCellsSplit className="w-3.5 h-3.5" />
                <span>Full Schedule</span>
              </Link>
            </div>

            {sortedClasses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <th className="py-3 px-4">Period / Time</th>
                      <th className="py-3 px-4">Cohort / Class</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Faculty</th>
                      <th className="py-3 px-4">Room / Lab</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedClasses.map((slot: any, idx: number) => {
                      const color = PERIOD_COLORS[(slot.timeslot_id || idx) % PERIOD_COLORS.length];
                      const ts = Array.isArray(slot.timeslots) ? slot.timeslots[0] : slot.timeslots;
                      const grp = Array.isArray(slot.groups) ? slot.groups[0] : slot.groups;
                      const sub = Array.isArray(slot.subjects) ? slot.subjects[0] : slot.subjects;
                      const fac = Array.isArray(slot.faculty) ? slot.faculty[0] : slot.faculty;
                      const uName = Array.isArray(fac?.users) ? fac?.users[0]?.name : fac?.users?.name;
                      const rm = Array.isArray(slot.rooms) ? slot.rooms[0] : slot.rooms;

                      return (
                        <tr key={slot.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 pl-6 relative">
                            {/* Colored period bar */}
                            <span
                              className="absolute left-2 top-2.5 bottom-2.5 w-1 rounded-full"
                              style={{ backgroundColor: color }}
                              aria-hidden="true"
                            />
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800">
                                {ts?.label || "Period"}
                              </span>
                              <span className="text-[11px] text-slate-400 mt-0.5">
                                {ts?.start_time} - {ts?.end_time}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EBF3FA] text-[#2F5D8A]">
                              {grp?.name}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-800">
                              {sub?.name}
                            </span>
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] font-semibold">
                              {sub?.code}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-700">
                            {uName}
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {rm?.name}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <CalendarDays className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <div className="text-sm font-semibold text-slate-700">No classes scheduled today</div>
                <p className="text-xs mt-1">Use the Timetable Builder to schedule periods.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
