const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const ACCESS_TOKEN_KEY = "banking_access_token";
const REFRESH_TOKEN_KEY = "banking_refresh_token";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  emailVerificationRequired: boolean;
}
type StoredTokens = Pick<AuthTokens, "accessToken" | "refreshToken">;
export interface PasswordResetRequest {
  message: string;
  resetUrl?: string;
}
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "CUSTOMER" | "ADMIN";
  emailVerifiedAt: string | null;
  createdAt?: string;
}
export interface AdminAccount {
  id: string;
  accountNumber: string;
  type: string;
  balance: string;
  currency: string;
  status: "ACTIVE" | "FROZEN" | "CLOSED";
  createdAt: string;
}
export interface AdminCustomer extends User {
  accounts: AdminAccount[];
}
export interface Account {
  id: string;
  accountNumber: string;
  type: string;
  balance: string;
  currency: string;
  status: string;
  createdAt: string;
  user: { firstName: string; lastName: string };
}
export interface Recipient {
  accountNumber: string;
  currency: string;
  firstName: string;
  lastName: string;
}
export interface Transaction {
  id: string;
  kind?: "TRANSFER" | "DEPOSIT";
  direction?: "DEBIT" | "CREDIT";
  amount: string;
  reference: string;
  description: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
  balanceAfter?: string | null;
  counterparty?: { name: string; accountNumber: string | null };
  destinationAccount?: {
    accountNumber: string;
    user?: { firstName: string; lastName: string };
  };
  fraudAssessment?: {
    riskScore: number;
    riskLevel: string;
    decision: string;
    reasons: string[];
  } | null;
}
export interface Beneficiary {
  id: string;
  nickname: string;
  createdAt: string;
  account: {
    accountNumber: string;
    currency: string;
    user?: { firstName: string; lastName: string };
  };
}
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
export interface DepositTransaction {
  id: string;
  amount: string;
  balanceAfter: string;
  currency: string;
  reference: string;
  source: "DEMO";
  status: string;
  createdAt: string;
  completedAt: string;
}
export interface DemoFundingConfiguration {
  enabled: boolean;
  limits: {
    minimumAmount: number;
    maximumAmount: number;
    dailyAmount: number;
    dailyDeposits: number;
  };
}
export interface PageResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
export interface AdminTransaction extends Transaction {
  sourceAccount: {
    accountNumber: string;
    user?: { firstName: string; lastName: string };
  };
  destinationAccount: {
    accountNumber: string;
    user?: { firstName: string; lastName: string };
  };
}
export interface FraudAssessment {
  id: string;
  riskScore: number;
  riskLevel: string;
  decision: string;
  reasons: string[];
  createdAt: string;
  transaction: {
    id: string;
    reference: string;
    status: string;
    amount: string;
    createdAt: string;
    sourceAccount: {
      accountNumber: string;
      user: { firstName: string; lastName: string };
    };
    destinationAccount: {
      accountNumber: string;
      user: { firstName: string; lastName: string };
    };
  };
}
export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  user: { email: string } | null;
  metadata: Record<string, unknown> | null;
}

function getTokens(): StoredTokens | null {
  if (typeof window === "undefined") return null;
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}
export function saveTokens(tokens: StoredTokens): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
export function isAuthenticated(): boolean {
  return getTokens() !== null;
}

let refreshPromise: Promise<string | null> | null = null;

