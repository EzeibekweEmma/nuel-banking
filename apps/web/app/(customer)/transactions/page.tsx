"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../components/page-state";
import { Icon } from "../../../components/icons";
import { TransactionRow } from "../../../components/transaction-row";
import { Account, api, Transaction } from "../../../lib/api";
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
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.transactions(), api.account()])
      .then(([transactions, nextAccount]) => {
        setItems(transactions);
        setAccount(nextAccount);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const filtered = useMemo(
    () =>
      items?.filter((item) => {
        const searchable = [
          item.reference,
          item.description,
          item.kind,
          item.direction,
          item.counterparty?.accountNumber,
          item.counterparty?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return (
          (status === "ALL" || item.status === status) &&
          (direction === "ALL" || item.direction === direction) &&
          searchable.includes(query.toLowerCase())
        );
      }) ?? [],
    [direction, items, query, status],
  );

  if (error) return <ErrorState message={error} />;
  if (!items || !account) return <LoadingState />;

  const moneyIn = items
    .filter(
      (item) => item.direction === "CREDIT" && item.status === "COMPLETED",
    )
    .reduce((total, item) => total + Number(item.amount), 0);
  const moneyOut = items
    .filter((item) => item.direction === "DEBIT" && item.status === "COMPLETED")
    .reduce((total, item) => total + Number(item.amount), 0);

  return (
    <section className="max-w-5xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-bold text-[#18352e]">
            Your money activity
          </h2>
          <p className="mt-1 text-sm text-[#788883]">
            {items.length} total{" "}
            {items.length === 1 ? "transaction" : "transactions"}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Icon
            name="search"
            className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b9995]"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search transactions"
            className="h-11 w-full rounded-xl border border-[#d5dfdb] bg-white pl-10 pr-4 text-sm outline-none focus:border-[#087a5b]"
          />
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <SummaryCard
          label="Money in"
          amount={moneyIn}
          currency={account.currency}
          credit
        />
        <SummaryCard
          label="Money out"
          amount={moneyOut}
          currency={account.currency}
        />
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {directions.map((item) => (
            <button
              key={item.value}
              onClick={() => setDirection(item.value)}
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
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-9 rounded-xl border border-[#d8e1dd] bg-white px-3 text-xs font-bold text-[#5e716b] outline-none focus:border-[#087a5b]"
        >
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item === "ALL"
                ? "Every status"
                : item[0] + item.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-5 rounded-[24px] border border-[#dce5e1] bg-white p-3 shadow-[0_14px_40px_-34px_rgba(13,56,45,.5)] sm:p-5">
        {filtered.length > 0 ? (
          <div className="divide-y divide-[#edf1ef]">
            {filtered.map((item) => (
              <TransactionRow
                key={item.id}
                transaction={item}
                currency={account.currency}
                showStatus
              />
            ))}
          </div>
        ) : (
          <EmptyState
            message={
              query || status !== "ALL" || direction !== "ALL"
                ? "No transactions match your filters."
                : "Your money activity will appear here."
            }
          />
        )}
      </div>
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
  amount: number;
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
