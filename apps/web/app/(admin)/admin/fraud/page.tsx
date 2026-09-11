'use client';
import { useEffect, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '../../../../components/page-state';
import { api, FraudAssessment } from '../../../../lib/api';

export default function FraudPage() {
  const [items, setItems] = useState<FraudAssessment[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api.adminAssessments().then((result) => setItems(result.data)).catch((reason: Error) => setError(reason.message)); }, []);
  if (error) return <ErrorState message={error} />;
  if (!items) return <LoadingState />;
  return <section><h2 className="text-xl font-bold">Fraud assessments</h2><div className="mt-5 space-y-4">{items.map((item) => <article key={item.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5"><div className="flex flex-wrap justify-between gap-3"><div className="min-w-0"><p className="break-all font-semibold">{item.transaction.reference}</p><p className="mt-1 text-xs text-slate-500 sm:text-sm">{new Date(item.transaction.createdAt).toLocaleString()}</p></div><span className={`h-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold sm:text-sm ${item.riskLevel === 'HIGH' ? 'bg-red-100 text-red-700' : item.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.riskLevel} · {item.riskScore}</span></div><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3"><div><dt className="text-slate-500">Amount</dt><dd className="break-words font-semibold">{item.transaction.amount}</dd></div><div><dt className="text-slate-500">Sender</dt><dd className="break-words">{item.transaction.sourceAccount.user.firstName} {item.transaction.sourceAccount.user.lastName} · {item.transaction.sourceAccount.accountNumber}</dd></div><div><dt className="text-slate-500">Receiver</dt><dd className="break-words">{item.transaction.destinationAccount.user.firstName} {item.transaction.destinationAccount.user.lastName} · {item.transaction.destinationAccount.accountNumber}</dd></div><div><dt className="text-slate-500">Status</dt><dd>{item.transaction.status}</dd></div><div><dt className="text-slate-500">Decision</dt><dd>{item.decision}</dd></div></dl><p className="mt-4 break-words text-sm"><b>Flagging reasons:</b> {item.reasons.length ? item.reasons.join(', ') : 'No flags'}</p></article>)}{items.length === 0 && <EmptyState message="No fraud assessments found." />}</div></section>;
}
