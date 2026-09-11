import { AuthShell } from "../../components/auth-shell";
import { EmailVerification } from "../../components/email-verification";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;

  return (
    <AuthShell mode="verification">
      <EmailVerification token={token} />
    </AuthShell>
  );
}
