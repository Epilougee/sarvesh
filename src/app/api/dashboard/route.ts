import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { DAYS_OF_WEEK } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getAdminClient();

    // 1. Counts
    const [resF, resS, resG, resR, allTt] = await Promise.all([
      supabase.from("faculty").select("*", { count: "exact", head: true }),
      supabase.from("subjects").select("*", { count: "exact", head: true }),
      supabase.from("groups").select("*", { count: "exact", head: true }),
      supabase.from("rooms").select("*", { count: "exact", head: true }),
      supabase
        .from("timetable")
        .select("id, day, room_id, rooms:room_id (name)"),
    ]);

    // 2. Settings
    let institutionType: "college" | "school" = "college";
    const { data: settingData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "institution_type")
      .maybeSingle();

    if (settingData?.value === "school") {
      institutionType = "school";
    }

    // 3. Weekly distribution data for Chart
    const weeklyDataMap: Record<string, number> = {};
    for (const d of DAYS_OF_WEEK) {
      weeklyDataMap[d] = 0;
    }

    const roomUtilizationMap: Record<string, number> = {};

    for (const slot of allTt.data || []) {
      if (weeklyDataMap[slot.day] !== undefined) {
        weeklyDataMap[slot.day]++;
      }
      const rObj = Array.isArray(slot.rooms) ? slot.rooms[0] : slot.rooms;
      const rName = rObj?.name || "Unassigned";
      roomUtilizationMap[rName] = (roomUtilizationMap[rName] || 0) + 1;
    }

    const weeklyChartData = DAYS_OF_WEEK.map((day) => ({
      day: day.slice(0, 3), // Mon, Tue, Wed, Thu, Fri, Sat
      fullDay: day,
      classes: weeklyDataMap[day],
    }));

    const roomChartData = Object.entries(roomUtilizationMap).map(([name, count]) => ({
      name: name.split("(")[0].trim(), // shorten for cleaner charts
      periods: count,
    }));

    // 4. Today's classes
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

    const sortedClasses = [...(todayClasses || [])].sort((a: any, b: any) => {
      const tsA = Array.isArray(a.timeslots) ? a.timeslots[0] : a.timeslots;
      const tsB = Array.isArray(b.timeslots) ? b.timeslots[0] : b.timeslots;
      return (tsA?.start_time || "").localeCompare(tsB?.start_time || "");
    });

    return NextResponse.json({
      session,
      counts: {
        faculty: resF.count ?? 0,
        subjects: resS.count ?? 0,
        groups: resG.count ?? 0,
        rooms: resR.count ?? 0,
        totalClasses: allTt.data?.length ?? 0,
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
