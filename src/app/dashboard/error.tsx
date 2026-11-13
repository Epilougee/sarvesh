"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error caught by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h1 className="text-lg font-bold text-slate-800">Unable to load dashboard</h1>
        <p className="text-xs text-slate-500 mt-1">
          A server or database query exception occurred while assembling this page.
        </p>

        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-left">
          <div className="text-[11px] font-semibold text-slate-700">Error Details:</div>
          <div className="text-xs font-mono text-rose-700 mt-1 break-all">
            {error?.message || "Unknown error occurred"}
          </div>
          {error?.digest && (
            <div className="text-[10px] text-slate-400 font-mono mt-1">
              Digest: {error.digest}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => reset()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2F5D8A] text-white rounded-md text-xs font-semibold hover:bg-[#244A70] transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 transition-all"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Go to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

