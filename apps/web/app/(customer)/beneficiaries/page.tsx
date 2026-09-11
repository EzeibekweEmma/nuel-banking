'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ConfirmAction } from '../../../components/confirm-action';
import { EmptyState, ErrorState, LoadingState } from '../../../components/page-state';
import { Icon } from '../../../components/icons';
import { api, Beneficiary } from '../../../lib/api';

export default function BeneficiariesPage() {
  const [items, setItems] = useState<Beneficiary[] | null>(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  function load(): void {
    api.beneficiaries().then(setItems).catch((reason: Error) => setError(reason.message));
  }

  useEffect(load, []);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setLoading(true);
    setError('');
    try {
      await api.addBeneficiary({ nickname: String(form.get('nickname')), accountNumber: String(form.get('accountNumber')) });
      formElement.reset();
      setShowForm(false);
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not add beneficiary.');
    } finally {
      setLoading(false);
    }
  }

  if (items === null) return <LoadingState />;

  return (
    <section className="max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div><h2 className="text-xl font-bold text-[#18352e]">Saved recipients</h2><p className="mt-1 text-sm text-[#788883]">Send faster to people you trust.</p></div>
        <button onClick={() => setShowForm((current) => !current)} className="flex h-11 items-center gap-2 rounded-xl bg-[#087a5b] px-4 text-xs font-bold text-white transition hover:bg-[#06694f]"><Icon name={showForm ? 'x' : 'plus'} className="h-4 w-4" />{showForm ? 'Cancel' : 'Add new'}</button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mt-5 rounded-[22px] border border-[#bcd2ca] bg-white p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="nickname" label="Nickname" placeholder="e.g. Mum" />
            <Field name="accountNumber" label="Nuel account number" placeholder="10-digit account number" pattern="[0-9]{10}" inputMode="numeric" />
          </div>
          {error && <div className="mt-4"><ErrorState message={error} /></div>}
          <button disabled={loading} className="mt-5 h-11 rounded-xl bg-[#183d33] px-5 text-xs font-bold text-white disabled:opacity-60">{loading ? 'Saving…' : 'Save beneficiary'}</button>
        </form>
      )}

      {!showForm && error && <div className="mt-5"><ErrorState message={error} /></div>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const owner = item.account.user;
          return (
            <article key={item.id} className="flex items-center gap-4 rounded-[20px] border border-[#dce5e1] bg-white p-4 transition hover:border-[#b5cdc5]">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#e7f2ee] text-sm font-bold text-[#087a5b]">{item.nickname.slice(0, 2).toUpperCase()}</span>
              <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold text-[#28483f]">{item.nickname}</h3><p className="mt-1 truncate text-xs text-[#7b8a86]">{owner ? owner.firstName + ' ' + owner.lastName + ' · ' : ''}•••• {item.account.accountNumber.slice(-4)}</p></div>
              <ConfirmAction label="Remove" tone="red" message="Remove?" onConfirm={async () => { await api.removeBeneficiary(item.id); load(); }} />
            </article>
          );
        })}
        {items.length === 0 && <div className="sm:col-span-2"><EmptyState message="No beneficiaries saved yet. Add someone you pay often." /></div>}
      </div>
    </section>
  );
}

function Field({ name, label, placeholder, ...props }: { name: string; label: string; placeholder: string; pattern?: string; inputMode?: 'numeric' }) {
  return <label className="text-xs font-bold text-[#39574f]">{label}<input required name={name} placeholder={placeholder} {...props} className="mt-2 h-12 w-full rounded-xl border border-[#ccd8d3] bg-[#fbfcfb] px-4 text-sm font-normal outline-none focus:border-[#087a5b] focus:bg-white" /></label>;
}
