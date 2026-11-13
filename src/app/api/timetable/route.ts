import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { detectClash } from "@/lib/clashDetection";
import { DayOfWeek } from "@/lib/types";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const groupId = parseInt(body.group_id, 10);
    const subjectId = parseInt(body.subject_id, 10);
    const facultyId = parseInt(body.faculty_id, 10);
    const roomId = parseInt(body.room_id, 10);
    const day = body.day as DayOfWeek;
    const timeslotId = parseInt(body.timeslot_id, 10);

    if (!groupId || !subjectId || !facultyId || !roomId || !day || !timeslotId) {
      return NextResponse.json(
        { error: "All assignment fields are required." },
        { status: 400 }
      );
    }

    // Clash Detection
    const clash = await detectClash(groupId, subjectId, facultyId, roomId, day, timeslotId);
    if (clash.hasClash) {
      return NextResponse.json({ error: clash.message }, { status: 409 });
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("timetable")
      .insert({
        group_id: groupId,
        subject_id: subjectId,
        faculty_id: facultyId,
        room_id: roomId,
        day,
        timeslot_id: timeslotId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, entry: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save slot" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Entry ID required" }, { status: 400 });
    }

    const supabase = getAdminClient();
    const { error } = await supabase.from("timetable").delete().eq("id", parseInt(id, 10));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

