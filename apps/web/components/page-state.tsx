export function LoadingState() { return <p className="animate-pulse text-sm text-slate-500">Loading your information…</p>; }
export function EmptyState({ message }: { message: string }) { return <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{message}</div>; }
export function ErrorState({ message }: { message: string }) { return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}</div>; }
