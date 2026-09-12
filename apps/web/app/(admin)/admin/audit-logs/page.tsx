"use client";

import { useEffect, useState } from "react";
import { ListPagination } from "../../../../components/list-pagination";
import { Icon } from "../../../../components/icons";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../../components/page-state";
import { api, AuditLog } from "../../../../lib/api";
import { formatDate } from "../../../../lib/format";

const PAGE_SIZE = 20;
const AUDIT_ACTIONS = [
  "REGISTRATION_SUCCEEDED",
  "LOGIN_SUCCEEDED",
  "LOGIN_FAILED",
  "TRANSFER_CREATED",
  "TRANSFER_COMPLETED",
  "TRANSFER_HELD",
  "TRANSFER_FAILED",
  "TRANSACTION_APPROVED",
  "TRANSACTION_REJECTED",
  "FRAUD_ASSESSMENT_GENERATED",
  "FRAUD_ALERT_GENERATED",
  "ADMIN_REVIEW_PERFORMED",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_COMPLETED",
  "EMAIL_VERIFICATION_REQUESTED",
  "EMAIL_VERIFIED",
  "TRANSFER_VERIFICATION_CODE_SENT",
  "TRANSFER_VERIFICATION_SUCCEEDED",
  "TRANSFER_VERIFICATION_FAILED",
  "ACCOUNT_FROZEN",
  "ACCOUNT_UNFROZEN",
  "DEMO_DEPOSIT_COMPLETED",
  "PASSWORD_CHANGED",
  "PROFILE_UPDATED",
  "SESSION_REVOKED",
] as const;
const ENTITY_TYPES = [
  "User",
  "Account",
  "Transaction",
  "FraudAssessment",
  "Notification",
  "DepositTransaction",
  "RefreshToken",
] as const;

export default function AuditLogsPage() {
  const [items, setItems] = useState<AuditLog[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("ALL");
  const [entityType, setEntityType] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setError("");
    const timer = window.setTimeout(
      () => {
        setLoading(true);
        api
          .adminAuditLogs({
            page,
            limit: PAGE_SIZE,
            query: query.trim(),
            action,
            entityType,
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
  }, [action, entityType, page, query]);

  if (error && !items) return <ErrorState message={error} />;
  if (!items) return <LoadingState />;

  const filtersActive = Boolean(
    query.trim() || action !== "ALL" || entityType !== "ALL",
  );

  return (
    <section>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#18352e]">Audit logs</h2>
          <p className="mt-1 text-sm text-[#788883]">
            Trace security events and administrative actions across the bank.
          </p>
        </div>
        <span className="text-xs font-semibold text-[#71827d]">
          {items.length} of {total} shown
        </span>
      </div>

      <div className="mt-5 grid gap-3 rounded-[20px] border border-[#dce5e1] bg-white p-3 shadow-[0_14px_35px_-32px_rgba(13,56,45,.5)] sm:grid-cols-2 sm:p-4 xl:grid-cols-[minmax(250px,1fr)_220px_180px_auto]">
        <label className="relative block sm:col-span-2 xl:col-span-1">
          <span className="sr-only">Search audit logs</span>
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
            placeholder="Email, entity ID or type"
            className="h-11 w-full rounded-xl border border-[#d5dfdb] bg-[#f8faf9] pl-10 pr-4 text-sm text-[#18352e] outline-none transition placeholder:text-[#93a09c] focus:border-[#087a5b] focus:bg-white focus:ring-2 focus:ring-[#087a5b]/10"
          />
        </label>

        <label>
          <span className="sr-only">Audit action</span>
          <select
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
            className="h-11 w-full rounded-xl border border-[#d5dfdb] bg-[#f8faf9] px-3 text-sm font-semibold text-[#39574f] outline-none focus:border-[#087a5b] focus:bg-white focus:ring-2 focus:ring-[#087a5b]/10"
          >
            <option value="ALL">All actions</option>
            {AUDIT_ACTIONS.map((item) => (
              <option key={item} value={item}>
                {formatLabel(item)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Entity type</span>
          <select
            value={entityType}
            onChange={(event) => {
              setEntityType(event.target.value);
              setPage(1);
            }}
            className="h-11 w-full rounded-xl border border-[#d5dfdb] bg-[#f8faf9] px-3 text-sm font-semibold text-[#39574f] outline-none focus:border-[#087a5b] focus:bg-white focus:ring-2 focus:ring-[#087a5b]/10"
          >
            <option value="ALL">All entity types</option>
            {ENTITY_TYPES.map((item) => (
              <option key={item} value={item}>
                {splitPascalCase(item)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          disabled={!filtersActive}
          onClick={() => {
            setQuery("");
            setAction("ALL");
            setEntityType("ALL");
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
        className={`mt-5 overflow-hidden rounded-[20px] border border-[#dce5e1] bg-white shadow-[0_16px_40px_-36px_rgba(13,56,45,.55)] transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}
        aria-busy={loading}
      >
        {items.map((item) => {
          const reason =
            typeof item.metadata?.reason === "string"
              ? item.metadata.reason
              : "";
          return (
            <article
              key={item.id}
              className="grid gap-3 border-b border-[#e8eeeb] p-4 text-sm last:border-0 sm:p-5 lg:grid-cols-[minmax(220px,1fr)_minmax(200px,1fr)_auto] lg:items-center"
            >
              <div className="min-w-0">
                <p className="font-bold text-[#28483f]">
                  {formatLabel(item.action)}
                </p>
                {reason && (
                  <p className="mt-1 break-words text-xs leading-5 text-[#71827d]">
                    Reason: {reason}
                  </p>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[#526b64]">
                  {item.user?.email ?? "System"}
                </p>
                <p className="mt-1 break-all text-xs text-[#879590]">
                  {splitPascalCase(item.entityType)}
                  {item.entityId ? ` · ${item.entityId}` : ""}
                </p>
              </div>
              <time className="text-xs font-medium text-[#7b8b86]">
                {formatDate(item.createdAt)}
              </time>
            </article>
          );
        })}
        {items.length === 0 && (
          <div className="p-5">
            <EmptyState
              message={
                filtersActive
                  ? "No audit logs match these filters."
                  : "No audit logs found."
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
        label="Audit log"
        onPageChange={setPage}
      />
    </section>
  );
}

function formatLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function splitPascalCase(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}
