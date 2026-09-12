"use client";

import { useEffect, useState } from "react";
import { Icon } from "../../../../components/icons";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../../components/page-state";
import { StatusBadge } from "../../../../components/status-badge";
import {
  api,
  FraudAssessment,
  FraudAssessmentFilters,
} from "../../../../lib/api";
import { formatDate, formatMoney } from "../../../../lib/format";

const PAGE_SIZE = 20;

export default function FraudPage() {
  const [items, setItems] = useState<FraudAssessment[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [riskLevel, setRiskLevel] =
    useState<NonNullable<FraudAssessmentFilters["riskLevel"]>>("ALL");
  const [decision, setDecision] =
    useState<NonNullable<FraudAssessmentFilters["decision"]>>("ALL");
  const [status, setStatus] =
    useState<NonNullable<FraudAssessmentFilters["status"]>>("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setError("");
    const timer = window.setTimeout(
      () => {
        setLoading(true);
        api
          .adminAssessments({
            page,
            limit: PAGE_SIZE,
            query: query.trim(),
            riskLevel,
            decision,
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
  }, [decision, page, query, riskLevel, status]);

  if (error && !items) return <ErrorState message={error} />;
  if (!items) return <LoadingState />;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtersActive = Boolean(
    query.trim() ||
    riskLevel !== "ALL" ||
    decision !== "ALL" ||
    status !== "ALL",
  );

  function resetFilters(): void {
    setQuery("");
    setRiskLevel("ALL");
    setDecision("ALL");
    setStatus("ALL");
    setPage(1);
  }

  return (
    <section>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#18352e]">
            Fraud assessments
          </h2>
          <p className="mt-1 text-sm text-[#788883]">
            Review risk signals, verification decisions, and transaction
            outcomes.
          </p>
        </div>
        <span className="text-xs font-semibold text-[#71827d]">
          {items.length} of {total} shown
        </span>
      </div>

      <div className="mt-5 grid gap-3 rounded-[20px] border border-[#dce5e1] bg-white p-3 shadow-[0_14px_35px_-32px_rgba(13,56,45,.5)] sm:grid-cols-2 sm:p-4 xl:grid-cols-[minmax(250px,1fr)_150px_150px_160px_auto]">
        <label className="relative block sm:col-span-2 xl:col-span-1">
          <span className="sr-only">Search fraud assessments</span>
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

        <FilterSelect
          label="Risk level"
          value={riskLevel}
          options={["LOW", "MEDIUM", "HIGH"]}
          onChange={(value) => {
            setRiskLevel(
              value as NonNullable<FraudAssessmentFilters["riskLevel"]>,
            );
            setPage(1);
          }}
        />
        <FilterSelect
          label="Decision"
          value={decision}
          options={["APPROVE", "VERIFY", "HOLD"]}
          onChange={(value) => {
            setDecision(
              value as NonNullable<FraudAssessmentFilters["decision"]>,
            );
            setPage(1);
          }}
        />
        <FilterSelect
          label="Transaction status"
          value={status}
          options={["PENDING", "COMPLETED", "HELD", "REJECTED", "FAILED"]}
          onChange={(value) => {
            setStatus(value as NonNullable<FraudAssessmentFilters["status"]>);
            setPage(1);
          }}
        />
        <button
          type="button"
          disabled={!filtersActive}
          onClick={resetFilters}
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
        className={`mt-5 space-y-4 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}
        aria-busy={loading}
      >
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-[20px] border border-[#dce5e1] bg-white p-4 shadow-[0_16px_40px_-36px_rgba(13,56,45,.55)] sm:p-5"
          >
            <div className="flex flex-wrap justify-between gap-3">
              <div className="min-w-0">
                <p className="break-all font-semibold text-[#28483f]">
                  {item.transaction.reference}
                </p>
                <p className="mt-1 text-xs text-[#7b8b86] sm:text-sm">
                  {formatDate(item.transaction.createdAt)}
                </p>
              </div>
              <span
                className={`h-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold sm:text-sm ${item.riskLevel === "HIGH" ? "bg-red-100 text-red-700" : item.riskLevel === "MEDIUM" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
              >
                {item.riskLevel} · {item.riskScore}
              </span>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
              <Detail
                label="Amount"
                value={formatMoney(item.transaction.amount, "NGN")}
                emphasized
              />
              <Detail
                label="Sender"
                value={`${item.transaction.sourceAccount.user.firstName} ${item.transaction.sourceAccount.user.lastName} · ${item.transaction.sourceAccount.accountNumber}`}
              />
              <Detail
                label="Receiver"
                value={`${item.transaction.destinationAccount.user.firstName} ${item.transaction.destinationAccount.user.lastName} · ${item.transaction.destinationAccount.accountNumber}`}
              />
              <div>
                <dt className="text-[#7b8b86]">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={item.transaction.status} />
                </dd>
              </div>
              <Detail label="Decision" value={item.decision} />
            </dl>
            <p className="mt-4 break-words rounded-xl bg-[#f6f9f8] px-3 py-2.5 text-sm text-[#39574f]">
              <b>Flagging reasons:</b>{" "}
              {item.reasons.length ? item.reasons.join(", ") : "No flags"}
            </p>
          </article>
        ))}
        {items.length === 0 && (
          <EmptyState
            message={
              filtersActive
                ? "No fraud assessments match these filters."
                : "No fraud assessments found."
            }
          />
        )}
      </div>

      {totalPages > 1 && (
        <nav
          className="mt-4 flex items-center justify-between gap-3"
          aria-label="Fraud assessment pagination"
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
    </section>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-[#d5dfdb] bg-[#f8faf9] px-3 text-sm font-semibold text-[#39574f] outline-none transition focus:border-[#087a5b] focus:bg-white focus:ring-2 focus:ring-[#087a5b]/10"
      >
        <option value="ALL">All {label.toLowerCase()}s</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option.charAt(0) + option.slice(1).toLowerCase()}
          </option>
        ))}
      </select>
    </label>
  );
}

function Detail({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div>
      <dt className="text-[#7b8b86]">{label}</dt>
      <dd
        className={`mt-1 break-words text-[#28483f] ${emphasized ? "font-semibold" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
