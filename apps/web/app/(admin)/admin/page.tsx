'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ErrorState, LoadingState } from '../../../components/page-state';
import { Icon, IconName } from '../../../components/icons';
import { api } from '../../../lib/api';

interface Overview { customers: number; transactions: number; held: number; assessments: number; }

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.adminCustomers(), api.adminTransactions(), api.adminHeldTransactions(), api.adminAssessments()])
      .then(([customers, transactions, held, assessments]) => setData({ customers: customers.total, transactions: transactions.total, held: held.total, assessments: assessments.total }))
      .catch((reason: Error) => setError(reason.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState />;

  const cards: { label: string; value: number; href: string; icon: IconName; alert?: boolean }[] = [
    { label: 'Total customers', value: data.customers, href: '/admin/customers', icon: 'users' },
    { label: 'All transactions', value: data.transactions, href: '/admin/transactions', icon: 'receipt' },
    { label: 'Awaiting review', value: data.held, href: '/admin/held', icon: 'clock', alert: data.held > 0 },
    { label: 'Risk assessments', value: data.assessments, href: '/admin/fraud', icon: 'shield' },
  ];

  return (
    <section>
      <div className="rounded-[24px] bg-[#12382e] p-6 text-white sm:flex sm:items-center sm:justify-between sm:p-8">
        <div><p className="text-xs font-semibold text-[#9fc2b7]">System status</p><h2 className="mt-2 text-2xl font-bold tracking-tight">Banking operations are online</h2><p className="mt-2 text-sm text-[#a9c4bc]">Monitor customer activity, transfer reviews, and fraud signals from one place.</p></div>
        <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#d8f85c] px-4 py-2 text-xs font-bold text-[#173c31] sm:mt-0"><span className="h-2 w-2 rounded-full bg-[#087a5b]" />All systems operational</span>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="group rounded-[20px] border border-[#dce5e1] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#a9c8be] hover:shadow-[0_16px_30px_-26px_rgba(6,75,56,.65)]">
            <div className="flex items-center justify-between"><span className={'grid h-10 w-10 place-items-center rounded-xl ' + (card.alert ? 'bg-amber-100 text-amber-700' : 'bg-[#e8f3ef] text-[#087a5b]')}><Icon name={card.icon} className="h-5 w-5" /></span><Icon name="chevron-right" className="h-4 w-4 text-[#a3afab] transition group-hover:translate-x-0.5" /></div>
            <p className="mt-5 text-3xl font-bold tracking-tight text-[#18352e]">{card.value}</p><p className="mt-1 text-xs font-semibold text-[#7a8a85]">{card.label}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
