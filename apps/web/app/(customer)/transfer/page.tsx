"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ErrorState, LoadingState } from "../../../components/page-state";
import { Icon } from "../../../components/icons";
import {
  Account,
  api,
  ApiError,
  Beneficiary,
  Recipient,
  Transaction,
} from "../../../lib/api";
import { formatMoney } from "../../../lib/format";

type Step = "recipient" | "amount" | "review" | "result";

export default function TransferPage() {
  const [step, setStep] = useState<Step>("recipient");
  const [account, setAccount] = useState<Account | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<Transaction | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationNotice, setVerificationNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.account(), api.beneficiaries()])
      .then(([nextAccount, nextBeneficiaries]) => {
        setAccount(nextAccount);
        setBeneficiaries(nextBeneficiaries);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  async function findRecipient(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (!/^\d{10}$/.test(accountNumber)) {
      setError("Enter a valid 10-digit account number.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setRecipient(await api.lookupRecipient(accountNumber));
      setStep("amount");
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "We could not verify this account.",
      );
    } finally {
      setLoading(false);
    }
  }

  function chooseBeneficiary(beneficiary: Beneficiary): void {
    const owner = beneficiary.account.user;
    if (!owner) {
      setError(
        "This beneficiary could not be verified. Please enter the account number instead.",
      );
      return;
    }
    setAccountNumber(beneficiary.account.accountNumber);
    setRecipient({
      accountNumber: beneficiary.account.accountNumber,
      currency: beneficiary.account.currency,
      firstName: owner.firstName,
      lastName: owner.lastName,
    });
    setError("");
    setStep("amount");
  }

  function continueToReview(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }
    if (account && Number(amount) > Number(account.balance)) {
      setError("This amount is more than your available balance.");
      return;
    }
    setError("");
    setStep("review");
  }

  async function submitTransfer(): Promise<void> {
    if (!recipient) return;
    setLoading(true);
    setError("");
    try {
      const transaction = await api.transfer(
        {
          destinationAccountNumber: recipient.accountNumber,
          amount,
          description: description.trim() || undefined,
        },
        crypto.randomUUID(),
      );
      setResult(transaction);
      setStep("result");
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "We could not complete your transfer.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyTransfer(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (!result) return;
    if (!/^\d{6}$/.test(verificationCode)) {
      setError("Enter the 6-digit code sent to your email.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResult(await api.verifyTransfer(result.id, verificationCode));
      setVerificationCode("");
      setVerificationNotice("");
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "Verification could not be completed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function resendVerificationCode(): Promise<void> {
    if (!result) return;
    setLoading(true);
    setError("");
    setVerificationNotice("");
    try {
      const response = await api.resendTransferVerificationCode(result.id);
      setVerificationCode("");
      setVerificationNotice(response.message);
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "We could not send another verification code.",
      );
    } finally {
      setLoading(false);
    }
  }

  function startAgain(): void {
    setStep("recipient");
    setRecipient(null);
    setAccountNumber("");
    setAmount("");
    setDescription("");
    setResult(null);
    setVerificationCode("");
    setVerificationNotice("");
    setError("");
    void api.account().then(setAccount);
  }

  if (!account && !error) return <LoadingState />;
  const stepNumber = step === "recipient" ? 1 : step === "amount" ? 2 : 3;

  return (
    <div className="max-w-5xl">
      {step !== "result" && (
        <div className="mb-6 flex items-center gap-1.5 min-[380px]:gap-3">
          {[
            ["Recipient", 1],
            ["Amount", 2],
            ["Review", 3],
          ].map(([label, number]) => {
            const numericNumber = Number(number);
            const active = stepNumber >= numericNumber;
            return (
              <div
                key={String(label)}
                className="flex flex-1 items-center gap-2"
              >
                <span
                  className={
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold " +
                    (active
                      ? "bg-[#087a5b] text-white"
                      : "bg-[#e1e8e5] text-[#85928e]")
                  }
                >
                  {numericNumber}
                </span>
                <span
                  className={
                    "hidden text-xs font-semibold sm:block " +
                    (active ? "text-[#28483f]" : "text-[#8a9692]")
                  }
                >
                  {label}
                </span>
                {numericNumber < 3 && (
                  <span
                    className={
                      "ml-1 h-px flex-1 " +
                      (stepNumber > numericNumber
                        ? "bg-[#65aa96]"
                        : "bg-[#d5deda]")
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-[22px] border border-[#dce5e1] bg-white p-4 shadow-[0_14px_40px_-34px_rgba(13,56,45,.55)] min-[380px]:p-5 sm:rounded-3xl sm:p-7">
          {step === "recipient" && (
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#18352e]">
                Who are you sending to?
              </h2>
              <p className="mt-1 text-sm text-[#74847f]">
                Enter a Nuel account number or choose a saved beneficiary.
              </p>
              <form onSubmit={findRecipient} className="mt-7">
                <label
                  htmlFor="accountNumber"
                  className="text-xs font-bold text-[#39574f]"
                >
                  Account number
                </label>
                <div className="relative mt-2">
                  <Icon
                    name="wallet"
                    className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8b9a96]"
                  />
                  <input
                    id="accountNumber"
                    autoFocus
                    inputMode="numeric"
                    maxLength={10}
                    value={accountNumber}
                    onChange={(event) =>
                      setAccountNumber(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Enter 10-digit account number"
                    className="h-14 w-full rounded-xl border border-[#ccd8d3] bg-[#fbfcfb] pl-12 pr-4 text-sm font-semibold tracking-wide text-[#18352e] outline-none transition placeholder:font-normal placeholder:tracking-normal placeholder:text-[#a0aba8] focus:border-[#087a5b] focus:bg-white"
                  />
                </div>
                {error && (
                  <div className="mt-4">
                    <ErrorState message={error} />
                  </div>
                )}
                <button
                  disabled={loading || accountNumber.length !== 10}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#087a5b] text-sm font-bold text-white transition hover:bg-[#06694f] disabled:bg-[#b7c8c2]"
                >
                  {loading ? "Checking account…" : "Continue"}
                  <Icon name="chevron-right" className="h-4 w-4" />
                </button>
              </form>

              <div className="mt-8 border-t border-[#e5ebe8] pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#28483f]">
                    Saved beneficiaries
                  </h3>
                  <Link
                    href="/beneficiaries"
                    className="text-xs font-bold text-[#087a5b]"
                  >
                    Manage
                  </Link>
                </div>
                {beneficiaries.length > 0 ? (
                  <div className="mt-4 grid gap-3 min-[340px]:grid-cols-2 sm:grid-cols-3">
                    {beneficiaries.slice(0, 6).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => chooseBeneficiary(item)}
                        className="rounded-2xl border border-[#e0e7e4] p-3 text-left transition hover:border-[#8ab7aa] hover:bg-[#f5faf8]"
                      >
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e6f1ed] text-xs font-bold text-[#087a5b]">
                          {item.nickname.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="mt-3 block truncate text-xs font-bold text-[#28483f]">
                          {item.nickname}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-[#84918d]">
                          •••• {item.account.accountNumber.slice(-4)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-[#f5f8f6] px-4 py-4 text-xs text-[#7e8d89]">
                    No saved beneficiaries yet. Accounts you trust can be saved
                    for quicker transfers.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === "amount" && recipient && (
            <div>
              <button
                onClick={() => setStep("recipient")}
                className="mb-5 text-xs font-bold text-[#087a5b]"
              >
                ← Change recipient
              </button>
              <div className="flex items-center gap-3 rounded-2xl bg-[#f2f7f5] p-3 min-[380px]:p-4">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[#d8f85c] text-sm font-extrabold text-[#173c32]">
                  {recipient.firstName[0]}
                  {recipient.lastName[0]}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#18352e]">
                    {recipient.firstName} {recipient.lastName}
                  </p>
                  <p className="mt-1 break-words text-xs text-[#788984]">
                    Nuel Bank · {recipient.accountNumber}
                  </p>
                </div>
                <span className="ml-auto grid h-6 w-6 place-items-center rounded-full bg-[#dff2e9] text-[#087a5b]">
                  <Icon name="shield" className="h-3.5 w-3.5" />
                </span>
              </div>
              <form onSubmit={continueToReview} className="mt-7">
                <label
                  htmlFor="amount"
                  className="text-xs font-bold text-[#39574f]"
                >
                  Amount to send
                </label>
                <div className="mt-2 flex h-14 items-center rounded-2xl border border-[#ccd8d3] bg-[#fbfcfb] px-3 transition focus-within:border-[#087a5b] focus-within:bg-white focus-within:ring-3 focus-within:ring-[#087a5b]/15 min-[380px]:px-5">
                  <span className="text-xl font-bold text-[#788984]">₦</span>
                  <input
                    id="amount"
                    autoFocus
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                    className="amount-input min-w-0 flex-1 border-0 bg-transparent px-2 text-2xl font-bold tracking-tight text-[#18352e] outline-none shadow-none placeholder:text-[#b4bfbb] min-[380px]:px-3 min-[380px]:text-3xl"
                  />
                </div>
                <p className="mt-2 text-xs text-[#7c8c87]">
                  Available:{" "}
                  <span className="font-bold text-[#46625a]">
                    {formatMoney(account?.balance ?? 0, account?.currency)}
                  </span>
                </p>
                <label
                  htmlFor="description"
                  className="mt-6 block text-xs font-bold text-[#39574f]"
                >
                  Narration{" "}
                  <span className="font-normal text-[#8b9995]">(optional)</span>
                </label>
                <input
                  id="description"
                  maxLength={200}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What is this payment for?"
                  className="mt-2 h-13 w-full rounded-xl border border-[#ccd8d3] bg-[#fbfcfb] px-4 text-sm outline-none focus:border-[#087a5b] focus:bg-white"
                />
                {error && (
                  <div className="mt-4">
                    <ErrorState message={error} />
                  </div>
                )}
                <button className="mt-6 h-12 w-full rounded-xl bg-[#087a5b] text-sm font-bold text-white transition hover:bg-[#06694f]">
                  Review transfer
                </button>
              </form>
            </div>
          )}

          {step === "review" && recipient && (
            <div>
              <button
                onClick={() => setStep("amount")}
                className="mb-5 text-xs font-bold text-[#087a5b]"
              >
                ← Edit details
              </button>
              <div className="text-center">
                <p className="text-xs font-semibold text-[#7b8b87]">
                  You are sending
                </p>
                <p className="mt-2 break-words text-3xl font-bold tracking-[-0.045em] text-[#18352e] min-[380px]:text-4xl">
                  {formatMoney(amount, account?.currency)}
                </p>
                <p className="mt-2 text-xs text-[#7b8b87]">
                  to {recipient.firstName} {recipient.lastName}
                </p>
              </div>
              <dl className="mt-8 divide-y divide-[#e7ecea] rounded-2xl border border-[#e0e7e4] px-3 min-[380px]:px-5">
                <ReviewRow
                  label="Recipient"
                  value={recipient.firstName + " " + recipient.lastName}
                />
                <ReviewRow label="Account" value={recipient.accountNumber} />
                <ReviewRow label="Bank" value="Nuel Bank" />
                <ReviewRow
                  label="Narration"
                  value={description || "Money transfer"}
                />
                <ReviewRow
                  label="Fee"
                  value={formatMoney(0, account?.currency)}
                />
              </dl>
              {error && (
                <div className="mt-4">
                  <ErrorState message={error} />
                </div>
              )}
              <div className="mt-5 flex items-start gap-2 rounded-xl bg-[#f0f7f4] p-3 text-[11px] leading-5 text-[#5f746e]">
                <Icon
                  name="shield"
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#087a5b]"
                />
                Your transfer is protected by real-time fraud monitoring.
              </div>
              <button
                disabled={loading}
                onClick={() => void submitTransfer()}
                className="mt-5 h-12 w-full rounded-xl bg-[#087a5b] text-sm font-bold text-white transition hover:bg-[#06694f] disabled:opacity-60"
              >
                {loading
                  ? "Sending securely…"
                  : "Send " + formatMoney(amount, account?.currency)}
              </button>
            </div>
          )}

          {step === "result" && result && (
            <div className="py-4 text-center">
              <span
                className={
                  "mx-auto grid h-16 w-16 place-items-center rounded-full " +
                  (result.status === "COMPLETED"
                    ? "bg-[#dcf5e9] text-[#087a5b]"
                    : result.status === "HELD"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-blue-700")
                }
              >
                <Icon
                  name={result.status === "COMPLETED" ? "shield" : "clock"}
                  className="h-7 w-7"
                />
              </span>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-[#81908c]">
                {result.status === "COMPLETED"
                  ? "Transfer successful"
                  : result.status === "HELD"
                    ? "Under security review"
                    : "One more step"}
              </p>
              <h2 className="mt-2 break-words text-3xl font-bold tracking-[-0.045em] text-[#18352e] min-[380px]:text-4xl">
                {formatMoney(result.amount, account?.currency)}
              </h2>
              <p className="mt-2 text-sm text-[#6f807b]">
                {result.status === "COMPLETED"
                  ? "Sent to " +
                    recipient?.firstName +
                    " " +
                    recipient?.lastName
                  : result.status === "HELD"
                    ? "We’ll notify you when the review is complete."
                    : "Enter the one-time code sent to your registered email."}
              </p>
              <dl className="mx-auto mt-7 max-w-sm rounded-2xl bg-[#f4f7f5] p-4 text-left">
                <ReviewRow
                  label="Reference"
                  value={result.reference.slice(0, 14).toUpperCase()}
                />
                <ReviewRow label="Status" value={result.status} />
              </dl>
              {error && (
                <div className="mt-4 text-left">
                  <ErrorState message={error} />
                </div>
              )}
              {result.status === "PENDING" && (
                <form
                  onSubmit={verifyTransfer}
                  className="mx-auto mt-6 max-w-sm text-left"
                >
                  <label
                    htmlFor="verificationCode"
                    className="text-xs font-bold text-[#39574f]"
                  >
                    6-digit verification code
                  </label>
                  <input
                    id="verificationCode"
                    autoFocus
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(event) =>
                      setVerificationCode(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="000000"
                    className="mt-2 h-14 w-full rounded-xl border border-[#ccd8d3] bg-[#fbfcfb] px-4 text-center font-mono text-2xl font-bold tracking-[0.35em] text-[#18352e] outline-none transition placeholder:text-[#b4bfbb] focus:border-[#087a5b] focus:bg-white focus:ring-3 focus:ring-[#087a5b]/15"
                  />
                  {verificationNotice && (
                    <p
                      className="mt-2 text-center text-xs font-semibold text-[#087a5b]"
                      role="status"
                    >
                      {verificationNotice}
                    </p>
                  )}
                  <button
                    disabled={loading || verificationCode.length !== 6}
                    className="mt-4 h-12 w-full rounded-xl bg-[#087a5b] text-sm font-bold text-white disabled:opacity-60"
                  >
                    {loading ? "Confirming…" : "Verify and send"}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void resendVerificationCode()}
                    className="mt-3 h-10 w-full text-xs font-bold text-[#087a5b] disabled:text-[#94a39f]"
                  >
                    Didn’t receive it? Send another code
                  </button>
                  <p className="mt-2 text-center text-[11px] leading-5 text-[#82918d]">
                    The code expires in 10 minutes. Never share it with anyone.
                  </p>
                </form>
              )}
              {result.status !== "PENDING" && (
                <button
                  onClick={startAgain}
                  className="mt-6 h-12 w-full max-w-sm rounded-xl bg-[#087a5b] text-sm font-bold text-white"
                >
                  Make another transfer
                </button>
              )}
              <Link
                href="/transactions"
                className="mt-4 block text-xs font-bold text-[#087a5b]"
              >
                View transaction history
              </Link>
            </div>
          )}
        </section>

        <aside className="h-fit space-y-4">
          <div className="rounded-[22px] bg-[#102f27] p-5 text-white">
            <Icon name="shield" className="h-6 w-6 text-[#d8f85c]" />
            <h3 className="mt-4 text-sm font-bold">Transfer with confidence</h3>
            <p className="mt-2 text-xs leading-5 text-[#a9c1ba]">
              Always confirm the recipient’s name before sending. Nuel will
              never ask for your password, PIN, or OTP in chat.
            </p>
          </div>
          {account && (
            <div className="rounded-[22px] border border-[#dce5e1] bg-white p-5">
              <p className="text-xs text-[#7b8b87]">Sending from</p>
              <p className="mt-2 text-sm font-bold text-[#28483f]">
                {account.type[0]}
                {account.type.slice(1).toLowerCase()} account
              </p>
              <p className="mt-1 text-xs tracking-wide text-[#83918d]">
                •••• {account.accountNumber.slice(-4)}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3.5 text-xs min-[380px]:grid-cols-[auto_minmax(0,1fr)] min-[380px]:items-center min-[380px]:gap-5">
      <dt className="text-[#7d8c88]">{label}</dt>
      <dd className="break-words font-bold text-[#314f47] min-[380px]:text-right">{value}</dd>
    </div>
  );
}
