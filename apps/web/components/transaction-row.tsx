import Link from 'next/link';
import { Transaction } from '../lib/api';
import { formatDate, formatMoney, transactionName } from '../lib/format';
import { Icon } from './icons';
import { StatusBadge } from './status-badge';

export function TransactionRow({ transaction, currency = 'NGN', showStatus = false }: { transaction: Transaction; currency?: string; showStatus?: boolean }) {
  const name = transactionName(transaction);
  const initials = name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <Link href={`/transactions/${transaction.id}`} className="group flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-[#f5f8f6] sm:gap-4 sm:px-3">
      <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#edf2ef] text-xs font-bold text-[#46625a]">
        {initials || <Icon name="transfer" className="h-5 w-5" />}
        <span className="absolute -bottom-0.5 -right-0.5 grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-white bg-[#dfe9e5] text-[#087a5b]"><Icon name="arrow-up-right" className="h-2.5 w-2.5" /></span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-[#18352e]">{name}</span>
        <span className="mt-1 block truncate text-xs text-[#788985]">{transaction.description || 'Money transfer'} · {formatDate(transaction.createdAt)}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-bold tabular-nums text-[#18352e]">−{formatMoney(transaction.amount, currency)}</span>
        <span className="mt-1 block text-[11px] font-medium text-[#889691]">{showStatus ? <StatusBadge status={transaction.status} compact /> : transaction.status === 'COMPLETED' ? 'Successful' : transaction.status.toLowerCase()}</span>
      </span>
      <Icon name="chevron-right" className="hidden h-4 w-4 text-[#a6b3af] transition group-hover:translate-x-0.5 sm:block" />
    </Link>
  );
}
