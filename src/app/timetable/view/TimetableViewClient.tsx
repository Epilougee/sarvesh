"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { DAYS_OF_WEEK, Group, Room, Timeslot, formatTimeDisplay } from "@/lib/types";
import { Users, UserCheck, DoorOpen, Download, Printer, Coffee, FileSpreadsheet } from "lucide-react";
import { exportTimetableToPDF } from "@/lib/pdfExport";
import * as XLSX from "xlsx";

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
  const [showLunchColumn, setShowLunchColumn] = useState(true);

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

  // Find active entity label
  let activeName = "";
  if (viewType === "group") {
    activeName = groups.find((g) => g.id === targetId)?.name || "Cohort";
  } else if (viewType === "faculty") {
    activeName = faculty.find((f) => f.id === targetId)?.name || "Faculty";
  } else if (viewType === "room") {
    activeName = rooms.find((r) => r.id === targetId)?.name || "Room";
  }

  const handleExportPDF = () => {
    exportTimetableToPDF({
      title: `${activeName} - Weekly Timetable`,
      subtitle: `${institutionType.toUpperCase()} SCHEDULE  |  View: By ${viewType.toUpperCase()}`,
      timeslots,
      matrix,
      filename: `${activeName.replace(/[^a-zA-Z0-9_-]/g, "_")}_timetable.pdf`,
    });
  };

  const handleExportExcel = () => {
    const wsData: any[][] = [];
    const header = [
      "Day",
      ...timeslots.map((ts) => `${ts.label} (${ts.start_time} - ${ts.end_time})`),
    ];
    wsData.push(header);

    for (const d of DAYS_OF_WEEK) {
      const row: string[] = [d];
      for (const ts of timeslots) {
        const slot = matrix[d]?.[ts.id];
        if (slot) {
          const detail =
            viewType === "group"
              ? `${slot.faculty_name || ""} • ${slot.room_name || ""}`
              : viewType === "faculty"
              ? `${slot.group_name || ""} • ${slot.room_name || ""}`
              : `${slot.group_name || ""} • ${slot.faculty_name || ""}`;
          row.push(`${slot.subject_name} (${slot.subject_code})\n${detail}`);
        } else {
          row.push("—");
        }
      }
      wsData.push(row);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Timetable");
    XLSX.writeFile(wb, `${activeName.replace(/[^a-zA-Z0-9_-]/g, "_")}_timetable.xlsx`);
  };

  const isBreakSlot = (slot: any) => {
    return (
      slot?.subject_code === "BREAK" ||
      slot?.subject_name?.toLowerCase().includes("break") ||
      slot?.subject_name?.toLowerCase().includes("recess")
    );
  };

  return (
    <div className="space-y-6">
      {/* View Switcher and Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
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

        {/* Dropdown Selector & Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
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

          {/* Lunch Break Toggle */}
          <button
            type="button"
            onClick={() => setShowLunchColumn(!showLunchColumn)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
              showLunchColumn
                ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            <Coffee className="w-3.5 h-3.5 text-amber-600" />
            <span>Lunch: {showLunchColumn ? "ON" : "OFF"}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#2F5D8A] text-white text-xs font-semibold hover:bg-[#244A70] transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs min-w-[960px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4 w-[110px] border-r border-slate-200 bg-slate-100/70">
                  Day
                </th>
                {timeslots.map((ts, idx) => {
                  const isPostPeriod4 = idx === 4;
                  return (
                    <React.Fragment key={ts.id}>
                      {isPostPeriod4 && showLunchColumn && (
                        <th className="py-2.5 px-2 text-center border-r border-amber-200/90 bg-amber-50/90 text-amber-900 w-[70px]">
                          <div className="font-bold flex items-center justify-center gap-1 text-[10px]">
                            <Coffee className="w-3 h-3 text-amber-700" />
                            <span>LUNCH</span>
                          </div>
                          <div className="text-[9px] font-normal text-amber-700 mt-0.5">
                            12:35 - 1:25
                          </div>
                        </th>
                      )}
                      <th className="py-3 px-3 text-center border-r border-slate-200 last:border-r-0 min-w-[135px]">
                        <div className="font-bold text-slate-800">{ts.label}</div>
                        <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                          {formatTimeDisplay(ts.start_time)} - {formatTimeDisplay(ts.end_time)}
                        </div>
                      </th>
                    </React.Fragment>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {DAYS_OF_WEEK.map((day) => (
                <tr key={day} className="hover:bg-slate-50/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800 bg-slate-50/60 border-r border-slate-200 align-middle">
                    {day}
                  </td>
                  {timeslots.map((ts, idx) => {
                    const isPostPeriod4 = idx === 4;
                    const slot = matrix[day]?.[ts.id];
                    const isBreak = slot && isBreakSlot(slot);

                    return (
                      <React.Fragment key={ts.id}>
                        {isPostPeriod4 && showLunchColumn && (
                          <td className="p-1 border-r border-amber-200/80 bg-amber-50/40 text-center align-middle">
                            <div className="h-full py-6 flex flex-col items-center justify-center text-amber-700/80 text-[10px] font-medium tracking-widest select-none">
                              <span className="[writing-mode:vertical-lr] rotate-180 uppercase text-[9px] tracking-wider text-amber-800 font-semibold">
                                RECESS
                              </span>
                            </div>
                          </td>
                        )}
                        <td
                          className="p-2 border-r border-slate-200 last:border-r-0 align-top h-[95px] w-[145px]"
                        >
                          {slot ? (
                            <div
                              className={`h-full rounded-lg p-2.5 flex flex-col justify-between border shadow-2xs ${
                                isBreak
                                  ? "bg-amber-50 border-amber-200 text-amber-900"
                                  : "bg-[#F8FAFC] border-slate-200 text-slate-800"
                              }`}
                            >
                              <div>
                                <div className="font-bold text-slate-800 text-[11px] truncate">
                                  {slot.subject_name}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono font-medium mt-0.5">
                                  {isBreak ? (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                                      BREAK
                                    </span>
                                  ) : (
                                    <span>{slot.subject_code}</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-[10px] text-slate-600 border-t border-slate-200/70 pt-1 mt-1 truncate">
                                {isBreak ? (
                                  <div className="text-amber-800 font-medium flex items-center gap-1">
                                    <Coffee className="w-3 h-3 text-amber-600" />
                                    <span>Recess Interval</span>
                                  </div>
                                ) : (
                                  <>
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
                                  </>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center text-slate-300 text-[10px]">
                              —
                            </div>
                          )}
                        </td>
                      </React.Fragment>
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
