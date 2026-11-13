"use client";

import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  variant: "faculty" | "subjects" | "cohorts" | "rooms";
}

const VARIANT_CONFIG = {
  faculty: {
    tint: "#E8F0FA",
    iconColor: "#2F5D8A",
  },
  subjects: {
    tint: "#FDF0E3",
    iconColor: "#D9822B",
  },
  cohorts: {
    tint: "#E6F5EE",
    iconColor: "#3A9D6E",
  },
  rooms: {
    tint: "#EEEAF8",
    iconColor: "#6B5BB5",
  },
};

export function StatCard({ label, value, icon: Icon, variant }: StatCardProps) {
  const config = VARIANT_CONFIG[variant];

  return (
    <div className="bg-white border border-slate-200 rounded-[14px] p-5 flex items-center gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
      {/* Decorative Wave in bottom-right corner */}
      <div
        className="absolute right-0 bottom-0 w-[120px] h-[70px] opacity-70 pointer-events-none z-0"
        style={{
          backgroundColor: config.tint,
          borderTopLeftRadius: "100% 100%",
        }}
      />

      {/* 44px Icon Container */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 relative z-10"
        style={{
          backgroundColor: config.tint,
          color: config.iconColor,
        }}
      >
        <Icon className="w-5 h-5" />
      </div>

      {/* Info */}
      <div className="flex flex-col relative z-10">
        <span className="text-[28px] font-bold text-slate-800 leading-tight">{value}</span>
        <span className="text-sm font-medium text-slate-500 mt-1">{label}</span>
      </div>
    </div>
  );
}
