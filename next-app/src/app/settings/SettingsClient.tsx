"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Sliders, GraduationCap, School } from "lucide-react";

export function SettingsClient({ initialType }: { initialType: "college" | "school" }) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<"college" | "school">(initialType);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institution_type: selectedType }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl bg-white border border-slate-200 rounded-xl p-7 shadow-xs space-y-6">
      <div>
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-500" />
          <span>Institution Mode Configuration</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Adjust the organizational terminology used across cohorts, scheduling views, and filters.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* College Mode */}
        <div
          onClick={() => setSelectedType("college")}
          className={`p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
            selectedType === "college"
              ? "border-[#2F5D8A] bg-[#EBF3FA]/40 shadow-xs"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-[#2F5D8A] text-white flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            {selectedType === "college" && (
              <div className="w-5 h-5 rounded-full bg-[#2F5D8A] text-white flex items-center justify-center">
                <Check className="w-3 h-3" />
              </div>
            )}
          </div>
          <div>
            <div className="font-bold text-slate-800 text-sm">College / University Mode</div>
            <p className="text-xs text-slate-500 mt-1">
              Uses <em>Cohorts & Divisions</em> (e.g. B.Tech CSE Sem 5 A) and professorial designations.
            </p>
          </div>
        </div>

        {/* School Mode */}
        <div
          onClick={() => setSelectedType("school")}
          className={`p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
            selectedType === "school"
              ? "border-[#2F5D8A] bg-[#EBF3FA]/40 shadow-xs"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-[#3A9D6E] text-white flex items-center justify-center">
              <School className="w-5 h-5" />
            </div>
            {selectedType === "school" && (
              <div className="w-5 h-5 rounded-full bg-[#2F5D8A] text-white flex items-center justify-center">
                <Check className="w-3 h-3" />
              </div>
            )}
          </div>
          <div>
            <div className="font-bold text-slate-800 text-sm">School Mode</div>
            <p className="text-xs text-slate-500 mt-1">
              Uses <em>Classes & Sections</em> (e.g. Grade 9-A) and period-based school terminology.
            </p>
          </div>
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between border-t border-slate-100">
        <div>
          {saved && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Settings updated successfully!
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-5 py-2 rounded-md bg-[#2F5D8A] text-white text-xs font-semibold hover:bg-[#244A70] transition-all shadow-sm disabled:opacity-60 cursor-pointer"
        >
          {loading ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}

