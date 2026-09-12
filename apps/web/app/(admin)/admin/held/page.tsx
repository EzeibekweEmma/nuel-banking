"use client";

import { useEffect, useState } from "react";
import { ListPagination } from "../../../../components/list-pagination";
import { AdminTransactionList } from "../../../../components/admin-transaction-list";
import { Icon } from "../../../../components/icons";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../../components/page-state";
import { AdminTransaction, api } from "../../../../lib/api";

const PAGE_SIZE = 20;

export default function HeldPage() {
  const [items, setItems] = useState<AdminTransaction[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setError("");
    const timer = window.setTimeout(
      () => {
        setLoading(true);
        api
          .adminHeldTransactions({
            page,
            limit: PAGE_SIZE,
            query: query.trim(),
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
  }, [page, query, reloadKey]);

  if (error && !items) return <ErrorState message={error} />;
  if (!items) return <LoadingState />;

  const filterActive = Boolean(query.trim());

  function reloadAfterReview(): void {
    if (items?.length === 1 && page > 1) {
      setPage((current) => current - 1);
      return;
    }
    setReloadKey((current) => current + 1);
  }

  return (
    <section>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#18352e]">
            Held transaction reviews
          </h2>
          <p className="mt-1 text-sm text-[#788883]">
            Approval moves money atomically; rejection never does.
          </p>
        </div>
        <span className="text-xs font-semibold text-[#71827d]">
          {items.length} of {total} awaiting review
        </span>
      </div>

      <div className="mt-5 grid gap-3 rounded-[20px] border border-[#dce5e1] bg-white p-3 shadow-[0_14px_35px_-32px_rgba(13,56,45,.5)] sm:grid-cols-[minmax(0,1fr)_auto] sm:p-4">
        <label className="relative block">
          <span className="sr-only">Search held transactions</span>
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
            placeholder="Search reference, name or account"
            className="h-11 w-full rounded-xl border border-[#d5dfdb] bg-[#f8faf9] pl-10 pr-4 text-sm text-[#18352e] outline-none transition placeholder:text-[#93a09c] focus:border-[#087a5b] focus:bg-white focus:ring-2 focus:ring-[#087a5b]/10"
          />
        </label>
        <button
          type="button"
          disabled={!filterActive}
          onClick={() => {
            setQuery("");
            setPage(1);
          }}
          className="h-11 rounded-xl border border-[#d5dfdb] px-4 text-xs font-bold text-[#526b64] transition hover:bg-[#f1f6f4] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Clear search
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
          <AdminTransactionList
            items={items}
            reviewable
            onUpdated={reloadAfterReview}
          />
        ) : (
          <div className="mt-5">
            <EmptyState
              message={
                filterActive
                  ? "No held transactions match this search."
                  : "No transactions are awaiting review."
              }
            />
          </div>
        )}
      </div>

      <ListPagination
        page={page}
        total={total}
        limit={PAGE_SIZE}
        loading={loading}
        label="Held transaction"
        onPageChange={setPage}
      />
    </section>
  );
}
