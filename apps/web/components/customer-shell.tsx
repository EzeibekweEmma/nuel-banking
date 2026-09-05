'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { api, clearTokens, isAuthenticated, User } from '../lib/api';
import { LoadingState } from './page-state';

const links = [['Dashboard', '/dashboard'], ['Transfer', '/transfer'], ['Transactions', '/transactions'], ['Beneficiaries', '/beneficiaries'], ['Notifications', '/notifications'], ['Profile', '/profile']];
export function CustomerShell({ children }: { children: ReactNode }) {
  const router = useRouter(); const pathname = usePathname(); const [user, setUser] = useState<User | null>(null);
  useEffect(() => { if (!isAuthenticated()) { router.replace('/login'); return; } api.me().then(setUser).catch(() => { clearTokens(); router.replace('/login'); }); }, [router]);
  if (!user) return <main className="p-8"><LoadingState /></main>;
  async function logout() { await api.logout().catch(() => undefined); clearTokens(); router.replace('/login'); }
  return <div className="min-h-screen bg-slate-50 md:grid md:grid-cols-[230px_1fr]"><aside className="bg-slate-950 p-5 text-white"><Link href="/dashboard" className="text-lg font-bold">Astra Bank</Link><p className="mt-1 text-xs text-slate-400">Digital banking</p><nav className="mt-8 flex gap-1 overflow-x-auto md:block">{links.map(([label, href]) => <Link key={href} href={href} className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm ${pathname === href ? 'bg-blue-600' : 'text-slate-300 hover:bg-slate-800'}`}>{label}</Link>)}</nav><button onClick={logout} className="mt-8 text-sm text-slate-300 hover:text-white">Sign out</button></aside><main className="p-5 sm:p-8"><header className="mb-8"><p className="text-sm text-slate-500">Welcome back</p><h1 className="text-2xl font-bold text-slate-950">{user.firstName} {user.lastName}</h1></header>{children}</main></div>;
}
