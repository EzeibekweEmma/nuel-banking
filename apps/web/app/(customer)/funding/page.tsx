"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Icon } from "../../../components/icons";
import { ErrorState, LoadingState } from "../../../components/page-state";
import {
  Account,
  api,
  ApiError,
  DemoFundingConfiguration,
  DepositTransaction,
} from "../../../lib/api";
import { formatDate, formatMoney } from "../../../lib/format";

const presets = [10_000, 50_000, 100_000];

export default function FundingPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [configuration, setConfiguration] =
    useState<DemoFundingConfiguration | null>(null);
  const [deposits, setDeposits] = useState<DepositTransaction[]>([]);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const idempotencyKey = useRef("");

  useEffect(() => {
    Promise.all([api.account(), api.demoFundingConfiguration(), api.deposits()])
      .then(([nextAccount, nextConfiguration, nextDeposits]) => {
        setAccount(nextAccount);
        setConfiguration(nextConfiguration);
        setDeposits(nextDeposits);
      })
      .catch((reason: Error) => setPageError(reason.message));
  }, []);

  function updateAmount(value: string): void {
    setAmount(value);
    setError("");
    setSuccess("");
    idempotencyKey.current = "";
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!amount.trim() || loading || !configuration?.enabled) return;
    setLoading(true);
    setError("");
    setSuccess("");
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();

    try {
      const deposit = await api.demoFund(amount.trim(), idempotencyKey.current);
      setAccount((current) =>
        current ? { ...current, balance: deposit.balanceAfter } : current,
      );
      setDeposits((current) =>
        current.some((item) => item.id === deposit.id)
          ? current
          : [deposit, ...current],
      );
      setSuccess(
        `${formatMoney(deposit.amount, deposit.currency)} was added to your account.`,
      );
      setAmount("");
      idempotencyKey.current = "";
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "We could not fund your account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (pageError) return <ErrorState message={pageError} />;
  if (!account || !configuration) return <LoadingState />;

  const today = new Date().toISOString().slice(0, 10);
  const todaysDeposits = deposits.filter(
    (item) => item.createdAt.slice(0, 10) === today,
  );
  const fundedToday = todaysDeposits.reduce(
    (total, item) => total + Number(item.amount),
    0,
  );
  const dailyRemaining = Math.max(
    configuration.limits.dailyAmount - fundedToday,
    0,
  );
  const dailyProgress = Math.min(
    (fundedToday / configuration.limits.dailyAmount) * 100,
    100,
  );

  return (
    <div className="space-y-6">
      {!configuration.enabled && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800"
        >
          Demo funding is disabled in this environment.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
        <section className="rounded-[26px] border border-[#dce5e1] bg-white p-5 shadow-[0_16px_45px_-38px_rgba(13,56,45,.5)] sm:p-7">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#d8f85c] text-[#123b30]">
              <Icon name="wallet" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#18352e]">
                Fund your demo account
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#73837e]">
                Add test funds securely so you can explore transfers and fraud
                checks.
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-8">
            <label
              htmlFor="funding-amount"
              className="text-xs font-bold text-[#3b5750]"
            >
              Amount to add
            </label>
            <div className="mt-2 flex h-16 items-center rounded-2xl border border-[#cbd8d3] bg-[#fbfcfb] px-4 transition focus-within:border-[#087a5b] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#087a5b]/10">
              <span className="mr-3 text-lg font-bold text-[#547069]">₦</span>
              <input
                id="funding-amount"
                name="amount"
                value={amount}
                onChange={(event) => updateAmount(event.target.value)}
                inputMode="decimal"
                autoComplete="off"
                required
                placeholder="0.00"
                className="amount-input min-w-0 flex-1 border-0 bg-transparent text-2xl font-bold text-[#18352e] outline-none placeholder:text-[#a5b2ae]"
              />
              <span className="ml-3 text-xs font-bold text-[#879590]">NGN</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => updateAmount(String(preset))}
                  className="rounded-full border border-[#d8e2de] bg-[#f7f9f8] px-3 py-1.5 text-[11px] font-bold text-[#48635c] transition hover:border-[#8db8ab] hover:text-[#087a5b]"
                >
                  +{formatMoney(preset)}
                </button>
              ))}
            </div>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
              >
                {error}
              </div>
            )}
            {success && (
              <div
                role="status"
                className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"
              >
                <Icon name="shield" className="h-4 w-4 shrink-0" />
                {success}
              </div>
            )}

            <button
              disabled={loading || !configuration.enabled}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#087a5b] text-sm font-bold text-white transition hover:bg-[#066c50] disabled:bg-[#a7bbb5]"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Adding funds…
                </>
              ) : (
                <>
                  <Icon name="plus" className="h-4 w-4" />
                  Add money
                </>
              )}
            </button>
            <p className="mt-3 text-center text-[10px] leading-4 text-[#8a9894]">
              Demo funds have no real monetary value and cannot leave Nuel Bank.
            </p>
          </form>
        </section>

        <aside className="overflow-hidden rounded-[26px] bg-[#10372d] p-6 text-white shadow-[0_20px_50px_-34px_rgba(8,49,39,.75)]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#a5c4bb]">
              Available balance
            </p>
            <span className="rounded-full border border-[#d8f85c]/25 bg-[#d8f85c]/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-[#d8f85c]">
              Demo mode
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-[-0.04em]">
            {formatMoney(account.balance, account.currency)}
          </p>
          <p className="mt-2 text-xs text-[#8fb0a7]">
            Account ending in {account.accountNumber.slice(-4)}
          </p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[.055] p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#b8cec8]">Daily allowance</span>
              <span className="font-bold">
                {formatMoney(dailyRemaining)} left
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#d8f85c] transition-all"
                style={{ width: `${dailyProgress}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
              <Limit
                label="Per deposit"
                value={formatMoney(configuration.limits.maximumAmount)}
              />
              <Limit
                label="Deposits today"
                value={`${todaysDeposits.length} of ${configuration.limits.dailyDeposits}`}
              />
            </div>
          </div>

          <div className="mt-5 flex gap-3 rounded-2xl bg-[#d8f85c] p-4 text-[#17382f]">
            <Icon name="shield" className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-xs font-bold">Controlled test funding</p>
              <p className="mt-1 text-[11px] leading-5 text-[#3e594f]">
                Limits and duplicate protection are enforced by the API, never
                by the browser.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <section className="rounded-3xl border border-[#dce5e1] bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#18352e]">
              Recent deposits
            </h2>
            <p className="mt-1 text-xs text-[#82908d]">
              Your latest demo funding activity
            </p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf7f3] text-[#087a5b]">
            <Icon name="receipt" className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-4 divide-y divide-[#edf1ef]">
          {deposits.map((deposit) => (
            <div key={deposit.id} className="flex items-center gap-4 py-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[#087a5b]">
                <Icon name="arrow-down-left" className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#28483f]">
                  Demo account funding
                </p>
                <p className="mt-1 truncate text-[11px] text-[#82908d]">
                  {deposit.reference} · {formatDate(deposit.createdAt, true)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[#087a5b]">
                  +{formatMoney(deposit.amount, deposit.currency)}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  {deposit.status}
                </p>
              </div>
            </div>
          ))}
          {deposits.length === 0 && (
            <div className="grid min-h-40 place-items-center text-center">
              <div>
                <p className="text-sm font-semibold text-[#38544d]">
                  No deposits yet
                </p>
                <p className="mt-1 text-xs text-[#84928e]">
                  Your funding records will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Limit({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-[.12em] text-[#84a69d]">
        {label}
      </p>
      <p className="mt-1 text-xs font-bold text-white">{value}</p>
    </div>
  );
}
