"use client";

import { DAYS_OF_WEEK, formatTimeDisplay } from "@/lib/types";
import { Download, CalendarDays } from "lucide-react";
import { exportTimetableToPDF } from "@/lib/pdfExport";

interface MyTimetableGridProps {
  facultyName: string;
  department: string;
  timeslots: { id: number; label: string; start_time: string; end_time: string }[];
  matrix: Record<string, Record<number, any>>;
}

export function MyTimetableGrid({
  facultyName,
  department,
  timeslots,
  matrix,
}: MyTimetableGridProps) {
  const handleExportPDF = () => {
    exportTimetableToPDF({
      title: `${facultyName} - Teaching Schedule`,
      subtitle: `FACULTY PORTAL  |  Department: ${department}`,
      timeslots,
      matrix,
      filename: `${facultyName.replace(/[^a-zA-Z0-9_-]/g, "_")}_schedule.pdf`,
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-700">Personal Weekly Timetable</span>
        </div>

        <button
          onClick={handleExportPDF}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2F5D8A] text-white text-xs font-semibold hover:bg-[#244A70] transition-all shadow-sm cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download PDF</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
              <th className="py-3 px-4 w-[110px] border-r border-slate-200">Day</th>
              {(timeslots || []).map((ts) => (
                <th key={ts.id} className="py-3 px-3 text-center border-r border-slate-200 last:border-r-0">
                  <div className="font-bold text-slate-800">{ts.label}</div>
                  <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                    {formatTimeDisplay(ts.start_time)} - {formatTimeDisplay(ts.end_time)}
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
                        <div
                          className={`h-full rounded-md p-2 flex flex-col justify-between border ${
                            slot.subject_code === "BREAK" || slot.subject_name?.toLowerCase().includes("break")
                              ? "bg-amber-50 border-amber-200 text-amber-900"
                              : "bg-[#F8FAFC] border-slate-200"
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-slate-800 text-[11px] truncate">
                              {slot.subject_name}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono font-medium">
                              {slot.subject_code}
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-600 border-t border-slate-200/80 pt-1 mt-1 truncate">
                            {slot.subject_code === "BREAK" ? (
                              <div className="text-amber-800 font-medium">Recess / Break</div>
                            ) : (
                              <>
                                <div>{slot.group_name}</div>
                                <div className="text-slate-400 truncate">{slot.room_name}</div>
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
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
