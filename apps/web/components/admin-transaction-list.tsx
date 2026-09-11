"use client";

import { AdminTransaction, api } from "../lib/api";
import { ConfirmAction } from "./confirm-action";
import { RiskBadge, StatusBadge } from "./status-badge";

interface AdminTransactionListProps {
  items: AdminTransaction[];
  reviewable?: boolean;
  onUpdated?: () => void;
}

export function AdminTransactionList({
  items,
  reviewable = false,
  onUpdated,
}: AdminTransactionListProps) {
  const reviewActions = (item: AdminTransaction) => (
    <div className="flex flex-wrap items-center gap-3">
      <ConfirmAction
        label="Approve"
        message="Complete this held transfer?"
        onConfirm={async () => {
          await api.approveHeldTransaction(item.id);
          onUpdated?.();
        }}
      />
      <ConfirmAction
        label="Reject"
        tone="red"
        message="Reject this held transfer?"
        onConfirm={async () => {
          await api.rejectHeldTransaction(item.id);
          onUpdated?.();
        }}
      />
    </div>
  );

  return (
    <div className="mt-5 overflow-hidden rounded-[22px] bg-white shadow-sm ring-1 ring-slate-200">
      <div className="divide-y divide-slate-100 md:hidden">
        {items.map((item) => (
          <article key={item.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Sender / receiver
                </p>
                <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-900">
                  {item.sourceAccount.accountNumber}
                </p>
                <p className="mt-1 break-all font-mono text-xs text-slate-500">
                  → {item.destinationAccount.accountNumber}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
              <div>
                <dt className="text-slate-500">Amount</dt>
                <dd className="mt-1 break-words font-bold text-slate-900">
                  {item.amount}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Risk</dt>
                <dd className="mt-1">
                  {item.fraudAssessment ? (
                    <RiskBadge
                      level={item.fraudAssessment.riskLevel}
                      score={item.fraudAssessment.riskScore}
                    />
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500">Date</dt>
                <dd className="mt-1 text-slate-700">
                  {new Date(item.createdAt).toLocaleString()}
                </dd>
              </div>
            </dl>
            {reviewable && <div className="mt-4">{reviewActions(item)}</div>}
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="p-4">Sender / receiver</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Risk</th>
              <th className="p-4">Status</th>
              <th className="p-4">Date</th>
              {reviewable && <th className="p-4">Review</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-t border-slate-100 transition hover:bg-slate-50"
              >
                <td className="p-4">
                  <p className="font-medium text-slate-900">
                    {item.sourceAccount.accountNumber}
                  </p>
                  <p className="mt-1 text-slate-500">
                    → {item.destinationAccount.accountNumber}
                  </p>
                </td>
                <td className="p-4 font-semibold text-slate-900">
                  {item.amount}
                </td>
                <td className="p-4">
                  {item.fraudAssessment ? (
                    <RiskBadge
                      level={item.fraudAssessment.riskLevel}
                      score={item.fraudAssessment.riskScore}
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-4">
                  <StatusBadge status={item.status} />
                </td>
                <td className="p-4 text-slate-500">
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>
                {reviewable && <td className="p-4">{reviewActions(item)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
