'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BalanceCard } from '../../../components/balance-card';
import { Icon, IconName } from '../../../components/icons';
import { ErrorState, LoadingState } from '../../../components/page-state';
import { TransactionRow } from '../../../components/transaction-row';
import { Account, api, Transaction } from '../../../lib/api';
import { formatMoney } from '../../../lib/format';

const actions: { label: string; hint: string; href: string; icon: IconName }[] = [
  { label: 'Send money', hint: 'Fast bank transfer', href: '/transfer', icon: 'arrow-up-right' },
  { label: 'Beneficiaries', hint: 'Manage recipients', href: '/beneficiaries', icon: 'users' },
  { label: 'Transactions', hint: 'View all activity', href: '/transactions', icon: 'receipt' },
];

export default function DashboardPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.account(), api.transactions()])
      .then(([nextAccount, nextTransactions]) => {
        setAccount(nextAccount);
        setTransactions(nextTransactions);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const monthSummary = useMemo(() => {
    const now = new Date();
    const currentMonth = transactions.filter((item) => {
      const date = new Date(item.createdAt);
      return item.status === 'COMPLETED' && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    return { total: currentMonth.reduce((sum, item) => sum + Number(item.amount), 0), count: currentMonth.length };
  }, [transactions]);

  if (error) return <ErrorState message={error} />;
  if (!account) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,.6fr)]">
        <BalanceCard account={account} />
        <section className="rounded-[28px] border border-[#dce5e1] bg-white p-6 shadow-[0_12px_40px_-32px_rgba(13,56,45,.45)]">
          <div className="flex items-center justify-between">
            <div><p className="text-xs font-semibold text-[#71817d]">This month</p><h2 className="mt-1 text-lg font-bold text-[#18352e]">Money sent</h2></div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf7f3] text-[#087a5b]"><Icon name="arrow-up-right" className="h-5 w-5" /></span>
          </div>
          <p className="mt-7 text-3xl font-bold tracking-[-0.035em] text-[#18352e]">{formatMoney(monthSummary.total, account.currency)}</p>
          <p className="mt-1 text-xs text-[#7a8a86]">Across {monthSummary.count} successful {monthSummary.count === 1 ? 'transfer' : 'transfers'}</p>
          <div className="mt-7 border-t border-[#e7ece9] pt-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#47615a]"><Icon name="shield" className="h-4 w-4 text-[#087a5b]" />Fraud monitoring is active</div>
            <p className="mt-2 text-xs leading-5 text-[#84918e]">Every transfer is checked in real time to keep your account safe.</p>
          </div>
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-bold text-[#18352e]">Quick actions</h2></div>
        <div className="grid gap-3 sm:grid-cols-3">
          {actions.map((action, index) => (
            <Link key={action.href} href={action.href} className="group flex items-center gap-4 rounded-2xl border border-[#dce5e1] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#a9c8be] hover:shadow-[0_14px_30px_-24px_rgba(6,75,56,.6)]">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${index === 0 ? 'bg-[#d8f85c] text-[#143c31]' : 'bg-[#edf4f1] text-[#087a5b]'}`}><Icon name={action.icon} className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-[#18352e]">{action.label}</span><span className="mt-0.5 block text-xs text-[#7b8b87]">{action.hint}</span></span>
              <Icon name="chevron-right" className="h-4 w-4 text-[#a1aeaa] transition group-hover:translate-x-0.5 group-hover:text-[#087a5b]" />
            </Link>
          ))}
        </div>
      </section>

      <div>
        <section className="rounded-[24px] border border-[#dce5e1] bg-white p-4 shadow-[0_12px_40px_-34px_rgba(13,56,45,.45)] sm:p-5">
          <div className="flex items-center justify-between px-2 pb-2">
            <div><h2 className="text-base font-bold text-[#18352e]">Recent activity</h2><p className="mt-1 text-xs text-[#82908d]">Your latest money movements</p></div>
            <Link href="/transactions" className="rounded-lg px-2 py-1 text-xs font-bold text-[#087a5b] hover:bg-[#edf7f3]">View all</Link>
          </div>
          <div className="mt-2 divide-y divide-[#edf1ef]">
            {transactions.slice(0, 5).map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} currency={account.currency} />)}
            {transactions.length === 0 && <div className="grid min-h-48 place-items-center text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#edf4f1] text-[#087a5b]"><Icon name="receipt" className="h-5 w-5" /></span><p className="mt-3 text-sm font-semibold text-[#38544d]">No transactions yet</p><p className="mt-1 text-xs text-[#84928e]">Your activity will show up here.</p></div></div>}
          </div>
        </section>
      </div>
    </div>
  );
}
