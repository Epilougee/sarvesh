import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { FacultyAttendance } from "@/lib/types";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const requestedDate =
    searchParams.get("date") || new Date().toISOString().split("T")[0];
  const facultyIdParam = searchParams.get("faculty_id");

  const supabase = getAdminClient();

  // 1. Fetch all faculty with user names
  const { data: dbFaculty, error: fErr } = await supabase
    .from("faculty")
    .select("id, department, designation, phone, users:user_id (name, email)")
    .order("id");

  if (fErr) {
    return NextResponse.json({ error: fErr.message }, { status: 500 });
  }

  // 2. Fetch attendance JSON from settings
  const { data: attSetting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "faculty_attendance")
    .maybeSingle();

  let allAttendance: FacultyAttendance[] = [];
  if (attSetting && attSetting.value) {
    try {
      allAttendance = JSON.parse(attSetting.value);
    } catch {
      allAttendance = [];
    }
  }

  // If requesting personal attendance history for a faculty member
  if (facultyIdParam) {
    const targetId = parseInt(facultyIdParam, 10);
    const facultyHistory = allAttendance.filter((a) => a.faculty_id === targetId);
    return NextResponse.json({ history: facultyHistory });
  }

  // 3. Assemble attendance for the requested date
  const recordsForDate = allAttendance.filter((a) => a.date === requestedDate);
  const recordMap = new Map(recordsForDate.map((r) => [r.faculty_id, r]));

  // Ensure every active faculty member has an entry for the requested date
  const records: FacultyAttendance[] = (dbFaculty || []).map((f: any, idx) => {
    const existing = recordMap.get(f.id);
    const uName = f.users?.name || "Faculty Member";

    if (existing) {
      return {
        ...existing,
        faculty_name: uName,
        department: f.department,
        designation: f.designation,
      };
    }

    // Default entry for today/date if not explicitly marked yet
    return {
      id: `${f.id}-${requestedDate}`,
      faculty_id: f.id,
      date: requestedDate,
      status: "present",
      check_in_time: "08:50 AM",
      remarks: "Present on duty",
      faculty_name: uName,
      department: f.department,
      designation: f.designation,
    };
  });

  // Calculate summary counts
  const total = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const on_leave = records.filter((r) => r.status === "on_leave").length;
  const late = records.filter((r) => r.status === "late").length;
  const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  return NextResponse.json({
    date: requestedDate,
    records,
    summary: {
      total,
      present,
      absent,
      on_leave,
      late,
      percentage,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const supabase = getAdminClient();

    // 1. Fetch current attendance log
    const { data: attSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "faculty_attendance")
      .maybeSingle();

    let allAttendance: FacultyAttendance[] = [];
    if (attSetting && attSetting.value) {
      try {
        allAttendance = JSON.parse(attSetting.value);
      } catch {
        allAttendance = [];
      }
    }

    // Handle Bulk "Mark All Present"
    if (body.action === "mark_all_present") {
      const targetDate = body.date || new Date().toISOString().split("T")[0];

      // Fetch all faculty IDs
      const { data: facultyList } = await supabase.from("faculty").select("id");
      const fIds = (facultyList || []).map((f) => f.id);

      // Remove existing for this date
      const filtered = allAttendance.filter((a) => a.date !== targetDate);

      // Add all as present
      for (const fId of fIds) {
        filtered.push({
          id: `${fId}-${targetDate}`,
          faculty_id: fId,
          date: targetDate,
          status: "present",
          check_in_time: "08:50 AM",
          remarks: "Marked all present",
        });
      }

      await supabase.from("settings").upsert({
        key: "faculty_attendance",
        value: JSON.stringify(filtered),
      });

      return NextResponse.json({ success: true, count: fIds.length });
    }

    // Handle Single Record Update
    const { faculty_id, date, status, check_in_time, remarks } = body;
    if (!faculty_id || !date || !status) {
      return NextResponse.json(
        { error: "Missing required attendance fields" },
        { status: 400 }
      );
    }

    // Filter out existing record for this faculty & date
    const updated = allAttendance.filter(
      (a) => !(a.faculty_id === faculty_id && a.date === date)
    );

    // Push new entry
    updated.push({
      id: `${faculty_id}-${date}`,
      faculty_id,
      date,
      status,
      check_in_time: check_in_time || null,
      remarks: remarks || "",
    });

    await supabase.from("settings").upsert({
      key: "faculty_attendance",
      value: JSON.stringify(updated),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
