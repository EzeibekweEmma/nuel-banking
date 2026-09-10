import { AuthShell } from '../../components/auth-shell';
import { ResetPasswordForm } from '../../components/reset-password-form';

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  return <AuthShell mode="recovery" title="Create a new password" description="Choose a strong password you have not used for this account before."><ResetPasswordForm token={token} /></AuthShell>;
}
