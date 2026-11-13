export type Role = "admin" | "faculty";
export type InstitutionType = "college" | "school";
export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
}

export interface Faculty {
  id: number;
  user_id: number;
  department: string;
  designation: string;
  phone: string | null;
  name?: string;
  email?: string;
  subject_ids?: number[];
  subjects?: Subject[];
}

export interface Subject {
  id: number;
  name: string;
  code: string;
}

export interface Group {
  id: number;
  name: string;
}

export interface Room {
  id: number;
  name: string;
  capacity: number;
}

export interface Timeslot {
  id: number;
  label: string;
  start_time: string;
  end_time: string;
}

export interface TimetableEntry {
  id: number;
  group_id: number;
  subject_id: number;
  faculty_id: number;
  room_id: number;
  day: DayOfWeek;
  timeslot_id: number;
  group_name?: string;
  subject_name?: string;
  subject_code?: string;
  faculty_name?: string;
  room_name?: string;
  period_label?: string;
  start_time?: string;
  end_time?: string;
}

export interface Setting {
  key: string;
  value: string;
}

export interface SessionUser {
  id: number;
  faculty_id?: number | null;
  name: string;
  email: string;
  role: Role;
}
