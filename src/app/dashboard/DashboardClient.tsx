"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  RefreshCw,
} from "lucide-react";
import { SessionUser } from "@/lib/types";

export default function DashboardClient() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to load dashboard data");
      } else {
        setData(json);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to connect to dashboard API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <RefreshCw className="w-4 h-4 animate-spin text-[#2F5D8A]" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-center">
          <h2 className="text-base font-bold text-slate-800">Dashboard Notice</h2>
          <p className="text-xs text-rose-600 mt-2 font-mono break-all">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-[#2F5D8A] text-white text-xs font-semibold rounded-md hover:bg-[#244A70] cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { session, counts, institutionType, dayName, isSunday, todayClasses } = data;
  const PERIOD_COLORS = ["#2F5D8A", "#3A9D6E", "#D9822B", "#6B5BB5", "#0E7490", "#BE185D", "#4338CA"];

  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      <Sidebar user={session as SessionUser} institutionType={institutionType} />

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
              value={counts.faculty}
              icon={UserCheck}
              variant="faculty"
            />
            <StatCard
              label="Subjects"
              value={counts.subjects}
              icon={BookOpen}
              variant="subjects"
            />
            <StatCard
              label={institutionType === "school" ? "Classes / Sections" : "Cohorts / Divisions"}
              value={counts.groups}
              icon={Users}
              variant="cohorts"
            />
            <StatCard
              label="Rooms & Labs"
              value={counts.rooms}
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

            {todayClasses && todayClasses.length > 0 ? (
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
                    {todayClasses.map((slot: any, idx: number) => {
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

