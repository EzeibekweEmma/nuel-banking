'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { AuthShell } from '../../components/auth-shell';
import { Icon } from '../../components/icons';
import { api, ApiError } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api.forgotPassword(email);
      setMessage(result.message);
      setResetUrl(result.resetUrl ?? '');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'We could not process your request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell mode="recovery" title={message ? 'Check your email' : 'Forgot your password?'} description={message ? 'Use the link we sent to create a new password.' : 'Enter the email linked to your Astra account.'}>
      {message ? (
        <div className="mt-7">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e4f4ed] text-[#087a5b]"><Icon name="send" className="h-5 w-5" /></span>
          <p className="mt-5 text-sm leading-6 text-[#61736d]">{message}</p>
          <p className="mt-2 text-xs text-[#879590]">The link expires in 15 minutes. Check your spam folder if it does not arrive.</p>
          {resetUrl && <a href={resetUrl} className="mt-5 flex h-11 items-center justify-center rounded-xl border border-[#9dbdb3] bg-[#f2f8f5] text-xs font-bold text-[#087a5b]">Open development reset link</a>}
          <button onClick={() => { setMessage(''); setResetUrl(''); }} className="mt-3 h-11 w-full rounded-xl bg-[#087a5b] text-xs font-bold text-white">Send another link</button>
          <Link href="/login" className="mt-5 block text-center text-xs font-bold text-[#087a5b]">← Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-7">
          <label htmlFor="email" className="text-xs font-bold text-[#39574f]">Email address</label>
          <input id="email" required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-2 h-12 w-full rounded-xl border border-[#ccd8d3] bg-[#fbfcfb] px-4 text-sm text-[#18352e] outline-none transition focus:border-[#087a5b] focus:bg-white" />
          {error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{error}</div>}
          <button disabled={loading} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#087a5b] text-sm font-bold text-white transition hover:bg-[#06694f] disabled:bg-[#a8bdb6]">{loading ? 'Sending securely…' : 'Send reset link'}{!loading && <Icon name="chevron-right" className="h-4 w-4" />}</button>
          <Link href="/login" className="mt-5 block text-center text-xs font-bold text-[#087a5b]">← Back to sign in</Link>
        </form>
      )}
    </AuthShell>
  );
}
