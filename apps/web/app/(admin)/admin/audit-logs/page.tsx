"use client";
import { useEffect, useState } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../../components/page-state";
import { api, AuditLog } from "../../../../lib/api";
export default function AuditLogsPage() {
  const [items, setItems] = useState<AuditLog[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .adminAuditLogs()
      .then((result) => setItems(result.data))
      .catch((reason: Error) => setError(reason.message));
  }, []);
  if (error) return <ErrorState message={error} />;
  if (!items) return <LoadingState />;
  return (
    <section>
      <h2 className="text-xl font-bold">Audit logs</h2>
      <div className="mt-5 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
        {items.map((item) => {
          const reason =
            typeof item.metadata?.reason === "string"
              ? item.metadata.reason
              : "";
          return (
            <div
              key={item.id}
              className="grid gap-2 border-b border-slate-100 p-4 text-sm last:border-0 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]"
            >
              <span>
                <b>{item.action.replaceAll("_", " ")}</b>
                {reason && (
                  <small className="mt-1 block text-xs font-normal text-slate-500">
                    Reason: {reason}
                  </small>
                )}
              </span>
              <span className="break-all text-slate-600">
                {item.user?.email ?? "System"} · {item.entityType}
              </span>
              <span className="text-xs text-slate-500 sm:col-span-2 xl:col-span-1 xl:text-sm">
                {new Date(item.createdAt).toLocaleString()}
              </span>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="p-5">
            <EmptyState message="No audit logs found." />
          </div>
        )}
      </div>
    </section>
  );
}
