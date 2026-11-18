"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DAYS_OF_WEEK,
  DayOfWeek,
  Group,
  Subject,
  Room,
  Timeslot,
  formatTimeDisplay,
} from "@/lib/types";
import {
  Plus,
  Trash2,
  AlertCircle,
  X,
  Users,
  MapPin,
  UserCheck,
  BookOpen,
  Coffee,
  GripVertical,
  CheckSquare,
  Square,
  ArrowRightLeft,
  Calendar,
  Layers,
  Sparkles,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import * as XLSX from "xlsx";

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
  matrix: initialMatrix,
}: TimetableBuilderClientProps) {
  const router = useRouter();

  // Local optimistic matrix
  const [matrix, setMatrix] = useState<Record<string, Record<number, any>>>(initialMatrix);

  useEffect(() => {
    setMatrix(initialMatrix);
  }, [initialMatrix]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"lecture" | "break">("lecture");
  const [modalDay, setModalDay] = useState<DayOfWeek>("Monday");
  const [modalTimeslotId, setModalTimeslotId] = useState<number>(timeslots[0]?.id || 0);

  // Form Fields
  const [formSubjectId, setFormSubjectId] = useState<string>(allSubjects[0]?.id?.toString() || "");
  const [formFacultyId, setFormFacultyId] = useState<string>(allFaculty[0]?.id?.toString() || "");
  const [formRoomId, setFormRoomId] = useState<string>(allRooms[0]?.id?.toString() || "");
  const [breakLabel, setBreakLabel] = useState("Lunch Break");

  // Notifications & State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Drag and Drop State
  const [draggedSlot, setDraggedSlot] = useState<{
    id: number;
    fromDay: DayOfWeek;
    fromTimeslotId: number;
    data: any;
  } | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ day: DayOfWeek; timeslotId: number } | null>(null);

  // Break Column Toggle
  const [showLunchColumn, setShowLunchColumn] = useState(true);

  // Clear Timetable Modal
  const [clearModalOpen, setClearModalOpen] = useState(false);

  const groupLabel = institutionType === "school" ? "Class / Section" : "Cohort / Division";
  const selectedGroupName =
    allGroups.find((g) => g.id === selectedGroupId)?.name || "Select Cohort";

  // Quick Toast Helper
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((cur) => (cur?.text === text ? null : cur));
    }, 4000);
  };

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedIds([]);
    router.push(`/timetable/builder?group_id=${e.target.value}`);
  };

  // Open Assign Modal
  const openAssignModal = (day: DayOfWeek, timeslotId: number) => {
    setModalDay(day);
    setModalTimeslotId(timeslotId);
    setErrorMessage(null);
    setModalType("lecture");
    setModalOpen(true);
  };

  // Submit Slot (Lecture or Break)
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const payload: any = {
        group_id: selectedGroupId,
        day: modalDay,
        timeslot_id: modalTimeslotId,
        is_break: modalType === "break",
      };

      if (modalType === "break") {
        // Find or let backend find BREAK subject
        const breakSub = allSubjects.find(
          (s) => s.code === "BREAK" || s.name.toLowerCase().includes("break")
        );
        payload.subject_id = breakSub?.id || allSubjects[0]?.id;
        payload.faculty_id = allFaculty[0]?.id;
        payload.room_id = allRooms[0]?.id;
        payload.break_title = breakLabel;
      } else {
        payload.subject_id = formSubjectId;
        payload.faculty_id = formFacultyId;
        payload.room_id = formRoomId;
      }

      const res = await fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to schedule slot");
        setLoading(false);
        return;
      }

      // Optimistic update
      const newEntry = data.entry;
      setMatrix((prev) => {
        const copy = { ...prev };
        if (!copy[modalDay]) copy[modalDay] = {};
        copy[modalDay][modalTimeslotId] = {
          id: newEntry.id,
          group_name: selectedGroupName,
          subject_name: modalType === "break" ? breakLabel : allSubjects.find((s) => s.id === parseInt(formSubjectId, 10))?.name,
          subject_code: modalType === "break" ? "BREAK" : allSubjects.find((s) => s.id === parseInt(formSubjectId, 10))?.code,
          faculty_name: modalType === "break" ? "—" : allFaculty.find((f) => f.id === parseInt(formFacultyId, 10))?.name,
          room_name: modalType === "break" ? "Recess / Dining" : allRooms.find((r) => r.id === parseInt(formRoomId, 10))?.name,
        };
        return copy;
      });

      setModalOpen(false);
      showToast(modalType === "break" ? "Break scheduled successfully!" : "Period scheduled successfully!");
      router.refresh();
    } catch {
      setErrorMessage("Network error scheduling period.");
    } finally {
      setLoading(false);
    }
  };

  // Single Delete
  const handleDeleteSlot = async (id: number, day: string, timeslotId: number) => {
    // Optimistic deletion
    setMatrix((prev) => {
      const copy = { ...prev };
      if (copy[day]) {
        delete copy[day][timeslotId];
      }
      return { ...copy };
    });

    try {
      const res = await fetch(`/api/timetable?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        showToast("Failed to delete slot on server", "error");
        router.refresh();
      } else {
        showToast("Class removed");
      }
    } catch {
      showToast("Network error deleting slot", "error");
      router.refresh();
    }
  };

  // Multi-Selection Toggle
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllForCohort = () => {
    const ids: number[] = [];
    Object.values(matrix).forEach((daySlots) => {
      Object.values(daySlots).forEach((slot) => {
        if (slot?.id) ids.push(slot.id);
      });
    });
    setSelectedIds(ids);
    setIsSelectMode(true);
    showToast(`Selected all ${ids.length} classes for ${selectedGroupName}`);
  };

  // Bulk Delete Selected
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;

    // Optimistic remove
    setMatrix((prev) => {
      const copy = { ...prev };
      Object.keys(copy).forEach((d) => {
        Object.keys(copy[d]).forEach((tsId) => {
          if (copy[d][Number(tsId)] && selectedIds.includes(copy[d][Number(tsId)].id)) {
            delete copy[d][Number(tsId)];
          }
        });
      });
      return { ...copy };
    });

    const idsToDelete = [...selectedIds];
    setSelectedIds([]);

    try {
      const res = await fetch("/api/timetable", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToDelete }),
      });

      if (res.ok) {
        showToast(`Successfully deleted ${count} selected classes!`);
        router.refresh();
      } else {
        showToast("Failed to bulk delete classes", "error");
        router.refresh();
      }
    } catch {
      showToast("Network error during bulk delete", "error");
      router.refresh();
    }
  };

  // Clear Entire Timetable for Cohort
  const handleClearCohort = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/timetable?group_id=${selectedGroupId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMatrix({});
        setSelectedIds([]);
        setClearModalOpen(false);
        showToast(`Cleared entire timetable for ${selectedGroupName}`);
        router.refresh();
      } else {
        showToast("Failed to clear timetable", "error");
      }
    } catch {
      showToast("Network error clearing timetable", "error");
    } finally {
      setLoading(false);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, slot: any, day: DayOfWeek, timeslotId: number) => {
    setDraggedSlot({
      id: slot.id,
      fromDay: day,
      fromTimeslotId: timeslotId,
      data: slot,
    });
    e.dataTransfer.setData("text/plain", slot.id.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, day: DayOfWeek, timeslotId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (
      !dragOverCell ||
      dragOverCell.day !== day ||
      dragOverCell.timeslotId !== timeslotId
    ) {
      setDragOverCell({ day, timeslotId });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCell(null);
  };

  const handleDrop = async (e: React.DragEvent, toDay: DayOfWeek, toTimeslotId: number) => {
    e.preventDefault();
    setDragOverCell(null);

    if (!draggedSlot) return;

    const { id: draggedId, fromDay, fromTimeslotId, data: sourceData } = draggedSlot;
    setDraggedSlot(null);

    // If dropped onto the exact same cell, do nothing
    if (fromDay === toDay && fromTimeslotId === toTimeslotId) return;

    const targetSlot = matrix[toDay]?.[toTimeslotId];

    // Optimistic UI Swap / Move
    setMatrix((prev) => {
      const next = { ...prev };
      if (!next[toDay]) next[toDay] = {};
      if (!next[fromDay]) next[fromDay] = {};

      if (targetSlot) {
        // Swap
        next[fromDay][fromTimeslotId] = targetSlot;
        next[toDay][toTimeslotId] = sourceData;
      } else {
        // Move to empty
        delete next[fromDay][fromTimeslotId];
        next[toDay][toTimeslotId] = sourceData;
      }
      return { ...next };
    });

    try {
      const payload: any = {
        id: draggedId,
        day: toDay,
        timeslot_id: toTimeslotId,
      };
      if (targetSlot) {
        payload.swap_with_id = targetSlot.id;
      }

      const res = await fetch("/api/timetable", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        // Revert optimistic move on conflict
        showToast(resData.error || "Cannot move class due to clash", "error");
        router.refresh();
      } else {
        showToast(
          targetSlot
            ? `Swapped classes between ${fromDay} and ${toDay}`
            : `Moved class to ${toDay} (${timeslots.find((t) => t.id === toTimeslotId)?.label})`
        );
      }
    } catch {
      showToast("Network error while moving class", "error");
      router.refresh();
    }
  };

  // Export Timetable to Excel
  const handleExportExcel = () => {
    const wsData: any[][] = [];

    // Header row
    const header = [
      "Day",
      ...timeslots.map((ts) => `${ts.label} (${ts.start_time} - ${ts.end_time})`),
    ];
    wsData.push(header);

    // Rows
    for (const d of DAYS_OF_WEEK) {
      const row: string[] = [d];
      for (const ts of timeslots) {
        const slot = matrix[d]?.[ts.id];
        if (slot) {
          row.push(`${slot.subject_name} (${slot.subject_code})\n${slot.faculty_name || ""}\n${slot.room_name || ""}`);
        } else {
          row.push("—");
        }
      }
      wsData.push(row);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Timetable");
    XLSX.writeFile(wb, `${selectedGroupName.replace(/[^a-zA-Z0-9_-]/g, "_")}_timetable.xlsx`);
  };

  // Helper: check if a subject is a Break
  const isBreakSlot = (slot: any) => {
    return (
      slot?.subject_code === "BREAK" ||
      slot?.subject_name?.toLowerCase().includes("break") ||
      slot?.subject_name?.toLowerCase().includes("recess")
    );
  };

  return (
    <div className="space-y-6 relative pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-lg shadow-xl border text-xs font-semibold flex items-center gap-2.5 transition-all animate-in slide-in-from-top-4 duration-200 ${
            toastMessage.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {toastMessage.type === "error" ? (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Filter and Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Cohort Selector */}
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

          <div className="hidden sm:inline-flex items-center text-xs text-slate-500">
            • <span className="ml-1.5">Weekly matrix for <strong className="text-slate-800">{selectedGroupName}</strong></span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Multi-Select Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsSelectMode(!isSelectMode);
              if (isSelectMode) setSelectedIds([]);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
              isSelectMode
                ? "bg-[#2F5D8A] text-white border-[#2F5D8A] shadow-xs"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
            }`}
            title="Toggle selection mode to select multiple tiles"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{isSelectMode ? "Selection Active" : "Multi-Select"}</span>
          </button>

          {/* Quick Select All */}
          {isSelectMode && (
            <button
              type="button"
              onClick={selectAllForCohort}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
            >
              <span>Select All</span>
            </button>
          )}

          {/* Lunch Break Column Toggle */}
          <button
            type="button"
            onClick={() => setShowLunchColumn(!showLunchColumn)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
              showLunchColumn
                ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
            }`}
            title="Toggle visual Lunch Break interval between Period 4 and Period 5"
          >
            <Coffee className="w-3.5 h-3.5 text-amber-600" />
            <span>Lunch Break: {showLunchColumn ? "ON" : "OFF"}</span>
          </button>

          {/* Export to Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-all cursor-pointer shadow-2xs"
            title="Export this schedule to Excel sheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel Export</span>
          </button>

          {/* Clear Timetable Button */}
          <button
            type="button"
            onClick={() => setClearModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer"
            title="Clear all scheduled classes for this cohort"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
            <span>Clear Timetable</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Hint Banner */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50/80 border border-slate-200/80 rounded-lg text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <GripVertical className="w-3.5 h-3.5 text-slate-400" />
          <span>
            <strong>Drag &amp; Drop:</strong> Grab any card to move it to an empty slot or drop onto another class to swap!
          </span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-slate-400">
          <span>Click <strong className="text-slate-600">+ Assign</strong> to schedule lectures or breaks</span>
        </div>
      </div>

      {/* Main Timetable Grid */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs min-w-[960px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3.5 px-4 w-[110px] border-r border-slate-200 bg-slate-100/70">
                  Day
                </th>
                {timeslots.map((ts, idx) => {
                  const isPostPeriod4 = idx === 4; // Between Period 4 and Period 5
                  return (
                    <React.Fragment key={ts.id}>
                      {isPostPeriod4 && showLunchColumn && (
                        <th className="py-2.5 px-2 text-center border-r border-amber-200/90 bg-amber-50/90 text-amber-900 w-[70px]">
                          <div className="font-bold flex items-center justify-center gap-1 text-[10px]">
                            <Coffee className="w-3 h-3 text-amber-700" />
                            <span>LUNCH</span>
                          </div>
                          <div className="text-[9px] font-normal text-amber-700 mt-0.5">
                            12:35 - 1:25
                          </div>
                        </th>
                      )}
                      <th className="py-3 px-3 text-center border-r border-slate-200 last:border-r-0 min-w-[135px]">
                        <div className="font-bold text-slate-800">{ts.label}</div>
                        <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                          {formatTimeDisplay(ts.start_time)} - {formatTimeDisplay(ts.end_time)}
                        </div>
                      </th>
                    </React.Fragment>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {DAYS_OF_WEEK.map((day) => (
                <tr key={day} className="hover:bg-slate-50/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800 bg-slate-50/60 border-r border-slate-200 align-middle">
                    {day}
                  </td>
                  {timeslots.map((ts, idx) => {
                    const isPostPeriod4 = idx === 4;
                    const slot = matrix[day]?.[ts.id];
                    const isSelected = slot && selectedIds.includes(slot.id);
                    const isDragOver =
                      dragOverCell &&
                      dragOverCell.day === day &&
                      dragOverCell.timeslotId === ts.id;
                    const isBreak = slot && isBreakSlot(slot);

                    return (
                      <React.Fragment key={ts.id}>
                        {/* Lunch Break Column Divider */}
                        {isPostPeriod4 && showLunchColumn && (
                          <td className="p-1 border-r border-amber-200/80 bg-amber-50/40 text-center align-middle">
                            <div className="h-full py-6 flex flex-col items-center justify-center text-amber-700/80 text-[10px] font-medium tracking-widest select-none">
                              <span className="[writing-mode:vertical-lr] rotate-180 uppercase text-[9px] tracking-wider text-amber-800 font-semibold">
                                RECESS
                              </span>
                            </div>
                          </td>
                        )}

                        {/* Schedule Cell (Drop Zone) */}
                        <td
                          onDragOver={(e) => handleDragOver(e, day, ts.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, day, ts.id)}
                          className={`p-2 border-r border-slate-200 last:border-r-0 align-top h-[105px] w-[145px] transition-all relative ${
                            isDragOver
                              ? "bg-blue-100/60 border-2 border-dashed border-[#2F5D8A]"
                              : ""
                          }`}
                        >
                          {slot ? (
                            <div
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, slot, day, ts.id)}
                              onClick={() => {
                                if (isSelectMode) toggleSelect(slot.id);
                              }}
                              className={`h-full rounded-lg p-2.5 flex flex-col justify-between group relative transition-all cursor-grab active:cursor-grabbing select-none shadow-2xs ${
                                isBreak
                                  ? "bg-amber-50/90 border border-amber-200 text-amber-900"
                                  : isSelected
                                  ? "bg-blue-100 border-2 border-[#2F5D8A] shadow-md ring-2 ring-blue-400/40"
                                  : "bg-[#EBF3FA] border border-blue-200/90 hover:border-[#2F5D8A]/60 hover:shadow-xs"
                              }`}
                            >
                              {/* Drag Handle & Selection Indicator */}
                              <div className="flex items-start justify-between gap-1">
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                  {isSelectMode ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSelect(slot.id);
                                      }}
                                      className="text-slate-500 hover:text-[#2F5D8A] shrink-0"
                                    >
                                      {isSelected ? (
                                        <CheckSquare className="w-3.5 h-3.5 text-[#2F5D8A]" />
                                      ) : (
                                        <Square className="w-3.5 h-3.5 text-slate-400" />
                                      )}
                                    </button>
                                  ) : (
                                    <GripVertical className="w-3 h-3 text-slate-400/70 group-hover:text-slate-600 shrink-0" />
                                  )}

                                  <div className="overflow-hidden">
                                    <div
                                      className="font-bold text-slate-800 text-[11px] truncate leading-tight"
                                      title={slot.subject_name}
                                    >
                                      {slot.subject_name}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono font-medium flex items-center gap-1 mt-0.5">
                                      {isBreak ? (
                                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                                          BREAK
                                        </span>
                                      ) : (
                                        <span>{slot.subject_code}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Single Delete Button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSlot(slot.id, day, ts.id);
                                  }}
                                  title="Delete Period"
                                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Footer details */}
                              <div className="text-[10px] text-slate-600 border-t border-slate-200/60 pt-1 mt-1 truncate">
                                {isBreak ? (
                                  <div className="text-amber-800 font-medium flex items-center gap-1">
                                    <Coffee className="w-3 h-3 text-amber-600" />
                                    <span>Recess Interval</span>
                                  </div>
                                ) : (
                                  <>
                                    <div className="truncate font-medium">{slot.faculty_name}</div>
                                    <div className="text-slate-400 truncate text-[9px]">{slot.room_name}</div>
                                  </>
                                )}
                              </div>
                            </div>
                          ) : (
                            /* Empty Cell: Assign Button */
                            <button
                              type="button"
                              onClick={() => openAssignModal(day, ts.id)}
                              className="w-full h-full rounded-lg border border-dashed border-slate-200 hover:border-[#2F5D8A] hover:bg-[#EBF3FA]/50 text-slate-400 hover:text-[#2F5D8A] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-[11px] font-medium group"
                            >
                              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              <span>Assign</span>
                            </button>
                          )}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Multi-Select Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 text-white backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-slate-700 flex items-center gap-5 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-5 h-5 rounded-full bg-[#2F5D8A] text-white flex items-center justify-center text-[10px]">
              {selectedIds.length}
            </span>
            <span>Classes Selected</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Bulk Delete Button */}
          <button
            type="button"
            onClick={handleBulkDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected ({selectedIds.length})</span>
          </button>

          {/* Deselect All */}
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Deselect All
          </button>
        </div>
      )}

      {/* Clear Timetable Confirmation Modal */}
      {clearModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-[440px] p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Clear Entire Timetable?</h3>
                <p className="text-xs text-slate-500 mt-0.5">This action will remove all scheduled periods for {selectedGroupName}.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200">
              Are you sure you want to proceed? This will immediately clear all Monday–Saturday allocations for this cohort so you can start fresh or rebuild.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setClearModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearCohort}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-md hover:bg-rose-700 disabled:opacity-60 cursor-pointer shadow-sm"
              >
                {loading ? "Clearing..." : "Yes, Clear Timetable"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Period Assignment Modal (Lecture vs Break) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-[480px] p-6 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Schedule Period Assignment</h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {selectedGroupName} • {modalDay} •{" "}
                  {timeslots.find((t) => t.id === modalTimeslotId)?.label} (
                  {formatTimeDisplay(timeslots.find((t) => t.id === modalTimeslotId)?.start_time || "")})
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab: Class Lecture vs Break / Recess */}
            <div className="flex items-center p-1 bg-slate-100 rounded-lg mb-4">
              <button
                type="button"
                onClick={() => {
                  setModalType("lecture");
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  modalType === "lecture"
                    ? "bg-white text-[#2F5D8A] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Academic Lecture / Lab</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalType("break");
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  modalType === "break"
                    ? "bg-white text-amber-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Coffee className="w-3.5 h-3.5 text-amber-600" />
                <span>Break / Recess</span>
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              {modalType === "lecture" ? (
                <>
                  {/* Subject */}
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
                      {allSubjects
                        .filter((s) => s.code !== "BREAK")
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Faculty */}
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

                  {/* Room */}
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
                </>
              ) : (
                /* Break Form */
                <div className="space-y-3 bg-amber-50/50 p-4 rounded-xl border border-amber-200/80">
                  <div className="text-xs text-amber-900 font-semibold flex items-center gap-1.5">
                    <Coffee className="w-4 h-4 text-amber-700" />
                    <span>Select Break / Interval Type:</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "Lunch Break",
                      "Morning Recess",
                      "Tea & Snacks",
                      "Short Break",
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setBreakLabel(preset)}
                        className={`p-2 rounded-lg text-xs font-medium border text-left transition-all cursor-pointer ${
                          breakLabel === preset
                            ? "bg-amber-100 border-amber-400 text-amber-950 font-bold"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Custom Break Label:
                    </label>
                    <input
                      type="text"
                      value={breakLabel}
                      onChange={(e) => setBreakLabel(e.target.value)}
                      placeholder="e.g. Lunch Break"
                      className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 bg-white focus:outline-none focus:border-[#2F5D8A]"
                    />
                  </div>
                  <p className="text-[11px] text-amber-800/80 italic">
                    Note: Breaks bypass room and faculty clash checks so students can enjoy interval time without locking resources.
                  </p>
                </div>
              )}

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
                  {loading
                    ? "Saving..."
                    : modalType === "break"
                    ? "Confirm Break"
                    : "Confirm Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
