import { getAdminClient } from "./supabase";
import { DayOfWeek } from "./types";

export interface ClashResult {
  hasClash: boolean;
  message: string;
}

export async function detectClash(
  groupId: number,
  subjectId: number,
  facultyId: number,
  roomId: number,
  day: DayOfWeek,
  timeslotId: number,
  excludeId?: number
): Promise<ClashResult> {
  const supabase = getAdminClient();

  // 0. Fetch timeslot label for human-readable error messages
  const { data: timeslot } = await supabase
    .from("timeslots")
    .select("label, start_time, end_time")
    .eq("id", timeslotId)
    .single();

  const periodInfo = timeslot
    ? `${timeslot.label} (${timeslot.start_time} - ${timeslot.end_time})`
    : `Timeslot #${timeslotId}`;

  // 1. Check Group Clash (Student group already has a lecture scheduled)
  let groupQuery = supabase
    .from("timetable")
    .select(
      `
      id,
      groups:group_id (name),
      subjects:subject_id (name),
      rooms:room_id (name),
      faculty:faculty_id (users:user_id (name))
    `
    )
    .eq("group_id", groupId)
    .eq("day", day)
    .eq("timeslot_id", timeslotId);

  if (excludeId) {
    groupQuery = groupQuery.neq("id", excludeId);
  }

  const { data: groupConflicts } = await groupQuery;
  if (groupConflicts && groupConflicts.length > 0) {
    const c = groupConflicts[0] as any;
    const gName = c.groups?.name || "This group";
    const sName = c.subjects?.name || "a subject";
    const fName = c.faculty?.users?.name || "a faculty member";
    const rName = c.rooms?.name || "a room";
    return {
      hasClash: true,
      message: `Group Clash: '${gName}' is already occupied with '${sName}' scheduled with ${fName} in ${rName} on ${day} during ${periodInfo}.`,
    };
  }

  // 2. Check Faculty Clash (Faculty already assigned at this timeslot)
  let facultyQuery = supabase
    .from("timetable")
    .select(
      `
      id,
      groups:group_id (name),
      subjects:subject_id (name),
      rooms:room_id (name),
      faculty:faculty_id (users:user_id (name))
    `
    )
    .eq("faculty_id", facultyId)
    .eq("day", day)
    .eq("timeslot_id", timeslotId);

  if (excludeId) {
    facultyQuery = facultyQuery.neq("id", excludeId);
  }

  const { data: facultyConflicts } = await facultyQuery;
  if (facultyConflicts && facultyConflicts.length > 0) {
    const c = facultyConflicts[0] as any;
    const gName = c.groups?.name || "a group";
    const sName = c.subjects?.name || "a subject";
    const fName = c.faculty?.users?.name || "This faculty member";
    const rName = c.rooms?.name || "a room";
    return {
      hasClash: true,
      message: `Faculty Clash: ${fName} is already teaching '${sName}' to ${gName} in ${rName} on ${day} during ${periodInfo}.`,
    };
  }

  // 3. Check Room Clash (Room occupied at this timeslot)
  let roomQuery = supabase
    .from("timetable")
    .select(
      `
      id,
      groups:group_id (name),
      subjects:subject_id (name),
      rooms:room_id (name),
      faculty:faculty_id (users:user_id (name))
    `
    )
    .eq("room_id", roomId)
    .eq("day", day)
    .eq("timeslot_id", timeslotId);

  if (excludeId) {
    roomQuery = roomQuery.neq("id", excludeId);
  }

  const { data: roomConflicts } = await roomQuery;
  if (roomConflicts && roomConflicts.length > 0) {
    const c = roomConflicts[0] as any;
    const gName = c.groups?.name || "a group";
    const sName = c.subjects?.name || "a subject";
    const fName = c.faculty?.users?.name || "a faculty member";
    const rName = c.rooms?.name || "This room";
    return {
      hasClash: true,
      message: `Room Clash: '${rName}' is already occupied by ${gName} for '${sName}' with ${fName} on ${day} during ${periodInfo}.`,
    };
  }

  return { hasClash: false, message: "" };
}
