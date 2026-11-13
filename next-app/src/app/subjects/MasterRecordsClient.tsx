"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X, AlertCircle } from "lucide-react";

interface RecordItem {
  id: number;
  name?: string;
  code?: string;
  capacity?: number;
  label?: string;
  start_time?: string;
  end_time?: string;
}

interface MasterRecordsClientProps {
  entityType: "subject" | "group" | "room" | "timeslot";
  initialItems: RecordItem[];
  title: string;
  singularTitle: string;
}

export function MasterRecordsClient({
  entityType,
  initialItems,
  title,
  singularTitle,
}: MasterRecordsClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [capacity, setCapacity] = useState("40");
  const [label, setLabel] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:50");

  const endpoint = `/api/${entityType === "group" ? "groups" : entityType + "s"}`;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: any = {};
    if (entityType === "subject") {
      payload.name = name;
      payload.code = code;
    } else if (entityType === "group") {
      payload.name = name;
    } else if (entityType === "room") {
      payload.name = name;
      payload.capacity = capacity;
    } else if (entityType === "timeslot") {
      payload.label = label;
      payload.start_time = startTime;
      payload.end_time = endTime;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create record");
        setLoading(false);
        return;
      }

      setModalOpen(false);
      setName("");
      setCode("");
      router.refresh();
    } catch {
      setError("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`Are you sure you want to delete this ${singularTitle.toLowerCase()}?`)) return;

    try {
      const res = await fetch(`${endpoint}?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete");
      }
    } catch {
      alert("Network error");
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total of {initialItems.length} registered {title.toLowerCase()} in database.
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#2F5D8A] text-white text-xs font-semibold hover:bg-[#244A70] transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add {singularTitle}</span>
        </button>
      </div>

      {initialItems.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                {entityType === "subject" && (
                  <>
                    <th className="py-3 px-4">Subject Name</th>
                    <th className="py-3 px-4">Code</th>
                  </>
                )}
                {entityType === "group" && <th className="py-3 px-4">Name / Title</th>}
                {entityType === "room" && (
                  <>
                    <th className="py-3 px-4">Room / Lab</th>
                    <th className="py-3 px-4">Capacity</th>
                  </>
                )}
                {entityType === "timeslot" && (
                  <>
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Time Interval</th>
                  </>
                )}
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  {entityType === "subject" && (
                    <>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{item.name}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] font-bold text-slate-700">
                          {item.code}
                        </span>
                      </td>
                    </>
                  )}
                  {entityType === "group" && (
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{item.name}</td>
                  )}
                  {entityType === "room" && (
                    <>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{item.name}</td>
                      <td className="py-3.5 px-4 text-slate-600">{item.capacity} seats</td>
                    </>
                  )}
                  {entityType === "timeslot" && (
                    <>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{item.label}</td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {item.start_time} - {item.end_time}
                      </td>
                    </>
                  )}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 text-center text-slate-400 text-xs">No records found. Click above to add one.</div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-[420px] p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 text-sm">Add New {singularTitle}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              {(entityType === "subject" || entityType === "group" || entityType === "room") && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {singularTitle} Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder={`e.g. ${
                      entityType === "subject"
                        ? "Algorithms"
                        : entityType === "group"
                        ? "BCA Sem 3 A"
                        : "Lab 101"
                    }`}
                    className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#2F5D8A]"
                  />
                </div>
              )}

              {entityType === "subject" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Course Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    placeholder="e.g. CS301"
                    className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#2F5D8A]"
                  />
                </div>
              )}

              {entityType === "room" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#2F5D8A]"
                  />
                </div>
              )}

              {entityType === "timeslot" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Period Label</label>
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      required
                      placeholder="e.g. Period 1"
                      className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#2F5D8A]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                        className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#2F5D8A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                        className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#2F5D8A]"
                      />
                    </div>
                  </div>
                </>
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
                  {loading ? "Saving..." : "Create Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
