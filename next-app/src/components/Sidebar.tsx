"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SessionUser } from "@/lib/types";
import {
  PieChart,
  CalendarPlus,
  TableCellsSplit,
  UserCheck,
  BookOpen,
  Users,
  DoorOpen,
  Clock,
  Sliders,
  CalendarDays,
  LogOut,
  GraduationCap,
} from "lucide-react";

interface SidebarProps {
  user: SessionUser | null;
  institutionType: "college" | "school";
}

export function Sidebar({ user, institutionType }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  };

  const groupLabel = institutionType === "school" ? "Classes & Sections" : "Cohorts & Divisions";

  return (
    <aside className="w-[240px] bg-gradient-to-b from-[#1E3246] to-[#172738] border-r border-white/10 flex flex-col fixed top-0 bottom-0 left-0 z-50 select-none">
      {/* Brand Header */}
      <div className="h-[58px] px-5 flex items-center gap-3 border-b border-white/10">
        <div className="w-9 h-9 rounded-md bg-[#2F5D8A] text-white flex items-center justify-center font-bold text-lg shadow-sm">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-slate-100 text-[15px] leading-tight">Timetable Portal</div>
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            {institutionType} mode
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="p-3 flex-1 overflow-y-auto space-y-1">
        {user?.role === "admin" ? (
          <>
            <div className="text-[10px] font-semibold text-[#7D93AA] uppercase tracking-wider px-3 pt-3 pb-1">
              Main
            </div>
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                pathname === "/dashboard"
                  ? "bg-[#2F5D8A] text-white shadow-sm font-semibold"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <PieChart className="w-4 h-4 text-[#8BA3BC]" />
              <span>Dashboard</span>
            </Link>

            <div className="text-[10px] font-semibold text-[#7D93AA] uppercase tracking-wider px-3 pt-3 pb-1">
              Timetable
            </div>
            <Link
              href="/timetable/builder"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                pathname.startsWith("/timetable/builder")
                  ? "bg-[#2F5D8A] text-white shadow-sm font-semibold"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <CalendarPlus className="w-4 h-4 text-[#8BA3BC]" />
              <span>Timetable Builder</span>
            </Link>
            <Link
              href="/timetable/view"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                pathname.startsWith("/timetable/view")
                  ? "bg-[#2F5D8A] text-white shadow-sm font-semibold"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <TableCellsSplit className="w-4 h-4 text-[#8BA3BC]" />
              <span>View Timetables</span>
            </Link>

            <div className="text-[10px] font-semibold text-[#7D93AA] uppercase tracking-wider px-3 pt-3 pb-1">
              Academic Records
            </div>
            <Link
              href="/faculty"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                pathname.startsWith("/faculty")
                  ? "bg-[#2F5D8A] text-white shadow-sm font-semibold"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <UserCheck className="w-4 h-4 text-[#8BA3BC]" />
              <span>Faculty</span>
            </Link>
            <Link
              href="/subjects"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                pathname.startsWith("/subjects")
                  ? "bg-[#2F5D8A] text-white shadow-sm font-semibold"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#8BA3BC]" />
              <span>Subjects</span>
            </Link>
            <Link
              href="/groups"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                pathname.startsWith("/groups")
                  ? "bg-[#2F5D8A] text-white shadow-sm font-semibold"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4 text-[#8BA3BC]" />
              <span>{groupLabel}</span>
            </Link>
            <Link
              href="/rooms"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                pathname.startsWith("/rooms")
                  ? "bg-[#2F5D8A] text-white shadow-sm font-semibold"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <DoorOpen className="w-4 h-4 text-[#8BA3BC]" />
              <span>Rooms & Labs</span>
            </Link>
            <Link
              href="/timeslots"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                pathname.startsWith("/timeslots")
                  ? "bg-[#2F5D8A] text-white shadow-sm font-semibold"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Clock className="w-4 h-4 text-[#8BA3BC]" />
              <span>Periods / Timeslots</span>
            </Link>

            <div className="text-[10px] font-semibold text-[#7D93AA] uppercase tracking-wider px-3 pt-3 pb-1">
              System
            </div>
            <Link
              href="/settings"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                pathname.startsWith("/settings")
                  ? "bg-[#2F5D8A] text-white shadow-sm font-semibold"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Sliders className="w-4 h-4 text-[#8BA3BC]" />
              <span>Settings</span>
            </Link>
          </>
        ) : (
          <>
            <div className="text-[10px] font-semibold text-[#7D93AA] uppercase tracking-wider px-3 pt-3 pb-1">
              Faculty Portal
            </div>
            <Link
              href="/my-timetable"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                pathname === "/my-timetable"
                  ? "bg-[#2F5D8A] text-white shadow-sm font-semibold"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <CalendarDays className="w-4 h-4 text-[#8BA3BC]" />
              <span>My Timetable</span>
            </Link>
            <Link
              href="/timetable/view"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                pathname.startsWith("/timetable/view")
                  ? "bg-[#2F5D8A] text-white shadow-sm font-semibold"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <TableCellsSplit className="w-4 h-4 text-[#8BA3BC]" />
              <span>Institution Schedule</span>
            </Link>
          </>
        )}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-white/10 bg-black/10 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/15 border border-white/20 text-slate-200 flex items-center justify-center font-bold text-xs uppercase">
            {user?.name ? user.name[0] : "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-100 truncate">{user?.name}</div>
            <div className="text-[10px] text-slate-400 capitalize">{user?.role}</div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium text-slate-300 bg-white/5 border border-white/10 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-200 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
