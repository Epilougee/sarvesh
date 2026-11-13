"use client";

import { GraduationCap } from "lucide-react";
import React from "react";

interface TopbarProps {
  title: string;
  institutionType?: "college" | "school";
  children?: React.ReactNode;
}

export function Topbar({ title, institutionType = "college", children }: TopbarProps) {
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EBF3FA] text-[#2F5D8A]">
          <GraduationCap className="w-3.5 h-3.5" />
          <span className="capitalize">{institutionType}</span>
        </span>
        {children}
      </div>
    </header>
  );
}
