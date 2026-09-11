const statusStyles: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  FROZEN: "bg-blue-100 text-blue-800",
  CLOSED: "bg-slate-200 text-slate-700",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  HELD: "bg-amber-100 text-amber-800",
  PENDING: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
  FAILED: "bg-red-100 text-red-800",
};
const riskStyles: Record<string, string> = {
  LOW: "bg-emerald-100 text-emerald-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-red-100 text-red-800",
};
export function StatusBadge({
  status,
  compact = false,
}: {
  status: string;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex rounded-full font-semibold ${compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"} ${statusStyles[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
export function RiskBadge({ level, score }: { level: string; score?: number }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${riskStyles[level] ?? "bg-slate-100 text-slate-700"}`}
    >
      {level}
      {score === undefined ? "" : ` · ${score}`}
    </span>
  );
}
