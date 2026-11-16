"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  RefreshCw,
  Printer,
  Sparkles,
} from "lucide-react";
import { FacultyAttendance, AttendanceStatus } from "@/lib/types";

interface AttendanceClientProps {
  initialDate: string;
}

export function AttendanceClient({ initialDate }: AttendanceClientProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [records, setRecords] = useState<FacultyAttendance[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    present: 0,
    absent: 0,
    on_leave: 0,
    late: 0,
    percentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchAttendance = async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setSummary(data.summary || {});
      }
    } catch (err) {
      console.error("Error fetching attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance(selectedDate);
  }, [selectedDate]);

  const handleDateShift = (days: number) => {
    const curr = new Date(selectedDate);
    curr.setDate(curr.getDate() + days);
    const newDateStr = curr.toISOString().split("T")[0];
    setSelectedDate(newDateStr);
  };

  const handleUpdateStatus = async (
    facultyId: number,
    newStatus: AttendanceStatus,
    currentCheckIn?: string,
    currentRemarks?: string
  ) => {
    setSavingId(facultyId);

    // Optimistic UI update
    setRecords((prev) =>
      prev.map((r) =>
        r.faculty_id === facultyId
          ? {
              ...r,
              status: newStatus,
              check_in_time:
                newStatus === "absent" || newStatus === "on_leave"
                  ? undefined
                  : r.check_in_time || "08:50 AM",
            }
          : r
      )
    );

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faculty_id: facultyId,
          date: selectedDate,
          status: newStatus,
          check_in_time:
            newStatus === "absent" || newStatus === "on_leave"
              ? null
              : currentCheckIn || "08:50 AM",
          remarks: currentRemarks || "",
        }),
      });

      if (res.ok) {
        fetchAttendance(selectedDate);
      }
    } catch (err) {
      console.error("Failed to save attendance:", err);
    } finally {
      setSavingId(null);
    }
  };

  const handleMarkAllPresent = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_all_present",
          date: selectedDate,
        }),
      });

      if (res.ok) {
        setActionSuccess("All faculty marked present successfully!");
        setTimeout(() => setActionSuccess(null), 3000);
        await fetchAttendance(selectedDate);
      }
    } catch (err) {
      console.error("Error in bulk update:", err);
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const isToday = selectedDate === todayStr;

  return (
    <div className="space-y-6">
      {/* Date Navigation & Actions Header */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDateShift(-1)}
            className="p-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--brand-badge-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <Calendar className="w-4 h-4 text-blue-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold text-[var(--text-main)] bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => handleDateShift(1)}
            className="p-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--brand-badge-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isToday && (
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              Today
            </button>
          )}
        </div>

        {/* Quick Bulk Actions */}
        <div className="flex items-center gap-2">
          {actionSuccess && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {actionSuccess}
            </span>
          )}

          <button
            onClick={handleMarkAllPresent}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mark All Present</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-main)] hover:bg-[var(--brand-badge-bg)] transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Total Faculty
          </div>
          <div className="text-2xl font-bold text-[var(--text-main)] mt-1">
            {summary.total}
          </div>
        </div>

        <div className="bg-emerald-50/40 border border-emerald-200/60 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Present</span>
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">
            {summary.present}
          </div>
        </div>

        <div className="bg-amber-50/40 border border-amber-200/60 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Late</span>
          </div>
          <div className="text-2xl font-bold text-amber-800 mt-1">
            {summary.late}
          </div>
        </div>

        <div className="bg-indigo-50/40 border border-indigo-200/60 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>On Leave</span>
          </div>
          <div className="text-2xl font-bold text-indigo-800 mt-1">
            {summary.on_leave}
          </div>
        </div>

        <div className="bg-rose-50/40 border border-rose-200/60 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>Absent</span>
          </div>
          <div className="text-2xl font-bold text-rose-800 mt-1">
            {summary.absent}
          </div>
        </div>
      </div>

      {/* Main Faculty Attendance Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-[var(--text-main)]">
              Daily Attendance Roster
            </h3>
          </div>
          <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Attendance Rate: {summary.percentage}%
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[var(--text-muted)] text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading attendance records...</span>
          </div>
        ) : records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--brand-badge-bg)] border-b border-[var(--border-subtle)] text-[var(--text-muted)] uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3 px-4 w-[240px]">Faculty Member</th>
                  <th className="py-3 px-4 w-[160px]">Department</th>
                  <th className="py-3 px-4 w-[240px]">Status</th>
                  <th className="py-3 px-4 w-[140px]">Check-In Time</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {records.map((r) => {
                  const isSaving = savingId === r.faculty_id;

                  return (
                    <tr
                      key={r.faculty_id}
                      className="hover:bg-[var(--brand-badge-bg)]/40 transition-colors"
                    >
                      {/* Faculty Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[var(--text-main)]">
                          {r.faculty_name}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {r.designation}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 text-[var(--text-main)] font-medium">
                        {r.department}
                      </td>

                      {/* Status Selector Pills */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex rounded-lg border border-[var(--border-subtle)] p-0.5 bg-[var(--bg-surface)] gap-0.5">
                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                r.faculty_id,
                                "present",
                                r.check_in_time,
                                r.remarks
                              )
                            }
                            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                              r.status === "present"
                                ? "bg-emerald-600 text-white shadow-2xs"
                                : "text-slate-500 hover:text-emerald-700"
                            }`}
                          >
                            Present
                          </button>

                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                r.faculty_id,
                                "late",
                                r.check_in_time || "09:15 AM",
                                r.remarks
                              )
                            }
                            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                              r.status === "late"
                                ? "bg-amber-600 text-white shadow-2xs"
                                : "text-slate-500 hover:text-amber-700"
                            }`}
                          >
                            Late
                          </button>

                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                r.faculty_id,
                                "on_leave",
                                undefined,
                                r.remarks
                              )
                            }
                            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                              r.status === "on_leave"
                                ? "bg-indigo-600 text-white shadow-2xs"
                                : "text-slate-500 hover:text-indigo-700"
                            }`}
                          >
                            Leave
                          </button>

                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                r.faculty_id,
                                "absent",
                                undefined,
                                r.remarks
                              )
                            }
                            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                              r.status === "absent"
                                ? "bg-rose-600 text-white shadow-2xs"
                                : "text-slate-500 hover:text-rose-700"
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </td>

                      {/* Check-In Time */}
                      <td className="py-3.5 px-4">
                        {r.status === "absent" || r.status === "on_leave" ? (
                          <span className="text-[var(--text-muted)] text-[11px] italic">
                            —
                          </span>
                        ) : (
                          <input
                            type="text"
                            defaultValue={r.check_in_time || "08:50 AM"}
                            onBlur={(e) =>
                              handleUpdateStatus(
                                r.faculty_id,
                                r.status,
                                e.target.value,
                                r.remarks
                              )
                            }
                            placeholder="08:50 AM"
                            className="w-24 text-[11px] px-2 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] font-mono focus:outline-none focus:border-blue-500"
                          />
                        )}
                      </td>

                      {/* Remarks */}
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          defaultValue={r.remarks || ""}
                          onBlur={(e) =>
                            handleUpdateStatus(
                              r.faculty_id,
                              r.status,
                              r.check_in_time,
                              e.target.value
                            )
                          }
                          placeholder="Optional notes / reason..."
                          className="w-full max-w-[260px] text-[11px] px-2 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-blue-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-[var(--text-muted)] text-xs">
            No faculty profiles registered. Add faculty profiles first.
          </div>
        )}
      </div>
    </div>
  );
}
