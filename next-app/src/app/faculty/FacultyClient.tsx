"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X, AlertCircle, Mail, Phone, Building } from "lucide-react";
import { Subject } from "@/lib/types";

interface FacultyItem {
  id: number;
  user_id: number;
  name: string;
  email: string;
  department: string;
  designation: string;
  phone: string | null;
}

interface FacultyClientProps {
  initialFaculty: FacultyItem[];
  allSubjects: Subject[];
}

export function FacultyClient({ initialFaculty, allSubjects }: FacultyClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("Computer Science");
  const [designation, setDesignation] = useState("Assistant Professor");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("password123");
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);

  const handleToggleSubject = (sid: number) => {
    setSelectedSubjects((prev) =>
      prev.includes(sid) ? prev.filter((id) => id !== sid) : [...prev, sid]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/faculty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          department,
          designation,
          phone,
          password,
          subject_ids: selectedSubjects,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create faculty member");
        setLoading(false);
        return;
      }

      setModalOpen(false);
      setName("");
      setEmail("");
      setPhone("");
      setSelectedSubjects([]);
      router.refresh();
    } catch {
      setError("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this faculty profile and account?")) return;

    try {
      const res = await fetch(`/api/faculty?id=${id}`, { method: "DELETE" });
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
          <h2 className="text-base font-bold text-slate-800">Faculty Members</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total of {initialFaculty.length} registered faculty members and instructors.
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
          <span>Add Faculty Member</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Name / Title</th>
              <th className="py-3 px-4">Contact</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Designation</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {initialFaculty.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50/60">
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-slate-800">{f.name}</div>
                </td>
                <td className="py-3.5 px-4 text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{f.email}</span>
                  </div>
                  {f.phone && (
                    <div className="flex items-center gap-1.5 text-slate-400 mt-0.5 text-[11px]">
                      <Phone className="w-3 h-3" />
                      <span>{f.phone}</span>
                    </div>
                  )}
                </td>
                <td className="py-3.5 px-4 text-slate-700">
                  <span className="inline-flex items-center gap-1">
                    <Building className="w-3 h-3 text-slate-400" />
                    {f.department}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-600">{f.designation}</td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => handleDelete(f.id)}
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-[500px] p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 text-sm">Add Faculty Profile</h3>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Dr. Ramesh Sharma"
                    className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#2F5D8A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@campus.edu"
                    className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#2F5D8A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#2F5D8A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#2F5D8A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone (Optional)</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9823011223"
                    className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#2F5D8A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Default Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#2F5D8A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Qualified Subjects
                </label>
                <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-md p-2 space-y-1">
                  {allSubjects.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSubjects.includes(s.id)}
                        onChange={() => handleToggleSubject(s.id)}
                        className="rounded text-[#2F5D8A]"
                      />
                      <span>
                        {s.name} ({s.code})
                      </span>
                    </label>
                  ))}
                </div>
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
                  {loading ? "Saving..." : "Create Faculty"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
