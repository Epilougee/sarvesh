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
  CalendarCheck,
  Plus,
  TableCellsSplit,
  MapPin,
  RefreshCw,
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
} from "lucide-react";
import { SessionUser } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";

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
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-slate-200/80 shadow-xs">
          <RefreshCw className="w-4 h-4 animate-spin text-[#2F5D8A]" />
          <span>Assembling live dashboard analytics...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center p-4">
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

  const {
    session,
    counts,
    institutionType,
    dayName,
    isSunday,
    todayClasses,
    weeklyChartData,
    roomChartData,
  } = data;

  const PERIOD_COLORS = ["#2F5D8A", "#3A9D6E", "#D9822B", "#6B5BB5", "#0E7490", "#BE185D", "#4338CA"];
  const PIE_COLORS = ["#2F5D8A", "#3A9D6E", "#E08E45", "#6B5BB5", "#0E7490", "#F43F5E"];

  return (
    <div className="flex min-h-screen app-bg">
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

        <main className="p-7 space-y-7">
          {/* 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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

          {/* Quick Faculty Attendance Banner */}
          {counts.attendanceTotal > 0 && (
            <Link
              href="/attendance"
              className="block bg-white/95 border border-slate-200/90 rounded-xl p-4 shadow-xs hover:border-[#2F5D8A] hover:shadow-sm transition-all group"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span>Faculty Attendance Today</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {counts.attendancePresent} / {counts.attendanceTotal} Present
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Daily roll call active. Click to view roster, record late arrivals, or mark leaves.
                    </p>
                  </div>
                </div>

                <span className="text-xs font-semibold text-[#2F5D8A] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Manage Attendance →
                </span>
              </div>
            </Link>
          )}

          {/* Interactive Visual Graphs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekly Load Bar Chart */}
            <div className="lg:col-span-2 bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#EBF3FA] text-[#2F5D8A] flex items-center justify-center">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">Weekly Scheduled Distribution</h3>
                    <p className="text-[11px] text-slate-400">Total instructional periods planned across days</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                  <TrendingUp className="w-3.5 h-3.5 text-[#3A9D6E]" />
                  <span>{counts.totalClasses} total periods</span>
                </div>
              </div>

              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748B", fontSize: 11, fontWeight: 500 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94A3B8", fontSize: 10 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(47, 93, 138, 0.04)" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">
                              <span className="font-semibold">{item.fullDay}: </span>
                              <span className="text-blue-300 font-bold">{item.classes} classes</span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="classes" radius={[6, 6, 0, 0]}>
                      {weeklyChartData.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.fullDay === dayName ? "#2F5D8A" : "#94A3B8"}
                          fillOpacity={entry.fullDay === dayName ? 1 : 0.45}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Room / Facility Utilization Pie Chart */}
            <div className="bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-[#E6F5EE] text-[#3A9D6E] flex items-center justify-center">
                  <PieIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Room Utilization</h3>
                  <p className="text-[11px] text-slate-400">Classrooms and computing labs occupancy</p>
                </div>
              </div>

              <div className="h-[150px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0];
                          return (
                            <div className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg">
                              <span className="font-semibold">{item.name}: </span>
                              <span className="text-emerald-300 font-bold">{item.value} periods</span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Pie
                      data={roomChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={58}
                      paddingAngle={3}
                      dataKey="periods"
                    >
                      {roomChartData.map((_: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100">
                {roomChartData.slice(0, 4).map((r: any, idx: number) => (
                  <div key={r.name} className="flex items-center gap-1.5 text-[10px] text-slate-600 truncate">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span className="truncate">{r.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Today's Schedule Card */}
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-xl p-6 shadow-xs">
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
                    <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200">
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
