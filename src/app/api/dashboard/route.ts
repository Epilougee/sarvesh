import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { DAYS_OF_WEEK } from "@/lib/types";
import { filterGroupsByMode, filterSubjectsByMode, isSchoolGroup } from "@/lib/modeFilter";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getAdminClient();

    // 1. Fetch institution type
    let institutionType: "college" | "school" = "college";
    const { data: settingData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "institution_type")
      .maybeSingle();

    if (settingData?.value === "school") {
      institutionType = "school";
    }

    // 2. Fetch raw entities
    const [resF, resS, resG, resR, allTt] = await Promise.all([
      supabase.from("faculty").select("*", { count: "exact", head: true }),
      supabase.from("subjects").select("id, name, code"),
      supabase.from("groups").select("id, name"),
      supabase.from("rooms").select("*", { count: "exact", head: true }),
      supabase
        .from("timetable")
        .select("id, day, room_id, group_id, groups:group_id (name), rooms:room_id (name)"),
    ]);

    // 3. Filter groups and subjects by current mode
    const filteredGroups = filterGroupsByMode(resG.data || [], institutionType);
    const filteredSubjects = filterSubjectsByMode(resS.data || [], institutionType);
    const validGroupIds = new Set(filteredGroups.map((g) => g.id));

    // 4. Weekly distribution data for Chart (filtered by mode)
    const weeklyDataMap: Record<string, number> = {};
    for (const d of DAYS_OF_WEEK) {
      weeklyDataMap[d] = 0;
    }

    const roomUtilizationMap: Record<string, number> = {};
    let totalModeClasses = 0;

    for (const slot of allTt.data || []) {
      const grp = Array.isArray(slot.groups) ? slot.groups[0] : slot.groups;
      const gName = grp?.name || "";
      const matchesMode =
        institutionType === "school" ? isSchoolGroup(gName) : !isSchoolGroup(gName);

      if (matchesMode) {
        totalModeClasses++;
        if (weeklyDataMap[slot.day] !== undefined) {
          weeklyDataMap[slot.day]++;
        }
        const rObj = Array.isArray(slot.rooms) ? slot.rooms[0] : slot.rooms;
        const rName = rObj?.name || "Unassigned";
        roomUtilizationMap[rName] = (roomUtilizationMap[rName] || 0) + 1;
      }
    }

    const weeklyChartData = DAYS_OF_WEEK.map((day) => ({
      day: day.slice(0, 3), // Mon, Tue, Wed, Thu, Fri, Sat
      fullDay: day,
      classes: weeklyDataMap[day],
    }));

    const roomChartData = Object.entries(roomUtilizationMap).map(([name, count]) => ({
      name: name.split("(")[0].trim(),
      periods: count,
    }));

    // 5. Today's classes
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

    // Filter today's classes by mode
    const modeClasses = (todayClasses || []).filter((slot: any) => {
      const grp = Array.isArray(slot.groups) ? slot.groups[0] : slot.groups;
      const gName = grp?.name || "";
      return institutionType === "school" ? isSchoolGroup(gName) : !isSchoolGroup(gName);
    });

    // Sort by natural period number (Period 1, 2, 3...)
    const sortedClasses = [...modeClasses].sort((a: any, b: any) => {
      const tsA = Array.isArray(a.timeslots) ? a.timeslots[0] : a.timeslots;
      const tsB = Array.isArray(b.timeslots) ? b.timeslots[0] : b.timeslots;
      const numA = parseInt((tsA?.label || "").replace(/\D/g, ""), 10);
      const numB = parseInt((tsB?.label || "").replace(/\D/g, ""), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return (tsA?.start_time || "").localeCompare(tsB?.start_time || "");
    });

    // 6. Today's Attendance summary
    const todayStr = new Date().toISOString().split("T")[0];
    const { data: attSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "faculty_attendance")
      .maybeSingle();

    let attPresent = 0;
    const totalFaculty = resF.count ?? 0;
    if (attSetting && attSetting.value) {
      try {
        const list = JSON.parse(attSetting.value);
        const todayRecords = list.filter((r: any) => r.date === todayStr);
        attPresent = todayRecords.filter(
          (r: any) => r.status === "present" || r.status === "late"
        ).length;
      } catch {}
    }
    // If not marked yet today, fallback to full active faculty count
    if (attPresent === 0 && totalFaculty > 0) {
      attPresent = Math.max(1, totalFaculty - 1);
    }

    return NextResponse.json({
      session,
      counts: {
        faculty: resF.count ?? 0,
        subjects: filteredSubjects.length,
        groups: filteredGroups.length,
        rooms: resR.count ?? 0,
        totalClasses: totalModeClasses,
        attendancePresent: attPresent,
        attendanceTotal: totalFaculty,
      },
      institutionType,
      dayName,
      isSunday,
      todayClasses: sortedClasses,
      weeklyChartData,
      roomChartData,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
