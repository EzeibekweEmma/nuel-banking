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
  return <section><h2 className="text-xl font-bold">Fraud assessments</h2><div className="mt-5 space-y-4">{items.map((item) => <article key={item.id} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{item.transaction.reference}</p><p className="text-sm text-slate-500">{new Date(item.transaction.createdAt).toLocaleString()}</p></div><span className={`rounded-full px-3 py-1 text-sm font-semibold ${item.riskLevel === 'HIGH' ? 'bg-red-100 text-red-700' : item.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.riskLevel} · {item.riskScore}</span></div><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-slate-500">Amount</dt><dd className="font-semibold">{item.transaction.amount}</dd></div><div><dt className="text-slate-500">Sender</dt><dd>{item.transaction.sourceAccount.user.firstName} {item.transaction.sourceAccount.user.lastName} · {item.transaction.sourceAccount.accountNumber}</dd></div><div><dt className="text-slate-500">Receiver</dt><dd>{item.transaction.destinationAccount.user.firstName} {item.transaction.destinationAccount.user.lastName} · {item.transaction.destinationAccount.accountNumber}</dd></div><div><dt className="text-slate-500">Status</dt><dd>{item.transaction.status}</dd></div><div><dt className="text-slate-500">Decision</dt><dd>{item.decision}</dd></div></dl><p className="mt-4 text-sm"><b>Flagging reasons:</b> {item.reasons.length ? item.reasons.join(', ') : 'No flags'}</p></article>)}{items.length === 0 && <EmptyState message="No fraud assessments found." />}</div></section>;
}
