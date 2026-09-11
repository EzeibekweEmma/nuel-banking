import { ReactNode } from 'react';
import { Icon } from './icons';

export function AuthShell({ children, mode, eyebrow, title, description }: { children: ReactNode; mode: 'login' | 'register' | 'recovery'; eyebrow?: string; title?: string; description?: string }) {
  return (
    <main className="min-h-screen bg-[#edf2ef] p-3 sm:p-5">
      <div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-[1180px] overflow-hidden rounded-[28px] bg-white shadow-[0_32px_80px_-55px_rgba(8,52,41,.65)] sm:min-h-[calc(100vh-40px)] lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden bg-[#0a382d] p-12 text-white lg:flex lg:flex-col">
          <div className="pointer-events-none absolute -left-32 -top-40 h-96 w-96 rounded-full border-[70px] border-white/[.035]" />
          <div className="pointer-events-none absolute -bottom-48 -right-40 h-[520px] w-[520px] rounded-full border-[95px] border-[#d8f85c]/[.055]" />
          <div className="relative flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#d8f85c] text-base font-black text-[#092d24]">N</span><span className="text-lg font-bold tracking-tight">Nuel Bank</span></div>
          <div className="relative my-auto max-w-lg">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8f85c]">Banking made human</p>
            <h1 className="mt-5 text-5xl font-bold leading-[1.08] tracking-[-0.045em]">{mode === 'login' ? 'Your money, clear and secure.' : mode === 'register' ? 'A better way to manage your money.' : 'Secure recovery, without the worry.'}</h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-[#afc7c0]">Move money confidently, stay ahead of every transaction, and get helpful answers whenever you need them.</p>
            <div className="mt-10 grid grid-cols-2 gap-3">
              <Feature icon="shield" title="Protected 24/7" copy="Real-time fraud checks" />
              <Feature icon="sparkles" title="Helpful by design" copy="AI-powered guidance" />
            </div>
          </div>
          <p className="relative text-[10px] text-[#759d92]">Secure digital banking · Built for everyday life</p>
        </section>
        <section className="flex items-center justify-center px-6 py-10 sm:px-12 lg:px-16">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center gap-3 lg:hidden"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d8f85c] text-sm font-black text-[#092d24]">N</span><span className="font-bold text-[#18352e]">Nuel Bank</span></div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#087a5b]">{eyebrow ?? (mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Join Nuel' : 'Account recovery')}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#18352e]">{title ?? (mode === 'login' ? 'Sign in to your account' : mode === 'register' ? 'Open your account' : 'Reset your password')}</h2>
            <p className="mt-2 text-sm leading-6 text-[#768681]">{description ?? (mode === 'login' ? 'Enter your details to continue to secure banking.' : mode === 'register' ? 'It only takes a minute to get started.' : 'Follow the secure steps below to regain access.')}</p>
            {children}
            <div className="mt-8 flex items-center justify-center gap-2 border-t border-[#e7ece9] pt-6 text-[10px] text-[#84928e]"><Icon name="shield" className="h-3.5 w-3.5 text-[#087a5b]" />Your connection is encrypted and secure</div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Feature({ icon, title, copy }: { icon: 'shield' | 'sparkles'; title: string; copy: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.055] p-4"><Icon name={icon} className="h-5 w-5 text-[#d8f85c]" /><p className="mt-4 text-xs font-bold">{title}</p><p className="mt-1 text-[10px] text-[#91b0a7]">{copy}</p></div>;
}
