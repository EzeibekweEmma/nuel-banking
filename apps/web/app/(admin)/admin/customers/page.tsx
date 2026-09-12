"use client";

import { FormEvent, useEffect, useState } from "react";
import { Icon } from "../../../../components/icons";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../../components/page-state";
import { StatusBadge } from "../../../../components/status-badge";
import {
  AdminAccount,
  AdminCustomerFilters,
  AdminCustomer,
  api,
  ApiError,
} from "../../../../lib/api";
import { formatDate, formatMoney } from "../../../../lib/format";

interface AccountAction {
  customer: AdminCustomer;
  account: AdminAccount;
  mode: "freeze" | "unfreeze";
}

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const [items, setItems] = useState<AdminCustomer[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] =
    useState<NonNullable<AdminCustomerFilters["status"]>>("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [action, setAction] = useState<AccountAction | null>(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setError("");
    const timer = window.setTimeout(
      () => {
        setLoading(true);
        api
          .adminCustomers({
            page,
            limit: PAGE_SIZE,
            query: query.trim(),
            status,
          })
          .then((result) => {
            if (!active) return;
            setItems(result.data);
            setTotal(result.total);
          })
          .catch((reason: Error) => {
            if (active) setError(reason.message);
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      },
      query ? 300 : 0,
    );
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [page, query, status]);

  function openAction(customer: AdminCustomer, account: AdminAccount): void {
    setAction({
      customer,
      account,
      mode: account.status === "FROZEN" ? "unfreeze" : "freeze",
    });
    setReason("");
    setActionError("");
  }

  function closeAction(): void {
    if (saving) return;
    setAction(null);
    setReason("");
    setActionError("");
  }

  async function submitAction(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (!action) return;
    const cleanReason = reason.trim();
    if (cleanReason.length < 10) {
      setActionError("Enter a clear reason containing at least 10 characters.");
      return;
    }
    setSaving(true);
    setActionError("");
    try {
      const updated =
        action.mode === "freeze"
          ? await api.freezeAccount(action.account.id, cleanReason)
          : await api.unfreezeAccount(action.account.id, cleanReason);
      const leavesCurrentFilter = status !== "ALL" && updated.status !== status;
      setItems((current) =>
        current
          ? current.flatMap((customer) => {
              if (
                leavesCurrentFilter &&
                customer.accounts.some((account) => account.id === updated.id)
              ) {
                return [];
              }
              return [
                {
                  ...customer,
                  accounts: customer.accounts.map((account) =>
                    account.id === updated.id
                      ? { ...account, status: updated.status }
                      : account,
                  ),
                },
              ];
            })
          : null,
      );
      if (leavesCurrentFilter) setTotal((current) => Math.max(0, current - 1));
      closeAction();
      setAction(null);
    } catch (reason) {
      setActionError(
        reason instanceof ApiError
          ? reason.message
          : "The account status could not be changed.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (error && !items) return <ErrorState message={error} />;
  if (!items) return <LoadingState />;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtersActive = Boolean(query.trim() || status !== "ALL");

  return (
    <section>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#18352e]">
            Customer accounts
          </h2>
          <p className="mt-1 text-sm text-[#788883]">
            Review account access and apply security controls with a recorded
            reason.
          </p>
        </div>
        <span className="text-xs font-semibold text-[#71827d]">
          {items.length} of {total} shown
        </span>
      </div>

      <div className="mt-5 grid gap-3 rounded-[20px] border border-[#dce5e1] bg-white p-3 shadow-[0_14px_35px_-32px_rgba(13,56,45,.5)] sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:p-4">
        <label className="relative block">
          <span className="sr-only">Search customers</span>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#82918c]"
          />
          <input
            type="search"
            maxLength={100}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search name, email or account"
            className="h-11 w-full rounded-xl border border-[#d5dfdb] bg-[#f8faf9] pl-10 pr-4 text-sm text-[#18352e] outline-none transition placeholder:text-[#93a09c] focus:border-[#087a5b] focus:bg-white focus:ring-2 focus:ring-[#087a5b]/10"
          />
        </label>
        <label>
          <span className="sr-only">Account status</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(
                event.target.value as NonNullable<
                  AdminCustomerFilters["status"]
                >,
              );
              setPage(1);
            }}
            className="h-11 w-full rounded-xl border border-[#d5dfdb] bg-[#f8faf9] px-3 text-sm font-semibold text-[#39574f] outline-none transition focus:border-[#087a5b] focus:bg-white focus:ring-2 focus:ring-[#087a5b]/10"
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="FROZEN">Frozen</option>
            <option value="CLOSED">Closed</option>
          </select>
        </label>
        <button
          type="button"
          disabled={!filtersActive}
          onClick={() => {
            setQuery("");
            setStatus("ALL");
            setPage(1);
          }}
          className="h-11 rounded-xl border border-[#d5dfdb] px-4 text-xs font-bold text-[#526b64] transition hover:bg-[#f1f6f4] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Clear filters
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <div
        className={`mt-5 overflow-hidden rounded-[22px] border border-[#dce5e1] bg-white shadow-[0_16px_40px_-36px_rgba(13,56,45,.55)] transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}
        aria-busy={loading}
      >
        {items.map((customer) => {
          const account = customer.accounts[0];
          const initials =
            `${customer.firstName[0] ?? ""}${customer.lastName[0] ?? ""}`.toUpperCase();
          return (
            <article
              key={customer.id}
              className="grid gap-4 border-b border-[#e8eeeb] p-4 last:border-0 sm:p-5 lg:grid-cols-[minmax(220px,1.2fr)_minmax(180px,1fr)_minmax(140px,.7fr)_auto] lg:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e5f1ed] text-xs font-bold text-[#087a5b]">
                  {initials}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-[#28483f]">
                    {customer.firstName} {customer.lastName}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-[#7b8b86]">
                    {customer.email}
                  </span>
                </span>
              </div>
              {account ? (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#8b9894]">
                    Account
                  </p>
                  <p className="mt-1 font-mono text-xs font-bold text-[#38564e]">
                    {account.accountNumber}
                  </p>
                  <p className="mt-1 text-[11px] text-[#82908c]">
                    {formatMoney(account.balance, account.currency)} ·{" "}
                    {account.type.toLowerCase()}
                  </p>
                </div>
              ) : (
                <span className="text-xs text-[#879590]">No bank account</span>
              )}
              <div>
                {account && (
                  <>
                    <StatusBadge status={account.status} />
                    <p className="mt-2 text-[10px] text-[#909c98]">
                      Joined{" "}
                      {formatDate(customer.createdAt ?? account.createdAt)}
                    </p>
                  </>
                )}
              </div>
              <div className="lg:text-right">
                {account && account.status !== "CLOSED" && (
                  <button
                    type="button"
                    onClick={() => openAction(customer, account)}
                    className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold transition ${account.status === "FROZEN" ? "border-[#9bc7b9] bg-[#eff8f4] text-[#087a5b] hover:bg-[#e3f2ec]" : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"}`}
                  >
                    <Icon
                      name={account.status === "FROZEN" ? "shield" : "x"}
                      className="h-4 w-4"
                    />
                    {account.status === "FROZEN" ? "Unfreeze" : "Freeze"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
        {items.length === 0 && (
          <div className="p-5">
            <EmptyState message="No customers found." />
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <nav
          className="mt-4 flex items-center justify-between gap-3"
          aria-label="Customer pagination"
        >
          <button
            type="button"
            disabled={page === 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="h-10 rounded-xl border border-[#d5dfdb] bg-white px-4 text-xs font-bold text-[#39574f] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Previous
          </button>
          <span className="text-xs font-semibold text-[#71827d]">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page === totalPages || loading}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            className="h-10 rounded-xl border border-[#d5dfdb] bg-white px-4 text-xs font-bold text-[#39574f] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Next
          </button>
        </nav>
      )}

      {action && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#10231f]/55 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && closeAction()
          }
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="accountActionTitle"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[22px] bg-white p-4 shadow-2xl min-[380px]:p-5 sm:rounded-3xl sm:p-6"
          >
            <div className="flex items-start gap-4">
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${action.mode === "freeze" ? "bg-red-50 text-red-700" : "bg-[#e5f2ed] text-[#087a5b]"}`}
              >
                <Icon name="shield" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3
                  id="accountActionTitle"
                  className="text-lg font-bold text-[#18352e]"
                >
                  {action.mode === "freeze"
                    ? "Freeze account"
                    : "Unfreeze account"}
                </h3>
                <p className="mt-1 text-xs leading-5 text-[#74847f]">
                  {action.customer.firstName} {action.customer.lastName} ·{" "}
                  {action.account.accountNumber}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={closeAction}
                className="ml-auto rounded-lg p-2 text-[#7d8c88] hover:bg-[#f0f4f2]"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitAction} className="mt-6">
              <label
                htmlFor="accountActionReason"
                className="text-xs font-bold text-[#39574f]"
              >
                Reason for this action
              </label>
              <textarea
                id="accountActionReason"
                autoFocus
                required
                minLength={10}
                maxLength={500}
                rows={4}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={
                  action.mode === "freeze"
                    ? "Explain why access must be temporarily restricted…"
                    : "Explain why account access is being restored…"
                }
                className="mt-2 w-full resize-none rounded-xl border border-[#ccd8d3] bg-[#fbfcfb] p-4 text-sm leading-6 text-[#18352e] outline-none focus:border-[#087a5b] focus:bg-white"
              />
              <div className="mt-2 flex flex-col gap-1 text-[10px] text-[#8a9894] min-[380px]:flex-row min-[380px]:justify-between">
                <span>The customer will receive this reason.</span>
                <span>{reason.length}/500</span>
              </div>
              {actionError && (
                <p
                  className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
                  role="alert"
                >
                  {actionError}
                </p>
              )}
              <div className="mt-5 grid gap-3 min-[360px]:grid-cols-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeAction}
                  className="h-11 rounded-xl border border-[#d5dfdb] text-xs font-bold text-[#526b64]"
                >
                  Cancel
                </button>
                <button
                  disabled={saving || reason.trim().length < 10}
                  className={`h-11 rounded-xl text-xs font-bold text-white disabled:bg-[#a8b8b3] ${action.mode === "freeze" ? "bg-red-600 hover:bg-red-700" : "bg-[#087a5b] hover:bg-[#06694f]"}`}
                >
                  {saving
                    ? "Saving…"
                    : action.mode === "freeze"
                      ? "Freeze account"
                      : "Restore access"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