async function performTokenRefresh(): Promise<string | null> {
  const tokens = getTokens();
  if (!tokens) return null;
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    if (!response.ok) {
      clearTokens();
      return null;
    }
    const next = (await response.json()) as AuthTokens;
    saveTokens(next);
    return next.accessToken;
  } catch {
    return null;
  }
}

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise)
    refreshPromise = performTokenRefresh().finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const accessToken = getTokens()?.accessToken;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 401 && retry && (await refreshAccessToken()))
    return request<T>(path, options, false);
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : (body.message ?? "Something went wrong");
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthTokens>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (data: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }) =>
    request<AuthTokens>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  forgotPassword: (email: string) =>
    request<PasswordResetRequest>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
  verifyEmail: (token: string) =>
    request<{ message: string }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  resendEmailVerification: () =>
    request<{ message: string; verificationUrl?: string }>(
      "/auth/resend-email-verification",
      { method: "POST" },
    ),
  logout: () => {
    const refreshToken = getTokens()?.refreshToken;
    return refreshToken
      ? request<void>("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        })
      : Promise.resolve();
  },
  me: () => request<User>("/auth/me"),
  account: () => request<Account>("/accounts/me"),
  balance: () =>
    request<{ balance: string; currency: string }>("/accounts/me/balance"),
  lookupRecipient: (accountNumber: string) =>
    request<Recipient>(`/accounts/lookup/${accountNumber}`),
  demoFundingConfiguration: () =>
    request<DemoFundingConfiguration>("/funding/demo/configuration"),
  demoFund: (amount: string, idempotencyKey: string) =>
    request<DepositTransaction>("/funding/demo", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ amount }),
    }),
  deposits: () => request<DepositTransaction[]>("/funding/deposits"),
  transactions: () => request<Transaction[]>("/transactions"),
  transaction: (id: string) => request<Transaction>(`/transactions/${id}`),
  transfer: (
    data: {
      destinationAccountNumber: string;
      amount: string;
      description?: string;
    },
    idempotencyKey: string,
  ) =>
    request<Transaction>("/transactions/transfer", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(data),
    }),
  verifyTransfer: (id: string, code: string) =>
    request<Transaction>(`/transactions/${id}/verify`, {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  resendTransferVerificationCode: (id: string) =>
    request<{ message: string }>(`/transactions/${id}/verification-code`, {
      method: "POST",
    }),
  beneficiaries: () => request<Beneficiary[]>("/beneficiaries"),
  addBeneficiary: (data: { accountNumber: string; nickname: string }) =>
    request<Beneficiary>("/beneficiaries", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  removeBeneficiary: (id: string) =>
    request<void>(`/beneficiaries/${id}`, { method: "DELETE" }),
  notifications: () => request<Notification[]>("/notifications"),
  markNotificationRead: (id: string) =>
    request<void>(`/notifications/${id}/read`, { method: "PATCH" }),
  adminCustomers: (page = 1) =>
    request<PageResult<AdminCustomer>>(`/admin/customers?page=${page}`),
  freezeAccount: (id: string, reason: string) =>
    request<{ id: string; accountNumber: string; status: "FROZEN" }>(
      `/admin/accounts/${id}/freeze`,
      { method: "PATCH", body: JSON.stringify({ reason }) },
    ),
  unfreezeAccount: (id: string, reason: string) =>
    request<{ id: string; accountNumber: string; status: "ACTIVE" }>(
      `/admin/accounts/${id}/unfreeze`,
      { method: "PATCH", body: JSON.stringify({ reason }) },
    ),
  adminTransactions: (page = 1, status?: string) =>
    request<PageResult<AdminTransaction>>(
      `/admin/transactions?page=${page}${status ? `&status=${status}` : ""}`,
    ),
  adminHeldTransactions: (page = 1) =>
    request<PageResult<AdminTransaction>>(
      `/admin/transactions/held?page=${page}`,
    ),
  adminAssessments: (page = 1) =>
    request<PageResult<FraudAssessment>>(
      `/admin/fraud-assessments?page=${page}`,
    ),
  adminAuditLogs: (page = 1) =>
    request<PageResult<AuditLog>>(`/admin/audit-logs?page=${page}`),
  approveHeldTransaction: (id: string) =>
    request<AdminTransaction>(`/admin/transactions/${id}/approve`, {
      method: "POST",
    }),
  rejectHeldTransaction: (id: string) =>
    request<AdminTransaction>(`/admin/transactions/${id}/reject`, {
      method: "POST",
    }),
  chat: (message: string, conversationId?: string) =>
    request<{ conversationId: string; response: string }>("/chatbot/messages", {
      method: "POST",
      body: JSON.stringify({ message, conversationId }),
    }),
};
