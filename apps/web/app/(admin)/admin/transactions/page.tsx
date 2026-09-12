"use client";

import { useEffect, useState } from "react";
import { AdminListPagination } from "../../../../components/admin-list-pagination";
import { AdminTransactionList } from "../../../../components/admin-transaction-list";
import { Icon } from "../../../../components/icons";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../../components/page-state";
import {
  AdminTransaction,
  AdminTransactionFilters,
  api,
} from "../../../../lib/api";

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const [items, setItems] = useState<AdminTransaction[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] =
    useState<NonNullable<AdminTransactionFilters["status"]>>("ALL");
  const [riskLevel, setRiskLevel] =
    useState<NonNullable<AdminTransactionFilters["riskLevel"]>>("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setError("");
    const timer = window.setTimeout(
      () => {
        setLoading(true);
        api
          .adminTransactions({
            page,
            limit: PAGE_SIZE,
            query: query.trim(),
            status,
            riskLevel,
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
  }, [page, query, riskLevel, status]);

  if (error && !items) return <ErrorState message={error} />;
  if (!items) return <LoadingState />;

  const filtersActive = Boolean(
    query.trim() || status !== "ALL" || riskLevel !== "ALL",
  );

  return (
    <section>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#18352e]">Transactions</h2>
          <p className="mt-1 text-sm text-[#788883]">
            Monitor transfers, statuses, and fraud risk across customer
            accounts.
          </p>
        </div>
        <span className="text-xs font-semibold text-[#71827d]">
          {items.length} of {total} shown
        </span>
      </div>

      <div className="mt-5 grid gap-3 rounded-[20px] border border-[#dce5e1] bg-white p-3 shadow-[0_14px_35px_-32px_rgba(13,56,45,.5)] sm:grid-cols-2 sm:p-4 xl:grid-cols-[minmax(260px,1fr)_180px_160px_auto]">
        <label className="relative block sm:col-span-2 xl:col-span-1">
          <span className="sr-only">Search transactions</span>
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
            placeholder="Reference, name or account"
            className="h-11 w-full rounded-xl border border-[#d5dfdb] bg-[#f8faf9] pl-10 pr-4 text-sm text-[#18352e] outline-none transition placeholder:text-[#93a09c] focus:border-[#087a5b] focus:bg-white focus:ring-2 focus:ring-[#087a5b]/10"
          />
        </label>

        <label>
          <span className="sr-only">Transaction status</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(
                event.target.value as NonNullable<
                  AdminTransactionFilters["status"]
                >,
              );
              setPage(1);
            }}
            className="h-11 w-full rounded-xl border border-[#d5dfdb] bg-[#f8faf9] px-3 text-sm font-semibold text-[#39574f] outline-none focus:border-[#087a5b] focus:bg-white focus:ring-2 focus:ring-[#087a5b]/10"
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="HELD">Held</option>
            <option value="REJECTED">Rejected</option>
            <option value="FAILED">Failed</option>
          </select>
        </label>

        <label>
          <span className="sr-only">Fraud risk level</span>
          <select
            value={riskLevel}
            onChange={(event) => {
              setRiskLevel(
                event.target.value as NonNullable<
                  AdminTransactionFilters["riskLevel"]
                >,
              );
              setPage(1);
            }}
            className="h-11 w-full rounded-xl border border-[#d5dfdb] bg-[#f8faf9] px-3 text-sm font-semibold text-[#39574f] outline-none focus:border-[#087a5b] focus:bg-white focus:ring-2 focus:ring-[#087a5b]/10"
          >
            <option value="ALL">All risk levels</option>
            <option value="LOW">Low risk</option>
            <option value="MEDIUM">Medium risk</option>
            <option value="HIGH">High risk</option>
          </select>
        </label>

        <button
          type="button"
          disabled={!filtersActive}
          onClick={() => {
            setQuery("");
            setStatus("ALL");
            setRiskLevel("ALL");
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
        className={`transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}
        aria-busy={loading}
      >
        {items.length ? (
          <AdminTransactionList items={items} />
        ) : (
          <div className="mt-5">
            <EmptyState
              message={
                filtersActive
                  ? "No transactions match these filters."
                  : "No transactions found."
              }
            />
          </div>
        )}
      </div>

      <AdminListPagination
        page={page}
        total={total}
        limit={PAGE_SIZE}
        loading={loading}
        label="Transaction"
        onPageChange={setPage}
      />
    </section>
  );
}
