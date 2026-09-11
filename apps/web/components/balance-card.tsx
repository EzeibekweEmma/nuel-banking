'use client';

import { useState } from 'react';
import { Account } from '../lib/api';
import { formatMoney } from '../lib/format';
import { BrandMark } from './brand-mark';
import { Icon } from './icons';

export function BalanceCard({ account }: { account: Account }) {
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  async function copyAccountNumber(): Promise<void> {
    await navigator.clipboard.writeText(account.accountNumber);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="relative min-h-[276px] overflow-hidden rounded-[28px] bg-[#0a4a39] p-6 text-white shadow-[0_22px_50px_-28px_rgba(4,50,38,.65)] sm:p-7">
      <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border-[46px] border-white/[.055]" />
      <div className="pointer-events-none absolute -bottom-24 right-20 h-52 w-52 rounded-full bg-[#d8f85c]/10 blur-2xl" />
      <div className="relative flex h-full min-h-[224px] flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5"><BrandMark className="h-8 w-8" /><span className="text-sm font-bold">nuel</span></div>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#d8e8e3]">{account.status}</span>
        </div>

        <div className="mt-7">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-[#acd0c5]">Available balance</p>
            <button aria-label={visible ? 'Hide balance' : 'Show balance'} onClick={() => setVisible((current) => !current)} className="rounded p-1 text-[#acd0c5] transition hover:bg-white/10 hover:text-white"><Icon name={visible ? 'eye' : 'eye-off'} className="h-4 w-4" /></button>
          </div>
          <p className="mt-2 text-[2rem] font-bold tracking-[-0.04em] sm:text-[2.35rem]">{visible ? formatMoney(account.balance, account.currency) : '••••••••'}</p>
        </div>

        <div className="mt-auto flex items-end justify-between gap-4 pt-6">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#83ada1]">{account.type.toLowerCase()} account</p>
            <button onClick={() => void copyAccountNumber()} className="mt-1 flex items-center gap-2 text-sm font-semibold tracking-[0.12em] text-white hover:text-[#d8f85c]">
              {account.accountNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')}
              <Icon name="copy" className="h-3.5 w-3.5" />
              <span className="sr-only">{copied ? 'Copied' : 'Copy account number'}</span>
            </button>
          </div>
          <div className="text-right"><p className="text-[10px] uppercase tracking-[0.14em] text-[#83ada1]">Member since</p><p className="mt-1 text-xs font-semibold">{new Date(account.createdAt).getFullYear()}</p></div>
        </div>
        {copied && <span className="absolute bottom-16 left-5 rounded-lg bg-[#d8f85c] px-2.5 py-1 text-[10px] font-bold text-[#092d24]">Account number copied</span>}
      </div>
    </section>
  );
}
