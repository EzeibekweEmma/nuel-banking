"use client";

import { useState } from "react";

interface ConfirmActionProps {
  label: string;
  message: string;
  tone?: "blue" | "red";
  onConfirm: () => Promise<void>;
}

export function ConfirmAction({
  label,
  message,
  tone = "blue",
  onConfirm,
}: ConfirmActionProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function run(): Promise<void> {
    setLoading(true);
    try {
      await onConfirm();
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <span className="basis-full text-xs text-slate-600 min-[420px]:basis-auto">
          {message}
        </span>
        <button
          disabled={loading}
          onClick={() => void run()}
          className={`min-h-9 rounded-lg px-3 py-1 text-xs font-semibold text-white ${tone === "red" ? "bg-red-600" : "bg-blue-700"}`}
        >
          {loading ? "Working…" : "Confirm"}
        </button>
        <button
          disabled={loading}
          onClick={() => setConfirming(false)}
          className="min-h-9 rounded-lg px-2 text-xs text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className={`min-h-9 text-sm font-semibold ${tone === "red" ? "text-red-600" : "text-blue-700"}`}
    >
      {label}
    </button>
  );
}
