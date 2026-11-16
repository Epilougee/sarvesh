"use client";

import { GraduationCap, School, ArrowRightLeft } from "lucide-react";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface TopbarProps {
  title: string;
  institutionType?: "college" | "school";
  children?: React.ReactNode;
}

export function Topbar({ title, institutionType = "college", children }: TopbarProps) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  const handleToggleMode = async () => {
    const nextMode = institutionType === "college" ? "school" : "college";
    setSwitching(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institution_type: nextMode }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to switch mode:", err);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <header className="h-[58px] bg-white border-b border-slate-200 px-7 flex items-center justify-between sticky top-0 z-40 relative overflow-hidden">
      {/* Decorative concentric circles behind right actions */}
      <div
        className="absolute right-[120px] -top-[60px] w-[180px] h-[180px] rounded-full border border-[rgba(47,93,138,0.12)] bg-[rgba(47,93,138,0.04)] pointer-events-none z-0"
        aria-hidden="true"
      />
      <div
        className="absolute right-[150px] -top-[30px] w-[120px] h-[120px] rounded-full border border-[rgba(47,93,138,0.12)] bg-[rgba(47,93,138,0.04)] pointer-events-none z-0"
        aria-hidden="true"
      />

      {/* Left Title */}
      <div className="flex items-center gap-4 relative z-10">
        <h1 className="text-lg font-bold text-slate-800">{title}</h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 relative z-10">
        <button
          onClick={handleToggleMode}
          disabled={switching}
          title={`Click to switch to ${institutionType === "college" ? "School" : "College"} Mode`}
          className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#EBF3FA] hover:bg-[#DCEBF7] text-[#2F5D8A] border border-[rgba(47,93,138,0.2)] transition-all cursor-pointer shadow-2xs disabled:opacity-60"
        >
          {institutionType === "school" ? (
            <School className="w-3.5 h-3.5 text-[#3A9D6E]" />
          ) : (
            <GraduationCap className="w-3.5 h-3.5" />
          )}
          <span className="capitalize">{institutionType} Mode</span>
          <ArrowRightLeft className="w-3 h-3 text-[#2F5D8A]/60 group-hover:text-[#2F5D8A] transition-transform group-hover:rotate-180 duration-200" />
        </button>
        {children}
      </div>
    </header>
  );
}
