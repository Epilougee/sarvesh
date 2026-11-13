import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getAdminClient();

    // 1. Counts
    const [resF, resS, resG, resR] = await Promise.all([
      supabase.from("faculty").select("*", { count: "exact", head: true }),
      supabase.from("subjects").select("*", { count: "exact", head: true }),
      supabase.from("groups").select("*", { count: "exact", head: true }),
      supabase.from("rooms").select("*", { count: "exact", head: true }),
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

    // 3. Today's classes
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const now = new Date();
    let dayName = days[now.getDay()];
    const isSunday = dayName === "Sunday";
    if (isSunday) dayName = "Monday";

    const { data: todayClasses, error: ttError } = await supabase
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
      },
      institutionType,
      dayName,
      isSunday,
      todayClasses: sortedClasses,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error", stack: err?.stack },
      { status: 500 }
    );
  }
}

