export const dynamic = "force-dynamic";

import { getAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { DAYS_OF_WEEK } from "@/lib/types";
import { BookOpenCheck, Clock, CalendarDays, Printer } from "lucide-react";

export default async function MyTimetablePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = getAdminClient();

  // 1. Fetch institution type
  const { data: settingData } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "institution_type")
    .single();
  const institutionType = (settingData?.value as "college" | "school") || "college";

  // 2. Resolve faculty ID for current user
  let facultyId = session.faculty_id;
  if (!facultyId) {
    const { data: fac } = await supabase
      .from("faculty")
      .select("id")
      .eq("user_id", session.id)
      .single();
    facultyId = fac?.id || null;
  }

  if (!facultyId) {
    // Admin viewing faculty portal without linked profile
    return (
      <div className="flex min-h-screen bg-[#F5F7FA]">
        <Sidebar user={session} institutionType={institutionType} />
        <div className="ml-[240px] flex-1 p-7">
          <Topbar title="My Timetable" institutionType={institutionType} />
          <div className="mt-8 bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500">
            No faculty profile linked to your user account ({session.email}).
          </div>
        </div>
      </div>
    );
  }

  // 3. Fetch faculty profile details & qualifications
  const { data: facultyProfile } = await supabase
    .from("faculty")
    .select(
      `
      id,
      department,
      designation,
      phone,
      users:user_id (name, email)
    `
    )
    .eq("id", facultyId)
    .single();

  // 4. Fetch timeslots
  const { data: timeslots } = await supabase.from("timeslots").select("*").order("start_time");

  // 5. Fetch allocated classes for this faculty
  const { data: schedule } = await supabase
    .from("timetable")
    .select(
      `
      id,
      day,
      timeslot_id,
      groups:group_id (name),
      subjects:subject_id (name, code),
      rooms:room_id (name)
    `
    )
    .eq("faculty_id", facultyId);

  const matrix: Record<string, Record<number, any>> = {};
  for (const day of DAYS_OF_WEEK) {
    matrix[day] = {};
  }
  let totalPeriods = 0;
  for (const item of (schedule || []) as any[]) {
    if (matrix[item.day]) {
      matrix[item.day][item.timeslot_id] = {
        id: item.id,
        group_name: Array.isArray(item.groups) ? item.groups[0]?.name : item.groups?.name,
        subject_name: Array.isArray(item.subjects) ? item.subjects[0]?.name : item.subjects?.name,
        subject_code: Array.isArray(item.subjects) ? item.subjects[0]?.code : item.subjects?.code,
        room_name: Array.isArray(item.rooms) ? item.rooms[0]?.name : item.rooms?.name,
      };
      totalPeriods++;
    }
  }

  const fData = facultyProfile as any;

  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      <Sidebar user={session} institutionType={institutionType} />

      <div className="ml-[240px] flex-1 flex flex-col min-w-0">
        <Topbar title="My Teaching Schedule" institutionType={institutionType} />

        <main className="p-7 space-y-6">
          {/* Workload / Profile Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Profile Info */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#E8F0FA] text-[#2F5D8A] flex items-center justify-center font-bold text-lg">
                {fData?.users?.name ? fData.users.name[0] : "F"}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 text-sm truncate">{fData?.users?.name}</div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">{fData?.department}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{fData?.designation}</div>
              </div>
            </div>

            {/* Total Workload */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#FDF0E3] text-[#D9822B] flex items-center justify-center">
                <BookOpenCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{totalPeriods}</div>
                <div className="text-xs text-slate-500 font-medium">Total Periods / Week</div>
              </div>
            </div>

            {/* Average Load */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#E6F5EE] text-[#3A9D6E] flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">
                  {(totalPeriods / 6.0).toFixed(1)}
                </div>
                <div className="text-xs text-slate-500 font-medium">Avg Periods / Day</div>
              </div>
            </div>
          </div>

          {/* Schedule Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700">Personal Weekly Timetable</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4 w-[110px] border-r border-slate-200">Day</th>
                    {(timeslots || []).map((ts) => (
                      <th key={ts.id} className="py-3 px-3 text-center border-r border-slate-200 last:border-r-0">
                        <div>{ts.label}</div>
                        <div className="text-[10px] font-normal text-slate-400">
                          {ts.start_time} - {ts.end_time}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {DAYS_OF_WEEK.map((day) => (
                    <tr key={day} className="hover:bg-slate-50/40">
                      <td className="py-3 px-4 font-semibold text-slate-800 bg-slate-50/60 border-r border-slate-200">
                        {day}
                      </td>
                      {(timeslots || []).map((ts) => {
                        const slot = matrix[day]?.[ts.id];
                        return (
                          <td
                            key={ts.id}
                            className="p-2 border-r border-slate-200 last:border-r-0 align-top h-[85px] w-[140px]"
                          >
                            {slot ? (
                              <div className="h-full rounded-md border border-slate-200 bg-[#F8FAFC] p-2 flex flex-col justify-between">
                                <div>
                                  <div className="font-semibold text-slate-800 text-[11px] truncate">
                                    {slot.subject_name}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono font-medium">
                                    {slot.subject_code}
                                  </div>
                                </div>
                                <div className="text-[10px] text-slate-600 border-t border-slate-200/80 pt-1 mt-1 truncate">
                                  <div>{slot.group_name}</div>
                                  <div className="text-slate-400 truncate">{slot.room_name}</div>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-slate-300 text-[10px]">
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
