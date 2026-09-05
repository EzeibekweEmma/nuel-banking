import { CustomerShell } from '../../components/customer-shell';
export default function CustomerLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <CustomerShell>{children}</CustomerShell>; }
