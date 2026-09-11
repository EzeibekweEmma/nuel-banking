import Link from "next/link";
import { Transaction } from "../lib/api";
import { formatDate, formatMoney, transactionName } from "../lib/format";
import { Icon } from "./icons";
import { StatusBadge } from "./status-badge";

export function TransactionRow({
  transaction,
  currency = "NGN",
  showStatus = false,
}: {
  transaction: Transaction;
  currency?: string;
  showStatus?: boolean;
}) {
  const name = transactionName(transaction);
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const credit = transaction.direction === "CREDIT";
  const deposit = transaction.kind === "DEPOSIT";

  return (
    <Link
      href={`/transactions/${transaction.id}`}
      className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl px-1 py-3 transition hover:bg-[#f5f8f6] min-[380px]:gap-3 min-[380px]:px-2 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:gap-4 sm:px-3"
    >
      <span
        className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-[11px] font-bold min-[380px]:h-11 min-[380px]:w-11 min-[380px]:text-xs ${credit ? "bg-emerald-50 text-[#087a5b]" : "bg-[#edf2ef] text-[#46625a]"}`}
      >
        {deposit ? (
          <Icon name="wallet" className="h-5 w-5" />
        ) : (
          initials || <Icon name="transfer" className="h-5 w-5" />
        )}
        <span
          className={`absolute -bottom-0.5 -right-0.5 grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-white ${credit ? "bg-[#d8f85c] text-[#174438]" : "bg-[#dfe9e5] text-[#087a5b]"}`}
        >
          <Icon
            name={credit ? "arrow-down-left" : "arrow-up-right"}
            className="h-2.5 w-2.5"
          />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-[#18352e]">
          {name}
        </span>
        <span className="mt-1 block truncate text-xs text-[#788985]">
          {deposit
            ? "Demo funding"
            : transaction.description ||
              (credit ? "Money received" : "Money sent")}{" "}
          · {formatDate(transaction.createdAt)}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span
          className={`block text-xs font-bold tabular-nums min-[380px]:text-sm ${credit ? "text-[#087a5b]" : "text-[#18352e]"}`}
        >
          {credit ? "+" : "−"}
          {formatMoney(transaction.amount, currency)}
        </span>
        <span className="mt-1 block text-[11px] font-medium text-[#889691]">
          {showStatus ? (
            <StatusBadge status={transaction.status} compact />
          ) : transaction.status === "COMPLETED" ? (
            "Successful"
          ) : (
            transaction.status.toLowerCase()
          )}
        </span>
      </span>
      <Icon
        name="chevron-right"
        className="hidden h-4 w-4 text-[#a6b3af] transition group-hover:translate-x-0.5 sm:block"
      />
    </Link>
  );
}
