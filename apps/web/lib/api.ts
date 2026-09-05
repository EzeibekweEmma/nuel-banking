const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const ACCESS_TOKEN_KEY = 'banking_access_token';
const REFRESH_TOKEN_KEY = 'banking_refresh_token';

export class ApiError extends Error { constructor(message: string, readonly status: number) { super(message); } }
export interface AuthTokens { accessToken: string; refreshToken: string; }
export interface User { id: string; email: string; firstName: string; lastName: string; role: 'CUSTOMER' | 'ADMIN'; }
export interface Account { id: string; accountNumber: string; type: string; balance: string; currency: string; status: string; createdAt: string; user: { firstName: string; lastName: string }; }
export interface Transaction { id: string; amount: string; reference: string; description: string | null; status: string; createdAt: string; completedAt: string | null; destinationAccount?: { accountNumber: string }; fraudAssessment?: { riskScore: number; riskLevel: string; decision: string; reasons: string[] }; }
export interface Beneficiary { id: string; nickname: string; createdAt: string; account: { accountNumber: string; currency: string }; }
export interface Notification { id: string; type: string; title: string; message: string; isRead: boolean; createdAt: string; }

function getTokens(): AuthTokens | null { if (typeof window === 'undefined') return null; const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY); const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY); return accessToken && refreshToken ? { accessToken, refreshToken } : null; }
export function saveTokens(tokens: AuthTokens): void { localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken); localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken); }
export function clearTokens(): void { localStorage.removeItem(ACCESS_TOKEN_KEY); localStorage.removeItem(REFRESH_TOKEN_KEY); }
export function isAuthenticated(): boolean { return getTokens() !== null; }

async function refreshAccessToken(): Promise<string | null> {
  const tokens = getTokens(); if (!tokens) return null;
  const response = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: tokens.refreshToken }) });
  if (!response.ok) { clearTokens(); return null; }
  const next = await response.json() as AuthTokens; saveTokens(next); return next.accessToken;
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const accessToken = getTokens()?.accessToken;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...options.headers } });
  if (response.status === 401 && retry && await refreshAccessToken()) return request<T>(path, options, false);
  if (!response.ok) { const body = await response.json().catch(() => ({})) as { message?: string | string[] }; const message = Array.isArray(body.message) ? body.message.join(', ') : body.message ?? 'Something went wrong'; throw new ApiError(message, response.status); }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) => request<AuthTokens>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data: { email: string; firstName: string; lastName: string; password: string }) => request<AuthTokens>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => { const refreshToken = getTokens()?.refreshToken; return refreshToken ? request<void>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }) : Promise.resolve(); },
  me: () => request<User>('/auth/me'), account: () => request<Account>('/accounts/me'), balance: () => request<{ balance: string; currency: string }>('/accounts/me/balance'),
  transactions: () => request<Transaction[]>('/transactions'), transaction: (id: string) => request<Transaction>(`/transactions/${id}`),
  transfer: (data: { destinationAccountNumber: string; amount: string; description?: string }, idempotencyKey: string) => request<Transaction>('/transactions/transfer', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(data) }),
  beneficiaries: () => request<Beneficiary[]>('/beneficiaries'), addBeneficiary: (data: { accountNumber: string; nickname: string }) => request<Beneficiary>('/beneficiaries', { method: 'POST', body: JSON.stringify(data) }), removeBeneficiary: (id: string) => request<void>(`/beneficiaries/${id}`, { method: 'DELETE' }),
  notifications: () => request<Notification[]>('/notifications'), markNotificationRead: (id: string) => request<void>(`/notifications/${id}/read`, { method: 'PATCH' }),
};
