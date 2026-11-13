"use client";

import { useRouter } from "next/navigation";
import { DAYS_OF_WEEK, Group, Room, Timeslot } from "@/lib/types";
import { Users, UserCheck, DoorOpen, Printer } from "lucide-react";

interface TimetableViewClientProps {
  institutionType: "college" | "school";
  viewType: "group" | "faculty" | "room";
  targetId: number;
  groups: Group[];
  faculty: { id: number; name: string; department: string }[];
  rooms: Room[];
  timeslots: Timeslot[];
  matrix: Record<string, Record<number, any>>;
}

export function TimetableViewClient({
  institutionType,
  viewType,
  targetId,
  groups,
  faculty,
  rooms,
  timeslots,
  matrix,
}: TimetableViewClientProps) {
  const router = useRouter();

  const handleTabChange = (newView: string) => {
    let defaultId = 0;
    if (newView === "group" && groups.length > 0) defaultId = groups[0].id;
    if (newView === "faculty" && faculty.length > 0) defaultId = faculty[0].id;
    if (newView === "room" && rooms.length > 0) defaultId = rooms[0].id;
    router.push(`/timetable/view?view=${newView}&id=${defaultId}`);
  };

  const handleEntityChange = (newId: string) => {
    router.push(`/timetable/view?view=${viewType}&id=${newId}`);
  };

  const groupLabel = institutionType === "school" ? "Class" : "Cohort";

  return (
    <div className="space-y-6">
      {/* View Switcher and Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => handleTabChange("group")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewType === "group"
                ? "bg-white text-[#2F5D8A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>By {groupLabel}</span>
          </button>
          <button
            onClick={() => handleTabChange("faculty")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewType === "faculty"
                ? "bg-white text-[#2F5D8A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>By Faculty</span>
          </button>
          <button
            onClick={() => handleTabChange("room")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewType === "room"
                ? "bg-white text-[#2F5D8A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5" />
            <span>By Room / Lab</span>
          </button>
        </div>

        {/* Dropdown Selector */}
        <div className="flex items-center gap-3">
          <select
            value={targetId}
            onChange={(e) => handleEntityChange(e.target.value)}
            className="text-xs border border-slate-300 rounded-md py-1.5 px-3 bg-white focus:outline-none focus:border-[#2F5D8A] text-slate-800 font-medium"
          >
            {viewType === "group" &&
              groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            {viewType === "faculty" &&
              faculty.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.department})
                </option>
              ))}
            {viewType === "room" &&
              rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (Cap: {r.capacity})
                </option>
              ))}
          </select>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print View</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4 w-[110px] border-r border-slate-200">Day</th>
                {timeslots.map((ts) => (
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
                  {timeslots.map((ts) => {
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
                              {viewType === "group" && (
                                <div>
                                  {slot.faculty_name} • {slot.room_name}
                                </div>
                              )}
                              {viewType === "faculty" && (
                                <div>
                                  {slot.group_name} • {slot.room_name}
                                </div>
                              )}
                              {viewType === "room" && (
                                <div>
                                  {slot.group_name} • {slot.faculty_name}
                                </div>
                              )}
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
    </div>
  );
}
