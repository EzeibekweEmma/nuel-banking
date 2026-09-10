import { AuthForm } from '../../components/auth-form';
import { AuthShell } from '../../components/auth-shell';

export default function LoginPage() {
  return <AuthShell mode="login"><AuthForm mode="login" /></AuthShell>;
}
