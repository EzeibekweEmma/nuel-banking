"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorState, LoadingState } from "../../../../components/page-state";
import { Icon } from "../../../../components/icons";
import { StatusBadge } from "../../../../components/status-badge";
import { Account, api, Transaction } from "../../../../lib/api";
import {
  formatDate,
  formatMoney,
  transactionName,
} from "../../../../lib/format";

export default function TransactionDetailPage() {
  const params = useParams<{ id: string }>();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.transaction(params.id), api.account()])
      .then(([nextTransaction, nextAccount]) => {
        setTransaction(nextTransaction);
        setAccount(nextAccount);
      })
      .catch((reason: Error) => setError(reason.message));
  }, [params.id]);

  if (error) return <ErrorState message={error} />;
  if (!transaction || !account) return <LoadingState />;

  const counterparty = transactionName(transaction);
  const credit = transaction.direction === "CREDIT";
  const deposit = transaction.kind === "DEPOSIT";
  const heading = deposit
    ? "Demo account funding"
    : credit
      ? `Received from ${counterparty}`
      : `Transfer to ${counterparty}`;

  return (
    <section className="max-w-3xl">
      <Link
        href="/transactions"
        className="mb-5 inline-flex items-center gap-1 text-xs font-bold text-[#087a5b]"
      >
        ← Back to transactions
      </Link>
      <div className="overflow-hidden rounded-[26px] border border-[#dce5e1] bg-white shadow-[0_18px_50px_-38px_rgba(13,56,45,.55)]">
        <div className="border-b border-[#e5ebe8] bg-[#f7faf8] px-6 py-8 text-center sm:px-10">
          <span
            className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${credit ? "bg-emerald-100 text-[#087a5b]" : "bg-[#e5f2ed] text-[#31574d]"}`}
          >
            <Icon
              name={
                deposit
                  ? "wallet"
                  : credit
                    ? "arrow-down-left"
                    : "arrow-up-right"
              }
              className="h-6 w-6"
            />
          </span>
          <p className="mt-4 text-xs font-semibold text-[#7a8a85]">{heading}</p>
          <h2
            className={`mt-2 text-4xl font-bold tracking-[-0.045em] ${credit ? "text-[#087a5b]" : "text-[#18352e]"}`}
          >
            {credit ? "+" : "−"}
            {formatMoney(transaction.amount, account.currency)}
          </h2>
          <div className="mt-3">
            <StatusBadge status={transaction.status} />
          </div>
        </div>
        <dl className="divide-y divide-[#edf1ef] px-6 py-2 sm:px-10">
          <DetailRow
            label={deposit ? "Funding source" : credit ? "Sender" : "Recipient"}
            value={counterparty}
          />
          {!deposit && (
            <DetailRow
              label={`${credit ? "Sender" : "Recipient"} account`}
              value={transaction.counterparty?.accountNumber ?? "—"}
            />
          )}
          <DetailRow
            label="Transaction type"
            value={
              deposit
                ? "Demo deposit"
                : credit
                  ? "Incoming transfer"
                  : "Outgoing transfer"
            }
          />
          <DetailRow
            label="Narration"
            value={
              transaction.description ||
              (credit ? "Money received" : "Money transfer")
            }
          />
          <DetailRow
            label="Date & time"
            value={formatDate(transaction.createdAt, true)}
          />
          <DetailRow
            label="Reference"
            value={transaction.reference.toUpperCase()}
            mono
          />
          {deposit && transaction.balanceAfter && (
            <DetailRow
              label="Balance after deposit"
              value={formatMoney(transaction.balanceAfter, account.currency)}
            />
          )}
          <DetailRow label="Fee" value={formatMoney(0, account.currency)} />
        </dl>
        {!credit && transaction.fraudAssessment && (
          <div className="m-6 flex items-start gap-3 rounded-2xl bg-[#f1f7f4] p-4 sm:mx-10">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#dff0e9] text-[#087a5b]">
              <Icon name="shield" className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-[#31554b]">
                Security check completed
              </p>
              <p className="mt-1 text-[11px] leading-5 text-[#71827d]">
                {transaction.fraudAssessment.riskLevel === "LOW"
                  ? "No unusual activity was found for this transfer."
                  : "This transfer received additional review based on account activity."}
              </p>
            </div>
          </div>
        )}
        {credit && (
          <div className="m-6 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 sm:mx-10">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-[#087a5b]">
              <Icon name="shield" className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-[#31554b]">Funds received</p>
              <p className="mt-1 text-[11px] leading-5 text-[#71827d]">
                This credit has been completed and is included in your available
                balance.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1 py-4 text-sm sm:grid-cols-[180px_1fr] sm:items-center">
      <dt className="text-[#7b8a86]">{label}</dt>
      <dd
        className={
          "break-all font-semibold text-[#2d4a42] sm:text-right " +
          (mono ? "font-mono text-xs" : "")
        }
      >
        {value}
      </dd>
    </div>
  );
}
