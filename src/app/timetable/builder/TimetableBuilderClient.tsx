"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DAYS_OF_WEEK, DayOfWeek, Group, Subject, Room, Timeslot } from "@/lib/types";
import { Plus, Trash2, AlertCircle, X, Users, MapPin, UserCheck, BookOpen } from "lucide-react";

interface FacultyItem {
  id: number;
  name: string;
  department: string;
  designation: string;
}

interface TimetableBuilderClientProps {
  institutionType: "college" | "school";
  allGroups: Group[];
  selectedGroupId: number;
  timeslots: Timeslot[];
  allSubjects: Subject[];
  allFaculty: FacultyItem[];
  allRooms: Room[];
  matrix: Record<string, Record<number, any>>;
}

export function TimetableBuilderClient({
  institutionType,
  allGroups,
  selectedGroupId,
  timeslots,
  allSubjects,
  allFaculty,
  allRooms,
  matrix,
}: TimetableBuilderClientProps) {
  const router = useRouter();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDay, setModalDay] = useState<DayOfWeek>("Monday");
  const [modalTimeslotId, setModalTimeslotId] = useState<number>(timeslots[0]?.id || 0);

  const [formSubjectId, setFormSubjectId] = useState<string>(allSubjects[0]?.id?.toString() || "");
  const [formFacultyId, setFormFacultyId] = useState<string>(allFaculty[0]?.id?.toString() || "");
  const [formRoomId, setFormRoomId] = useState<string>(allRooms[0]?.id?.toString() || "");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const groupLabel = institutionType === "school" ? "Class / Section" : "Cohort / Division";

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(`/timetable/builder?group_id=${e.target.value}`);
  };

  const openAssignModal = (day: DayOfWeek, timeslotId: number) => {
    setModalDay(day);
    setModalTimeslotId(timeslotId);
    setErrorMessage(null);
    setModalOpen(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_id: selectedGroupId,
          subject_id: formSubjectId,
          faculty_id: formFacultyId,
          room_id: formRoomId,
          day: modalDay,
          timeslot_id: modalTimeslotId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to schedule slot");
        setLoading(false);
        return;
      }

      setModalOpen(false);
      router.refresh();
    } catch {
      setErrorMessage("Network error scheduling period.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (id: number) => {
    if (!confirm("Are you sure you want to delete this scheduled class?")) return;

    try {
      const res = await fetch(`/api/timetable?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete slot");
      }
    } catch {
      alert("Network error deleting slot");
    }
  };

  const selectedGroupName =
    allGroups.find((g) => g.id === selectedGroupId)?.name || "Select Cohort";

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-400" />
            <span>Select {groupLabel}:</span>
          </label>
          <select
            value={selectedGroupId}
            onChange={handleGroupChange}
            className="text-xs border border-slate-300 rounded-md py-1.5 px-3 bg-white focus:outline-none focus:border-[#2F5D8A] focus:ring-1 focus:ring-[#2F5D8A] text-slate-800 font-medium"
          >
            {allGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Showing weekly schedule matrix for <strong className="text-slate-800">{selectedGroupName}</strong>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4 w-[110px] border-r border-slate-200">Day</th>
                {timeslots.map((ts) => (
                  <th key={ts.id} className="py-3 px-3 text-center border-r border-slate-200 last:border-r-0">
                    <div>{ts.label}</div>
                    <div className="text-[10px] font-normal text-slate-400">
                      {ts.start_time} - {ts.end_time}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {DAYS_OF_WEEK.map((day) => (
                <tr key={day} className="hover:bg-slate-50/40">
                  <td className="py-3 px-4 font-semibold text-slate-800 bg-slate-50/60 border-r border-slate-200">
                    {day}
                  </td>
                  {timeslots.map((ts) => {
                    const slot = matrix[day]?.[ts.id];
                    return (
                      <td
                        key={ts.id}
                        className="p-2 border-r border-slate-200 last:border-r-0 align-top h-[95px] w-[140px]"
                      >
                        {slot ? (
                          <div className="h-full rounded-md border border-blue-200 bg-[#EBF3FA] p-2 flex flex-col justify-between group relative shadow-xs">
                            <div>
                              <div className="font-semibold text-slate-800 text-[11px] truncate" title={slot.subject_name}>
                                {slot.subject_name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono font-medium">
                                {slot.subject_code}
                              </div>
                            </div>
                            <div className="text-[10px] text-slate-600 border-t border-blue-100/80 pt-1 mt-1 truncate">
                              <div>{slot.faculty_name}</div>
                              <div className="text-slate-400 truncate">{slot.room_name}</div>
                            </div>

                            <button
                              onClick={() => handleDeleteSlot(slot.id)}
                              title="Delete Period"
                              className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openAssignModal(day, ts.id)}
                            className="w-full h-full rounded border border-dashed border-slate-200 hover:border-[#2F5D8A] hover:bg-[#EBF3FA]/50 text-slate-400 hover:text-[#2F5D8A] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-[11px] font-medium"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Assign</span>
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-[480px] p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Schedule Period Assignment</h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {selectedGroupName} • {modalDay} •{" "}
                  {timeslots.find((t) => t.id === modalTimeslotId)?.label}
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Subject</span>
                </label>
                <select
                  value={formSubjectId}
                  onChange={(e) => setFormSubjectId(e.target.value)}
                  required
                  className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 bg-white focus:outline-none focus:border-[#2F5D8A]"
                >
                  {allSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Faculty</span>
                </label>
                <select
                  value={formFacultyId}
                  onChange={(e) => setFormFacultyId(e.target.value)}
                  required
                  className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 bg-white focus:outline-none focus:border-[#2F5D8A]"
                >
                  {allFaculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} — {f.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Room / Lab</span>
                </label>
                <select
                  value={formRoomId}
                  onChange={(e) => setFormRoomId(e.target.value)}
                  required
                  className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 bg-white focus:outline-none focus:border-[#2F5D8A]"
                >
                  {allRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Cap: {r.capacity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold bg-[#2F5D8A] text-white rounded-md hover:bg-[#244A70] disabled:opacity-60 cursor-pointer shadow-sm"
                >
                  {loading ? "Checking Clashes..." : "Confirm Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

