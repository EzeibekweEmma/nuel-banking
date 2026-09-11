"use client";

import { useEffect, useState } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../components/page-state";
import { Icon } from "../../../components/icons";
import { TransactionRow } from "../../../components/transaction-row";
import {
  Account,
  api,
  Transaction,
  TransactionFilters,
} from "../../../lib/api";
import { formatMoney } from "../../../lib/format";

const statuses = ["ALL", "COMPLETED", "PENDING", "HELD", "REJECTED", "FAILED"];
const directions = [
  { value: "ALL", label: "All activity" },
  { value: "CREDIT", label: "Money in" },
  { value: "DEBIT", label: "Money out" },
];

export default function TransactionsPage() {
  const [items, setItems] = useState<Transaction[] | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [direction, setDirection] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({ moneyIn: "0", moneyOut: "0" });
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  useEffect(() => {
    api
      .account()
      .then(setAccount)
      .catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(
      () => {
        setError("");
        api
          .transactions({ page, limit: 10, query, status, direction, from, to })
          .then((result) => {
            if (cancelled) return;
            setItems(result.data);
            setTotal(result.total);
            setTotalPages(result.totalPages);
            setSummary(result.summary);
          })
          .catch((reason: Error) => {
            if (!cancelled) setError(reason.message);
          });
      },
      query ? 300 : 0,
    );
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [direction, from, page, query, status, to]);

  function filters(): TransactionFilters {
    return { query, status, direction, from, to };
  }

  async function exportStatement(format: "csv" | "pdf"): Promise<void> {
    setExporting(format);
    setError("");
    try {
      const blob = await api.downloadStatement(format, filters());
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `nuel-statement-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to export your statement.",
      );
    } finally {
      setExporting(null);
    }
  }

  if (error && !items) return <ErrorState message={error} />;
  if (!items || !account) return <LoadingState />;

  return (
    <section className="max-w-5xl">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-xl font-bold text-[#18352e]">
            Your money activity
          </h2>
          <p className="mt-1 text-sm text-[#788883]">
            {total} matching {total === 1 ? "transaction" : "transactions"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={exporting !== null}
            onClick={() => void exportStatement("csv")}
            className="h-10 rounded-xl border border-[#cbd8d3] bg-white px-4 text-xs font-bold text-[#315048] hover:border-[#087a5b] disabled:opacity-60"
          >
            {exporting === "csv" ? "Preparing…" : "Export CSV"}
          </button>
          <button
            type="button"
            disabled={exporting !== null}
            onClick={() => void exportStatement("pdf")}
            className="h-10 rounded-xl bg-[#183d33] px-4 text-xs font-bold text-white hover:bg-[#0d3027] disabled:opacity-60"
          >
            {exporting === "pdf" ? "Preparing…" : "Export PDF"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <SummaryCard
          label="Money in"
          amount={summary.moneyIn}
          currency={account.currency}
          credit
        />
        <SummaryCard
          label="Money out"
          amount={summary.moneyOut}
          currency={account.currency}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-[#dce5e1] bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(130px,auto))]">
          <div className="relative">
            <Icon
              name="search"
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b9995]"
            />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Name, account or reference"
              className="h-11 w-full rounded-xl border border-[#d5dfdb] bg-[#fbfcfb] pl-10 pr-4 text-sm outline-none focus:border-[#087a5b]"
            />
          </div>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-[#d8e1dd] bg-[#fbfcfb] px-3 text-xs font-bold text-[#5e716b] outline-none focus:border-[#087a5b]"
          >
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item === "ALL"
                  ? "Every status"
                  : item[0] + item.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <input
            aria-label="Start date"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-[#d8e1dd] bg-[#fbfcfb] px-3 text-xs font-semibold text-[#5e716b] outline-none focus:border-[#087a5b]"
          />
          <input
            aria-label="End date"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-[#d8e1dd] bg-[#fbfcfb] px-3 text-xs font-semibold text-[#5e716b] outline-none focus:border-[#087a5b]"
          />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {directions.map((item) => (
            <button
              key={item.value}
              onClick={() => {
                setDirection(item.value);
                setPage(1);
              }}
              className={
                "whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition " +
                (direction === item.value
                  ? "bg-[#183d33] text-white"
                  : "border border-[#d8e1dd] bg-white text-[#6c7d78] hover:border-[#9dbcb3]")
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-[#dce5e1] bg-white p-3 shadow-[0_14px_40px_-34px_rgba(13,56,45,.5)] sm:p-5">
        {items.length > 0 ? (
          <div className="divide-y divide-[#edf1ef]">
            {items.map((item) => (
              <TransactionRow
                key={item.id}
                transaction={item}
                currency={account.currency}
                showStatus
              />
            ))}
          </div>
        ) : (
          <EmptyState message="No transactions match your filters." />
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs font-semibold text-[#74847f]">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="h-9 rounded-xl border border-[#d5dfdb] bg-white px-4 text-xs font-bold text-[#315048] disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="h-9 rounded-xl border border-[#d5dfdb] bg-white px-4 text-xs font-bold text-[#315048] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryCard({
  label,
  amount,
  currency,
  credit = false,
}: {
  label: string;
  amount: string;
  currency: string;
  credit?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#dce5e1] bg-white p-4">
      <span
        className={`grid h-10 w-10 place-items-center rounded-xl ${credit ? "bg-emerald-50 text-[#087a5b]" : "bg-[#f0f3f2] text-[#456159]"}`}
      >
        <Icon
          name={credit ? "arrow-down-left" : "arrow-up-right"}
          className="h-4 w-4"
        />
      </span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#83918d]">
          {label}
        </p>
        <p
          className={`mt-1 text-base font-bold ${credit ? "text-[#087a5b]" : "text-[#18352e]"}`}
        >
          {credit ? "+" : "−"}
          {formatMoney(amount, currency)}
        </p>
      </div>
    </div>
  );
}
