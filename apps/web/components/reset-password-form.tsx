'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { Icon } from './icons';

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password'));
    const confirmation = String(form.get('confirmation'));
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setError('Use at least 12 characters with uppercase, lowercase, and a number.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.resetPassword(token, password);
      setComplete(true);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Your password could not be reset.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) return <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">This reset link is incomplete. Request a new link to continue.<Link href="/forgot-password" className="mt-4 block font-bold text-[#087a5b]">Request a new link</Link></div>;

  if (complete) return (
    <div className="mt-7 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e0f4ea] text-[#087a5b]"><Icon name="shield" className="h-6 w-6" /></span>
      <h3 className="mt-5 text-lg font-bold text-[#18352e]">Password updated</h3>
      <p className="mt-2 text-sm leading-6 text-[#71817c]">Your other sessions have been signed out. Use your new password to access Astra.</p>
      <Link href="/login" className="mt-6 flex h-12 items-center justify-center rounded-xl bg-[#087a5b] text-sm font-bold text-white">Continue to sign in</Link>
    </div>
  );

  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      <PasswordField name="password" label="New password" show={showPassword} />
      <PasswordField name="confirmation" label="Confirm new password" show={showPassword} />
      <button type="button" onClick={() => setShowPassword((current) => !current)} className="flex items-center gap-2 text-xs font-semibold text-[#667a74]"><Icon name={showPassword ? 'eye-off' : 'eye'} className="h-4 w-4" />{showPassword ? 'Hide passwords' : 'Show passwords'}</button>
      <p className="text-[11px] leading-5 text-[#7b8b87]">Use 12 or more characters with uppercase, lowercase, and at least one number.</p>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{error}</div>}
      <button disabled={loading} className="flex h-12 w-full items-center justify-center rounded-xl bg-[#087a5b] text-sm font-bold text-white disabled:bg-[#a8bdb6]">{loading ? 'Updating password…' : 'Reset password'}</button>
    </form>
  );
}

function PasswordField({ name, label, show }: { name: string; label: string; show: boolean }) {
  return <label className="block text-xs font-bold text-[#39574f]">{label}<input required name={name} type={show ? 'text' : 'password'} autoComplete="new-password" className="mt-2 h-12 w-full rounded-xl border border-[#ccd8d3] bg-[#fbfcfb] px-4 text-sm font-normal text-[#18352e] outline-none focus:border-[#087a5b] focus:bg-white" /></label>;
}
