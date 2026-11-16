"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, CheckCircle2, Clock, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { FacultyAttendance } from "@/lib/types";

interface MyAttendanceClientProps {
  facultyId: number;
  facultyName: string;
}

export function MyAttendanceClient({ facultyId, facultyName }: MyAttendanceClientProps) {
  const [history, setHistory] = useState<FacultyAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/attendance?faculty_id=${facultyId}`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history || []);
        }
      } catch (err) {
        console.error("Failed to load personal attendance:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [facultyId]);

  const total = history.length;
  const presentCount = history.filter((h) => h.status === "present").length;
  const lateCount = history.filter((h) => h.status === "late").length;
  const leaveCount = history.filter((h) => h.status === "on_leave").length;
  const absentCount = history.filter((h) => h.status === "absent").length;
  const rate = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium text-[var(--text-muted)]">Attendance Rate</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{rate}%</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Overall Punctuality</div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-emerald-200/60 rounded-xl p-5 shadow-xs">
          <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Present Days</span>
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">{presentCount}</div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-amber-200/60 rounded-xl p-5 shadow-xs">
          <div className="text-xs font-semibold text-amber-700 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Late Arrivals</span>
          </div>
          <div className="text-2xl font-bold text-amber-800 mt-1">{lateCount}</div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-indigo-200/60 rounded-xl p-5 shadow-xs">
          <div className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Approved Leaves</span>
          </div>
          <div className="text-2xl font-bold text-indigo-800 mt-1">{leaveCount}</div>
        </div>
      </div>

      {/* History Log Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-[var(--text-main)]">
              Personal Attendance Record — {facultyName}
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[var(--text-muted)] text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading records...</span>
          </div>
        ) : history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--brand-badge-bg)] border-b border-[var(--border-subtle)] text-[var(--text-muted)] uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Check-in Time</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {history.map((h, i) => (
                  <tr key={i} className="hover:bg-[var(--brand-badge-bg)]/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-[var(--text-main)]">{h.date}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                          h.status === "present"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : h.status === "late"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : h.status === "on_leave"
                            ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                            : "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {h.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--text-main)] font-mono">
                      {h.check_in_time || "—"}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-muted)]">{h.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-[var(--text-muted)] text-xs">
            No past attendance entries recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
