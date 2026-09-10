'use client';

import { useEffect, useMemo, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '../../../components/page-state';
import { Icon } from '../../../components/icons';
import { TransactionRow } from '../../../components/transaction-row';
import { Account, api, Transaction } from '../../../lib/api';

const statuses = ['ALL', 'COMPLETED', 'PENDING', 'HELD', 'FAILED'];

export default function TransactionsPage() {
  const [items, setItems] = useState<Transaction[] | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.transactions(), api.account()])
      .then(([transactions, nextAccount]) => { setItems(transactions); setAccount(nextAccount); })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const filtered = useMemo(() => items?.filter((item) => {
    const destination = item.destinationAccount?.user;
    const searchable = [item.reference, item.description, item.destinationAccount?.accountNumber, destination?.firstName, destination?.lastName].filter(Boolean).join(' ').toLowerCase();
    return (status === 'ALL' || item.status === status) && searchable.includes(query.toLowerCase());
  }) ?? [], [items, query, status]);

  if (error) return <ErrorState message={error} />;
  if (!items || !account) return <LoadingState />;

  return (
    <section className="max-w-5xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h2 className="text-xl font-bold text-[#18352e]">Your money activity</h2><p className="mt-1 text-sm text-[#788883]">{items.length} total {items.length === 1 ? 'transaction' : 'transactions'}</p></div>
        <div className="relative w-full sm:w-72"><Icon name="search" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b9995]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transactions" className="h-11 w-full rounded-xl border border-[#d5dfdb] bg-white pl-10 pr-4 text-sm outline-none focus:border-[#087a5b]" /></div>
      </div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {statuses.map((item) => <button key={item} onClick={() => setStatus(item)} className={'whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ' + (status === item ? 'bg-[#183d33] text-white' : 'border border-[#d8e1dd] bg-white text-[#6c7d78] hover:border-[#9dbcb3]')}>{item === 'ALL' ? 'All activity' : item[0] + item.slice(1).toLowerCase()}</button>)}
      </div>
      <div className="mt-5 rounded-[24px] border border-[#dce5e1] bg-white p-3 shadow-[0_14px_40px_-34px_rgba(13,56,45,.5)] sm:p-5">
        {filtered.length > 0 ? <div className="divide-y divide-[#edf1ef]">{filtered.map((item) => <TransactionRow key={item.id} transaction={item} currency={account.currency} showStatus />)}</div> : <EmptyState message={query || status !== 'ALL' ? 'No transactions match your filters.' : 'You have not made any transfers yet.'} />}
      </div>
    </section>
  );
}
