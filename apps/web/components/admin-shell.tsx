'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { api, clearTokens, isAuthenticated, User } from '../lib/api';
import { Icon, IconName } from './icons';

const links: { label: string; href: string; icon: IconName }[] = [
  { label: 'Overview', href: '/admin', icon: 'home' },
  { label: 'Customers', href: '/admin/customers', icon: 'users' },
  { label: 'Transactions', href: '/admin/transactions', icon: 'receipt' },
  { label: 'Held reviews', href: '/admin/held', icon: 'clock' },
  { label: 'Fraud assessments', href: '/admin/fraud', icon: 'shield' },
  { label: 'Audit logs', href: '/admin/audit-logs', icon: 'settings' },
];

const titles: Record<string, string> = {
  '/admin': 'Operations overview',
  '/admin/customers': 'Customer directory',
  '/admin/transactions': 'Transaction monitoring',
  '/admin/held': 'Held transaction reviews',
  '/admin/fraud': 'Fraud assessments',
  '/admin/audit-logs': 'Audit trail',
};

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    api.me().then((next) => {
      if (next.role !== 'ADMIN') router.replace('/dashboard');
      else setUser(next);
    }).catch(() => {
      clearTokens();
      router.replace('/login');
    });
  }, [router]);

  useEffect(() => setMenuOpen(false), [pathname]);

  async function logout(): Promise<void> {
    await api.logout().catch(() => undefined);
    clearTokens();
    router.replace('/login');
  }

  if (!user) return <main className="grid min-h-screen place-items-center bg-[#f3f6f4]"><div className="flex items-center gap-3 text-sm text-[#65756f]"><span className="h-5 w-5 animate-spin rounded-full border-2 border-[#c7d2ce] border-t-[#087a5b]" />Opening staff workspace…</div></main>;

  return (
    <div className="min-h-screen bg-[#f3f6f4] lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      {menuOpen && <button aria-label="Close menu" className="fixed inset-0 z-40 cursor-default bg-[#10231f]/45 backdrop-blur-sm lg:hidden" onClick={() => setMenuOpen(false)} />}
      <aside className={'fixed inset-y-0 left-0 z-50 flex w-[276px] flex-col bg-[#102921] px-4 py-5 text-white transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0 ' + (menuOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between px-2">
          <Link href="/admin" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#d8f85c] text-base font-black text-[#092d24]">A</span><span><span className="block text-[17px] font-bold">Astra Bank</span><span className="block text-[10px] font-semibold uppercase tracking-[.18em] text-[#d8f85c]">Staff console</span></span></Link>
          <button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="p-2 lg:hidden"><Icon name="x" className="h-5 w-5" /></button>
        </div>
        <nav className="mt-10 space-y-1">
          {links.map((item) => {
            const active = pathname === item.href;
            return <Link key={item.href} href={item.href} className={'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ' + (active ? 'bg-white text-[#17382f]' : 'text-[#aec5bf] hover:bg-white/8 hover:text-white')}><Icon name={item.icon} className={'h-[19px] w-[19px] ' + (active ? 'text-[#087a5b]' : 'text-[#819f97]')} />{item.label}</Link>;
          })}
        </nav>
        <div className="mt-auto rounded-2xl bg-white/[.06] p-3">
          <div className="flex items-center gap-3 p-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#d8f85c] text-xs font-bold text-[#16382f]">{user.firstName[0]}{user.lastName[0]}</span><span className="min-w-0"><span className="block truncate text-xs font-bold">{user.firstName} {user.lastName}</span><span className="text-[10px] text-[#89a69e]">Administrator</span></span></div>
          <button onClick={() => void logout()} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-[#9cb6af] hover:bg-white/8 hover:text-white"><Icon name="logout" className="h-4 w-4" />Sign out</button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-[76px] items-center border-b border-[#dce5e1] bg-[#f3f6f4]/95 px-5 backdrop-blur lg:px-8">
          <button aria-label="Open menu" onClick={() => setMenuOpen(true)} className="mr-3 rounded-lg border border-[#d8e1dd] bg-white p-2 lg:hidden"><Icon name="menu" className="h-5 w-5" /></button>
          <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#087a5b]">Administration</p><h1 className="mt-1 text-xl font-bold tracking-tight text-[#18352e]">{titles[pathname] ?? 'Staff console'}</h1></div>
          <span className="ml-auto hidden items-center gap-2 rounded-full border border-[#d5dfdb] bg-white px-3 py-2 text-[10px] font-bold text-[#557069] sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-500" />Systems operational</span>
        </header>
        <main className="page-enter p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
