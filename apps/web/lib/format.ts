export function formatMoney(amount: string | number, currency = 'NGN', options?: { compact?: boolean }): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    notation: options?.compact ? 'compact' : 'standard',
    minimumFractionDigits: options?.compact ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

export function formatDate(value: string, includeTime = false): string {
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: new Date(value).getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value));
}

export function transactionName(transaction: { description: string | null; destinationAccount?: { user?: { firstName: string; lastName: string } } }): string {
  const user = transaction.destinationAccount?.user;
  if (user) return `${user.firstName} ${user.lastName}`;
  return transaction.description?.trim() || 'Bank transfer';
}
