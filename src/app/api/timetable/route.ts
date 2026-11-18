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
    const day = body.day as DayOfWeek;
    const timeslotId = parseInt(body.timeslot_id, 10);
    const isBreak = Boolean(body.is_break);

    const supabase = getAdminClient();

    let subjectId = parseInt(body.subject_id, 10);
    let facultyId = parseInt(body.faculty_id, 10);
    let roomId = parseInt(body.room_id, 10);

    if (isBreak) {
      // Find or create the BREAK subject
      let { data: breakSub } = await supabase
        .from("subjects")
        .select("id")
        .eq("code", "BREAK")
        .maybeSingle();

      if (!breakSub) {
        const { data: newSub } = await supabase
          .from("subjects")
          .insert({ name: "Lunch Break / Recess", code: "BREAK" })
          .select("id")
          .single();
        breakSub = newSub;
      }

      subjectId = breakSub ? breakSub.id : subjectId;

      // Use first available faculty & room as placeholders if not specified
      if (!facultyId || isNaN(facultyId)) {
        const { data: firstFac } = await supabase.from("faculty").select("id").limit(1).single();
        facultyId = firstFac?.id || 9;
      }
      if (!roomId || isNaN(roomId)) {
        const { data: firstRm } = await supabase.from("rooms").select("id").limit(1).single();
        roomId = firstRm?.id || 1;
      }
    }

    if (!groupId || !subjectId || !facultyId || !roomId || !day || !timeslotId) {
      return NextResponse.json(
        { error: "All assignment fields are required." },
        { status: 400 }
      );
    }

    // Clash Detection (skipped automatically for BREAK subjects)
    const clash = await detectClash(groupId, subjectId, facultyId, roomId, day, timeslotId);
    if (clash.hasClash) {
      return NextResponse.json({ error: clash.message }, { status: 409 });
    }

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
      .select(`
        id,
        group_id,
        subject_id,
        faculty_id,
        room_id,
        day,
        timeslot_id,
        groups:group_id (name),
        subjects:subject_id (name, code),
        faculty:faculty_id (users:user_id (name)),
        rooms:room_id (name)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, entry: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save slot" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const id = parseInt(body.id, 10);
    const toDay = body.day as DayOfWeek;
    const toTimeslotId = parseInt(body.timeslot_id, 10);
    const swapWithId = body.swap_with_id ? parseInt(body.swap_with_id, 10) : null;

    if (!id || !toDay || !toTimeslotId) {
      return NextResponse.json(
        { error: "Target day, timeslot, and slot ID are required for moving." },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // 1. Fetch current slot A
    const { data: slotA, error: errA } = await supabase
      .from("timetable")
      .select("*")
      .eq("id", id)
      .single();

    if (errA || !slotA) {
      return NextResponse.json({ error: "Original slot not found" }, { status: 404 });
    }

    // 2. Handle Swapping if target slot is occupied
    if (swapWithId && swapWithId !== id) {
      const { data: slotB, error: errB } = await supabase
        .from("timetable")
        .select("*")
        .eq("id", swapWithId)
        .single();

      if (errB || !slotB) {
        return NextResponse.json({ error: "Swap target slot not found" }, { status: 404 });
      }

      // Check clash for slot A moving to slot B's position (exclude slot A and B)
      const clashA = await detectClash(
        slotA.group_id,
        slotA.subject_id,
        slotA.faculty_id,
        slotA.room_id,
        toDay,
        toTimeslotId,
        id
      );
      if (clashA.hasClash) {
        return NextResponse.json({ error: clashA.message }, { status: 409 });
      }

      // Check clash for slot B moving to slot A's position (exclude slot A and B)
      const clashB = await detectClash(
        slotB.group_id,
        slotB.subject_id,
        slotB.faculty_id,
        slotB.room_id,
        slotA.day,
        slotA.timeslot_id,
        swapWithId
      );
      if (clashB.hasClash) {
        return NextResponse.json({ error: clashB.message }, { status: 409 });
      }

      // Perform swap
      await Promise.all([
        supabase
          .from("timetable")
          .update({ day: toDay, timeslot_id: toTimeslotId })
          .eq("id", id),
        supabase
          .from("timetable")
          .update({ day: slotA.day, timeslot_id: slotA.timeslot_id })
          .eq("id", swapWithId),
      ]);

      return NextResponse.json({ success: true, swapped: true });
    }

    // 3. Normal move to empty cell: Validate clash at target position
    const clash = await detectClash(
      slotA.group_id,
      slotA.subject_id,
      slotA.faculty_id,
      slotA.room_id,
      toDay,
      toTimeslotId,
      id
    );

    if (clash.hasClash) {
      return NextResponse.json({ error: clash.message }, { status: 409 });
    }

    const { data: updated, error: updateErr } = await supabase
      .from("timetable")
      .update({ day: toDay, timeslot_id: toTimeslotId })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, entry: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to move slot" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const supabase = getAdminClient();
    const { searchParams } = new URL(req.url);

    // 1. Check for body with bulk IDs
    let bodyIds: number[] | null = null;
    try {
      const body = await req.json();
      if (body?.ids && Array.isArray(body.ids)) {
        bodyIds = body.ids.map((x: any) => parseInt(x, 10)).filter((x: number) => !isNaN(x));
      }
    } catch {}

    if (bodyIds && bodyIds.length > 0) {
      const { error } = await supabase.from("timetable").delete().in("id", bodyIds);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, count: bodyIds.length });
    }

    // 2. Check query params for multiple IDs: ?ids=1,2,3
    const idsParam = searchParams.get("ids");
    if (idsParam) {
      const parsedIds = idsParam
        .split(",")
        .map((x) => parseInt(x.trim(), 10))
        .filter((x) => !isNaN(x));
      if (parsedIds.length > 0) {
        const { error } = await supabase.from("timetable").delete().in("id", parsedIds);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, count: parsedIds.length });
      }
    }

    // 3. Clear entire group / cohort: ?group_id=X [&day=Monday]
    const groupId = searchParams.get("group_id");
    if (groupId) {
      let q = supabase.from("timetable").delete().eq("group_id", parseInt(groupId, 10));
      const day = searchParams.get("day");
      if (day) q = q.eq("day", day);
      const { error } = await q;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, clearedCohort: true });
    }

    // 4. Single ID: ?id=X
    const id = searchParams.get("id");
    if (id) {
      const { error } = await supabase
        .from("timetable")
        .delete()
        .eq("id", parseInt(id, 10));
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Provide id, ids, or group_id to delete." },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete slot" }, { status: 500 });
  }
}
